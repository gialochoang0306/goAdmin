import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { api } from "../lib/api";
import { useAction, useFilters } from "../lib/hooks";
import { date, label, money, rideLabels, text } from "../lib/format";
import {
  DataTable,
  Heading,
  InvalidRecord,
  Loading,
  Panel,
  Photo,
  QueryError,
  Refresh,
  Status,
} from "../components/common";
import { RideTable } from "../components/RideTable";
import type { Customer, CustomerDetail, WalletTransaction } from "../types";

const statusOptions = ["ACTIVE", "INACTIVE", "BANNED"].map((value) => ({
  value,
  label: label(value),
}));
export function Customers() {
  const f = useFilters();
  const location = useLocation();
  const params = {
    ...f.params,
    q: f.read("q"),
    status: f.read("status"),
    flagged: f.read("flagged"),
    sort: f.read("sort", "createdAt"),
  };
  const query = useQuery({
    queryKey: ["admin", "customers", params],
    queryFn: () => api.customers(params),
  });
  const columns: ColumnsType<Customer> = [
    {
      title: "Khách hàng",
      width: 220,
      render: (_, r) => (
        <>
          <Link
            to={`/customers/${r.id}`}
            state={{ from: location.pathname + location.search }}
          >
            {r.fullName || `Khách #${r.id}`}
          </Link>
          <div className="muted">
            #{r.id} · {text(r.phoneNumber)}
          </div>
        </>
      ),
    },
    { title: "Email", dataIndex: "email", render: text },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (v) => <Status value={v} />,
    },
    {
      title: "Đánh dấu",
      dataIndex: "isFlagged",
      render: (v) => (v ? <Tag color="gold">Có đánh dấu</Tag> : "Không"),
    },
    { title: "Tổng chuyến", dataIndex: "totalTrips" },
    { title: "Tỷ lệ hủy 30 ngày", dataIndex: "cancelRate30d", render: text },
    { title: "Số dư ví", dataIndex: "walletBalance", render: money },
    { title: "Ngày tạo", dataIndex: "createdAt", render: date },
  ];
  return (
    <>
      <Heading
        title="Quản lý khách hàng"
        subtitle="Tra cứu tài khoản, lịch sử chuyến và giao dịch ví."
        actions={
          <Refresh
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          />
        }
      />
      <div className="filters">
        <Input.Search
          key={f.read("q")}
          aria-label="Tìm khách hàng"
          defaultValue={f.read("q")}
          placeholder="Tên, số điện thoại hoặc email"
          enterButton="Tìm"
          onSearch={(q) => f.update({ q: q.trim() })}
        />
        <Select
          aria-label="Trạng thái khách hàng"
          placeholder="Tất cả trạng thái"
          allowClear
          options={statusOptions}
          value={f.read("status") || undefined}
          onChange={(status) => f.update({ status })}
        />
        <Select
          aria-label="Đánh dấu khách hàng"
          placeholder="Đánh dấu"
          allowClear
          options={[
            { value: "true", label: "Có đánh dấu" },
            { value: "false", label: "Không đánh dấu" },
          ]}
          value={f.read("flagged") || undefined}
          onChange={(flagged) => f.update({ flagged })}
        />
        <Select
          aria-label="Sắp xếp khách hàng"
          value={f.read("sort", "createdAt")}
          options={[
            { value: "createdAt", label: "Ngày tạo mới nhất" },
            { value: "totalTrips", label: "Tổng chuyến cao nhất" },
            { value: "cancelRate30d", label: "Tỷ lệ hủy cao nhất" },
          ]}
          onChange={(sort) => f.update({ sort })}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable
          data={query.data}
          columns={columns}
          loading={query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
          scroll={1250}
        />
      </Panel>
    </>
  );
}

function CustomerStatus({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ status: string; reason?: string }>();
  const status = Form.useWatch("status", form);
  const mutation = useAction(
    (v: { status: string; reason?: string }) =>
      api.customerStatus(customer.id, v.status, v.reason?.trim()),
    onClose,
  );
  return (
    <Modal
      open
      title="Đổi trạng thái khách hàng"
      onCancel={() => {
        if (!mutation.isPending) onClose();
      }}
      onOk={() => form.submit()}
      okText="Xác nhận thay đổi"
      cancelText="Đóng"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
    >
      <QueryError error={mutation.error} retry={() => mutation.reset()} />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: customer.status }}
        onFinish={(v) => {
          if (!mutation.isPending) mutation.mutate(v);
        }}
      >
        <Form.Item
          label="Trạng thái tài khoản"
          name="status"
          rules={[{ required: true }]}
        >
          <Select options={statusOptions} />
        </Form.Item>
        {status === "BANNED" && (
          <Alert
            className="toolbar-note"
            showIcon
            type="warning"
            title="Các chuyến chờ xử lý hoặc đang tìm tài xế của khách sẽ bị hủy. Phiên đăng nhập của khách cũng bị thu hồi."
          />
        )}
        <Form.Item
          label="Lý do"
          name="reason"
          rules={[
            {
              required: status !== "ACTIVE",
              whitespace: true,
              message: "Nhập lý do tạm ngưng hoặc khóa tài khoản.",
            },
            { max: 1000 },
          ]}
        >
          <Input.TextArea maxLength={1000} rows={3} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
