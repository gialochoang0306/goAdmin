import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import { api, ApiError, errorMessage } from "../lib/api";
import { date, label, money, pricingError } from "../lib/format";
import { useAction, useFilters } from "../lib/hooks";
import {
  DataTable,
  Heading,
  Panel,
  QueryError,
  Refresh,
  Status,
} from "../components/common";
import type { Pricing, PricingInput } from "../types";

function PricingForm({
  rule,
  onClose,
}: {
  rule?: Pricing;
  onClose: () => void;
}) {
  const [form] = Form.useForm<PricingInput>();
  const [validation, setValidation] = useState<string | null>(null);
  const mutation = useAction(
    (values: PricingInput) => api.savePricing(values, rule?.id),
    onClose,
  );
  const amountFields = [
    { name: "baseFare", title: "Giá cơ bản" },
    { name: "perKm", title: "Giá mỗi km" },
    { name: "perMinuteWaiting", title: "Giá mỗi phút chờ" },
    { name: "minFare", title: "Giá tối thiểu" },
    { name: "returnFeeForDriver", title: "Phí quay về cho tài xế" },
  ] as const;
  return (
    <Modal
      open
      title={rule ? `Sửa bảng giá #${rule.id}` : "Tạo bảng giá"}
      width={650}
      onCancel={() => {
        if (!mutation.isPending) onClose();
      }}
      onOk={() => form.submit()}
      okText={rule ? "Lưu thay đổi" : "Tạo bảng giá"}
      cancelText="Đóng"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
    >
      <QueryError error={mutation.error} retry={() => mutation.reset()} />
      {validation && (
        <Alert
          className="toolbar-note"
          showIcon
          type="error"
          title={validation}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={
          rule
            ? {
                ...rule,
                nightStart: rule.nightStart?.slice(0, 5) ?? "",
                nightEnd: rule.nightEnd?.slice(0, 5) ?? "",
              }
            : {
                vehicleType: "CAR",
                active: false,
                nightSurchargePercent: 0,
                returnFeeForDriver: 0,
              }
        }
        onValuesChange={() => setValidation(null)}
        onFinish={(values) => {
          const payload = {
            ...values,
            nightStart: values.nightStart || null,
            nightEnd: values.nightEnd || null,
            active: values.active ?? false,
          };
          const error = pricingError(payload);
          if (error) {
            setValidation(error);
            return;
          }
          if (!mutation.isPending) mutation.mutate(payload);
        }}
      >
        <Form.Item
          label="Loại xe"
          name="vehicleType"
          rules={[{ required: true }]}
        >
          <Select
            disabled={!!rule}
            options={["CAR", "MOTORCYCLE"].map((value) => ({
              value,
              label: label(value),
            }))}
          />
        </Form.Item>
        <div className="form-grid">
          {amountFields.map((field) => (
            <Form.Item
              key={field.name}
              label={`${field.title} (VND)`}
              name={field.name}
              rules={[
                {
                  required: true,
                  message: `Nhập ${field.title.toLowerCase()}.`,
                },
                {
                  type: "integer",
                  min: 0,
                  max: Number.MAX_SAFE_INTEGER,
                  message: "Nhập số nguyên không âm hợp lệ.",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                precision={0}
                step={1000}
                controls={false}
              />
            </Form.Item>
          ))}
          <Form.Item
            label="Phụ thu đêm (%)"
            name="nightSurchargePercent"
            rules={[
              { required: true },
              {
                type: "integer",
                min: 0,
                max: 100,
                message: "Phụ thu từ 0 đến 100%.",
              },
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              precision={0}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="Bắt đầu phụ thu đêm" name="nightStart">
            <Input type="time" step={60} />
          </Form.Item>
          <Form.Item label="Kết thúc phụ thu đêm" name="nightEnd">
            <Input type="time" step={60} />
          </Form.Item>
        </div>
        {!rule && (
          <Form.Item name="active" valuePropName="checked">
            <Checkbox>
              Kích hoạt ngay, thay thế bảng giá hiện tại cùng loại xe
            </Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export default function PricingPage() {
  const f = useFilters();
  const { modal, message } = App.useApp();
  const [editing, setEditing] = useState<Pricing | "new">();
  const [force, setForce] = useState<Pricing>();
  const query = useQuery({
    queryKey: ["admin", "pricing"],
    queryFn: api.pricing,
  });
  const activate = useAction((id: number) => api.activate(id));
  const deactivate = useMutation({
    mutationFn: (v: { id: number; force: boolean }) =>
      api.deactivate(v.id, v.force),
    onSuccess: async () => {
      await query.refetch();
      void message.success("Đã tắt bảng giá.");
      setForce(undefined);
    },
    retry: false,
  });
  const busy = activate.isPending || deactivate.isPending;
  const requestDeactivate = (rule: Pricing) =>
    modal.confirm({
      title: `Tắt bảng giá #${rule.id}?`,
      content: `Bảng giá ${label(rule.vehicleType)} sẽ ngừng áp dụng.`,
      okText: "Tắt bảng giá",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          await deactivate.mutateAsync({ id: rule.id, force: false });
        } catch (error) {
          if (error instanceof ApiError && error.status === 409) setForce(rule);
          else {
            void message.error(errorMessage(error));
            throw error;
          }
        }
      },
    });
  const vehicleType = f.read("vehicleType");
  const active = f.read("active");
  const rows =
    query.data?.filter(
      (rule) =>
        (!vehicleType || rule.vehicleType === vehicleType) &&
        (!active || String(rule.active) === active),
    ) ?? [];
  const columns: ColumnsType<Pricing> = [
    {
      title: "Bảng giá",
      width: 130,
      render: (_, rule) => (
        <>
          <strong>#{rule.id}</strong>
          <div className="muted">{label(rule.vehicleType)}</div>
        </>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "active",
      render: (value) => <Status value={value ? "ACTIVE" : "INACTIVE"} />,
    },
    { title: "Giá cơ bản", dataIndex: "baseFare", render: money },
    { title: "Mỗi km", dataIndex: "perKm", render: money },
    { title: "Phút chờ", dataIndex: "perMinuteWaiting", render: money },
    { title: "Tối thiểu", dataIndex: "minFare", render: money },
    { title: "Phí quay về", dataIndex: "returnFeeForDriver", render: money },
    {
      title: "Phụ thu đêm",
      render: (_, rule) => (
        <>
          {rule.nightSurchargePercent}%
          <div className="muted">
            {rule.nightStart && rule.nightEnd
              ? `${rule.nightStart.slice(0, 5)} – ${rule.nightEnd.slice(0, 5)}`
              : "Không có khung giờ"}
          </div>
        </>
      ),
    },
    { title: "Cập nhật", dataIndex: "updatedAt", render: date },
    {
      title: "Thao tác",
      width: 190,
      render: (_, rule) => (
        <Space>
          <Button size="small" disabled={busy} onClick={() => setEditing(rule)}>
            Sửa
          </Button>
          {rule.active ? (
            <Button
              size="small"
              disabled={busy}
              onClick={() => requestDeactivate(rule)}
            >
              Tắt
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              disabled={busy}
              onClick={() =>
                modal.confirm({
                  title: `Kích hoạt bảng giá #${rule.id}?`,
                  content: `Bảng giá đang hoạt động cho ${label(rule.vehicleType)} sẽ tự động bị tắt.`,
                  okText: "Kích hoạt",
                  cancelText: "Đóng",
                  onOk: () => activate.mutateAsync(rule.id),
                })
              }
            >
              Kích hoạt
            </Button>
          )}
        </Space>
      ),
    },
  ];
  return (
    <>
      <Heading
        title="Quản lý bảng giá"
        subtitle="Mỗi loại xe có tối đa một bảng giá đang hoạt động."
        actions={
          <>
            <Refresh
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              aria-label="Tạo bảng giá"
              onClick={() => setEditing("new")}
            >
              Tạo bảng giá
            </Button>
          </>
        }
      />
      <div className="filters">
        <Select
          aria-label="Loại xe bảng giá"
          placeholder="Tất cả loại xe"
          allowClear
          value={vehicleType || undefined}
          onChange={(vehicleType) => f.update({ vehicleType })}
          options={["CAR", "MOTORCYCLE"].map((value) => ({
            value,
            label: label(value),
          }))}
        />
        <Select
          aria-label="Trạng thái bảng giá"
          placeholder="Tất cả trạng thái"
          allowClear
          value={active || undefined}
          onChange={(active) => f.update({ active })}
          options={[
            { value: "true", label: "Đang hoạt động" },
            { value: "false", label: "Không hoạt động" },
          ]}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable
          columns={columns}
          data={{
            content: rows,
            page: 0,
            size: rows.length,
            totalElements: rows.length,
            totalPages: 1,
            hasNext: false,
          }}
          loading={query.isPending}
          scroll={1450}
        />
      </Panel>
      {editing && (
        <PricingForm
          rule={editing === "new" ? undefined : editing}
          onClose={() => setEditing(undefined)}
        />
      )}
      <Modal
        open={!!force}
        title="Tắt bảng giá hoạt động cuối cùng?"
        okText="Xác nhận tắt cưỡng chế"
        cancelText="Giữ bảng giá"
        okButtonProps={{ danger: true }}
        confirmLoading={deactivate.isPending}
        cancelButtonProps={{ disabled: deactivate.isPending }}
        onCancel={() => {
          if (!deactivate.isPending) {
            setForce(undefined);
            deactivate.reset();
          }
        }}
        onOk={() => {
          if (force && !deactivate.isPending)
            deactivate.mutate({ id: force.id, force: true });
        }}
      >
        <Alert
          type="warning"
          showIcon
          title={`Loại xe ${label(force?.vehicleType)} có thể không còn bảng giá để tạo chuyến mới. Chỉ tiếp tục nếu bạn chấp nhận việc ngừng áp dụng giá.`}
        />
        <QueryError error={deactivate.error} retry={() => deactivate.reset()} />
      </Modal>
    </>
  );
}