function CustomerFlag({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ flagged: boolean; note?: string }>();
  const mutation = useAction(
    (v: { flagged: boolean; note?: string }) =>
      api.customerFlag(customer.id, v.flagged, v.note?.trim()),
    onClose,
  );
  return (
    <Modal
      open
      title="Đánh dấu khách hàng"
      onCancel={() => {
        if (!mutation.isPending) onClose();
      }}
      onOk={() => form.submit()}
      okText="Lưu đánh dấu"
      cancelText="Đóng"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
    >
      <QueryError error={mutation.error} retry={() => mutation.reset()} />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ flagged: !customer.isFlagged }}
        onFinish={(v) => {
          if (!mutation.isPending) mutation.mutate(v);
        }}
      >
        <Form.Item name="flagged" label="Đánh dấu" rules={[{ required: true }]}>
          <Select
            options={[
              { value: true, label: "Có đánh dấu" },
              { value: false, label: "Không đánh dấu" },
            ]}
          />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú (nếu có)" rules={[{ max: 1000 }]}>
          <Input.TextArea maxLength={1000} rows={3} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function CustomerRides({ id }: { id: number }) {
  const f = useFilters();
  const from = f.read("from");
  const to = f.read("to");
  const status = f.read("rideStatus");
  const validDates = !from || !to || from <= to;
  const query = useQuery({
    queryKey: ["admin", "customer-rides", id, f.page, f.size, status, from, to],
    queryFn: () => api.customerRides(id, { ...f.params, status, from, to }),
    enabled: validDates,
  });
  return (
    <>
      <div className="filters">
        <Select
          aria-label="Trạng thái chuyến của khách"
          placeholder="Tất cả trạng thái"
          allowClear
          value={status || undefined}
          options={Object.entries(rideLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={(rideStatus) => f.update({ rideStatus })}
        />
        <label>
          Từ ngày{" "}
          <Input
            type="date"
            aria-label="Từ ngày"
            value={from}
            onChange={(e) => f.update({ from: e.target.value })}
          />
        </label>
        <label>
          Đến ngày{" "}
          <Input
            type="date"
            aria-label="Đến ngày"
            min={from || undefined}
            value={to}
            onChange={(e) => f.update({ to: e.target.value })}
          />
        </label>
        <Refresh
          loading={query.isFetching}
          onClick={() => {
            if (validDates) void query.refetch();
          }}
        />
      </div>
      {!validDates && (
        <Alert
          className="toolbar-note"
          type="error"
          title="Đến ngày phải cùng ngày hoặc sau Từ ngày."
        />
      )}
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <RideTable
          data={validDates ? query.data : undefined}
          loading={validDates && query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
        />
      </Panel>
    </>
  );
}
function CustomerWallet({ id }: { id: number }) {
  const f = useFilters();
  const query = useQuery({
    queryKey: ["admin", "transactions", id, f.page, f.size],
    queryFn: () => api.transactions(id, f.params),
  });
  const columns: ColumnsType<WalletTransaction> = [
    { title: "Mã", dataIndex: "id", render: (v) => `#${v}` },
    {
      title: "Chuyến",
      dataIndex: "rideId",
      render: (v) => (v ? <Link to={`/rides/${v}`}>#{v}</Link> : "—"),
    },
    { title: "Số tiền", dataIndex: "amount", render: money },
    { title: "Loại", dataIndex: "type", render: label },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (v) => <Status value={v} />,
    },
    { title: "Loại ví", dataIndex: "walletType", render: label },
    { title: "Số dư sau", dataIndex: "balanceAfter", render: money },
    { title: "Mô tả", dataIndex: "description", render: text },
    { title: "Thời gian", dataIndex: "createdAt", render: date },
  ];
  return (
    <>
      <div className="filters">
        <Refresh
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable
          data={query.data}
          columns={columns}
          loading={query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
          scroll={1150}
        />
      </Panel>
    </>
  );
}
function CustomerOverview({ customer }: { customer: CustomerDetail }) {
  return (
    <>
      <div className="detail-grid">
        <Panel title="Thông tin khách hàng">
          <Descriptions
            column={1}
            items={[
              {
                key: "name",
                label: "Họ tên",
                children: text(customer.fullName),
              },
              {
                key: "phone",
                label: "Số điện thoại",
                children: text(customer.phoneNumber),
              },
              { key: "email", label: "Email", children: text(customer.email) },
              {
                key: "dob",
                label: "Ngày sinh",
                children: date(customer.dateOfBirth),
              },
              {
                key: "gender",
                label: "Giới tính",
                children: text(customer.gender),
              },
              {
                key: "payment",
                label: "Thanh toán mặc định",
                children: label(customer.defaultPaymentMethod),
              },
              {
                key: "created",
                label: "Ngày tạo",
                children: date(customer.createdAt),
              },
              {
                key: "lastLogin",
                label: "Đăng nhập gần nhất",
                children: date(customer.lastLoginAt),
              },
            ]}
          />
        </Panel>
        <Panel title="Chỉ số và ví">
          <Descriptions
            column={1}
            items={[
              {
                key: "trips",
                label: "Tổng chuyến",
                children: customer.totalTrips,
              },
              {
                key: "cancelled",
                label: "Tổng chuyến hủy",
                children: customer.totalCancelled,
              },
              {
                key: "rate",
                label: "Tỷ lệ hủy 30 ngày",
                children: text(customer.cancelRate30d),
              },
              {
                key: "rating",
                label: "Đánh giá trung bình",
                children: text(customer.averageRating),
              },
              {
                key: "wallet",
                label: "Số dư ví",
                children: money(customer.walletBalance),
              },
              {
                key: "flag",
                label: "Đánh dấu",
                children: customer.isFlagged ? "Có đánh dấu" : "Không",
              },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Xe của khách hàng">
        {customer.vehicles.length ? (
          customer.vehicles.map((vehicle) => (
            <div className="document-card" key={vehicle.id}>
              <div className="document-info">
                <strong>
                  {text(vehicle.plateNumber)} · {label(vehicle.vehicleType)}
                </strong>
                <p>
                  {text(vehicle.brand)} {text(vehicle.model)} ·{" "}
                  {label(vehicle.transmissionType)} · {text(vehicle.color)}
                </p>
              </div>
              <div className="photo-grid">
                {vehicle.images.map((image) => (
                  <Photo
                    key={image.id}
                    url={image.secureUrl}
                    alt={`Xe ${text(vehicle.plateNumber)}`}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <Typography.Text type="secondary">Chưa có xe.</Typography.Text>
        )}
      </Panel>
      <Panel title="5 chuyến gần nhất">
        <RideTable
          data={{
            content: customer.recentRides,
            page: 0,
            size: 5,
            totalElements: customer.recentRides.length,
            totalPages: 1,
            hasNext: false,
          }}
        />
      </Panel>
    </>
  );
}

export function CustomerDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const f = useFilters();
  const [status, setStatus] = useState(false);
  const [flag, setFlag] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => api.customer(id),
    enabled: valid,
  });
  if (!valid) return <InvalidRecord />;
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const customer = query.data;
  return (
    <>
      <Link className="back-link" to={location.state?.from || "/customers"}>
        <ArrowLeftOutlined /> Quay lại danh sách
      </Link>
      <Heading
        title={customer.fullName || `Khách hàng #${id}`}
        subtitle={`Mã khách hàng #${id}`}
        actions={
          <Space wrap>
            <Status value={customer.status} />
            <Refresh
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            />
            <Button onClick={() => setFlag(true)}>
              {customer.isFlagged ? "Bỏ đánh dấu" : "Đánh dấu"}
            </Button>
            <Button type="primary" onClick={() => setStatus(true)}>
              Đổi trạng thái
            </Button>
          </Space>
        }
      />
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Tabs
        destroyOnHidden
        activeKey={
          ["profile", "rides", "wallet"].includes(f.read("tab", "profile"))
            ? f.read("tab", "profile")
            : "profile"
        }
        onChange={(tab) => f.update({ tab })}
        items={[
          {
            key: "profile",
            label: "Hồ sơ",
            children: <CustomerOverview customer={customer} />,
          },
          {
            key: "rides",
            label: "Chuyến đi",
            children: <CustomerRides id={id} />,
          },
          {
            key: "wallet",
            label: "Giao dịch ví",
            children: <CustomerWallet id={id} />,
          },
        ]}
      />
      {status && (
        <CustomerStatus customer={customer} onClose={() => setStatus(false)} />
      )}
      {flag && (
        <CustomerFlag customer={customer} onClose={() => setFlag(false)} />
      )}
    </>
  );
}
