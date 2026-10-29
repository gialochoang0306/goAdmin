import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "../lib/api";
import { date, label, money, text } from "../lib/format";
import { useAction, useFilters } from "../lib/hooks";
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
import type { Driver, DriverDocument, DocumentQueue, Skill } from "../types";

const verificationOptions = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
].map((value) => ({ value, label: label(value) }));
const booleanOptions = [
  { value: "true", label: "Có" },
  { value: "false", label: "Không" },
];
export function Drivers() {
  const f = useFilters();
  const location = useLocation();
  const params = {
    ...f.params,
    search: f.read("search"),
    verification_status: f.read("verification_status"),
    online: f.read("online"),
    flagged: f.read("flagged"),
  };
  const query = useQuery({
    queryKey: ["admin", "drivers", params],
    queryFn: () => api.drivers(params),
  });
  const columns: ColumnsType<Driver> = [
    {
      title: "Tài xế",
      dataIndex: "fullName",
      width: 210,
      render: (value, r) => (
        <>
          <Link
            to={`/drivers/${r.id}`}
            state={{ from: location.pathname + location.search }}
          >
            {value || `Tài xế #${r.id}`}
          </Link>
          <div className="muted">
            #{r.id} · {r.phoneNumber}
          </div>
        </>
      ),
    },
    {
      title: "Xác minh",
      dataIndex: "verificationStatus",
      render: (v) => <Status value={v} />,
    },
    {
      title: "Hoạt động",
      dataIndex: "status",
      render: (v) => <Status value={v} />,
    },
    {
      title: "Đánh dấu",
      dataIndex: "flagged",
      render: (v) => (v ? <Tag color="gold">Có đánh dấu</Tag> : "Không"),
    },
    { title: "Tổng chuyến", dataIndex: "totalTrips" },
    { title: "Đánh giá", dataIndex: "averageRating", render: text },
    { title: "Số dư thu nhập", dataIndex: "incomeBalance", render: money },
    { title: "Ngày tạo", dataIndex: "createdAt", render: date },
  ];
  return (
    <>
      <Heading
        title="Quản lý tài xế"
        subtitle="Tra cứu hồ sơ, tình trạng xác minh và hoạt động."
        actions={
          <Refresh
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          />
        }
      />
      <div className="filters">
        <Input.Search
          key={f.read("search")}
          defaultValue={f.read("search")}
          aria-label="Tìm tài xế"
          placeholder="Tên hoặc số điện thoại"
          enterButton="Tìm"
          onSearch={(search) => f.update({ search: search.trim() })}
        />
        <Select
          allowClear
          aria-label="Xác minh tài xế"
          placeholder="Tất cả xác minh"
          value={f.read("verification_status") || undefined}
          options={verificationOptions}
          onChange={(v) => f.update({ verification_status: v })}
        />
        <Select
          allowClear
          aria-label="Kết nối tài xế"
          placeholder="Tất cả kết nối"
          value={f.read("online") || undefined}
          options={[
            { value: "true", label: "Đang kết nối (kể cả bận)" },
            { value: "false", label: "Ngoại tuyến" },
          ]}
          onChange={(v) => f.update({ online: v })}
        />
        <Select
          allowClear
          aria-label="Đánh dấu tài xế"
          placeholder="Đánh dấu"
          value={f.read("flagged") || undefined}
          options={booleanOptions}
          onChange={(v) => f.update({ flagged: v })}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable
          columns={columns}
          data={query.data}
          loading={query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
          scroll={1150}
        />
      </Panel>
    </>
  );
}

export function DocumentReview({
  document,
  onClose,
}: {
  document: DriverDocument;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ status: string; rejectionReason?: string }>();
  const status = Form.useWatch("status", form);
  const mutation = useAction(
    (values: { status: string; rejectionReason?: string }) =>
      api.review(
        document.id,
        values.status,
        values.status === "REJECTED"
          ? values.rejectionReason?.trim()
          : undefined,
      ),
    onClose,
  );
  return (
    <Modal
      open
      title={`Duyệt ${label(document.documentType)} · #${document.id}`}
      onCancel={() => {
        if (!mutation.isPending) onClose();
      }}
      okText="Lưu kết quả"
      cancelText="Đóng"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onOk={() => form.submit()}
    >
      <div className="document-card">
        <Photo url={document.secureUrl} alt={label(document.documentType)} />
        <div>
          <p>{text(document.documentNumber)}</p>
          <p className="muted">Hết hạn: {date(document.expiresAt)}</p>
          <Status value={document.verificationStatus} />
        </div>
      </div>
      <QueryError error={mutation.error} retry={() => mutation.reset()} />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: "APPROVED" }}
        onFinish={(values) => {
          if (!mutation.isPending) mutation.mutate(values);
        }}
      >
        <Form.Item
          label="Kết quả duyệt"
          name="status"
          rules={[{ required: true }]}
        >
          <Select
            options={["APPROVED", "REJECTED"].map((value) => ({
              value,
              label: label(value),
            }))}
          />
        </Form.Item>
        <Form.Item
          label="Lý do từ chối"
          name="rejectionReason"
          rules={[
            {
              required: status === "REJECTED",
              whitespace: true,
              message: "Nhập lý do từ chối giấy tờ.",
            },
            { max: 1000 },
          ]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function Documents() {
  const f = useFilters();
  const [document, setDocument] = useState<DriverDocument>();
  const status = f.read("status", "PENDING");
  const query = useQuery({
    queryKey: ["admin", "documents", status, f.page, f.size],
    queryFn: () => api.documents({ ...f.params, status }),
  });
  const columns: ColumnsType<DocumentQueue & { id: number }> = [
    {
      title: "Tài xế",
      width: 200,
      render: (_, row) => (
        <>
          <Link to={`/drivers/${row.document.driverId}`}>
            {row.driverName || `Tài xế #${row.document.driverId}`}
          </Link>
          <div className="muted">{row.driverPhone}</div>
        </>
      ),
    },
    {
      title: "Giấy tờ",
      render: (_, row) => (
        <>
          {label(row.document.documentType)}
          <div className="muted">{text(row.document.documentNumber)}</div>
        </>
      ),
    },
    {
      title: "Ảnh",
      render: (_, row) => (
        <Photo
          url={row.document.secureUrl}
          alt={label(row.document.documentType)}
        />
      ),
    },
    {
      title: "Trạng thái",
      render: (_, row) => <Status value={row.document.verificationStatus} />,
    },
    { title: "Ngày gửi", render: (_, row) => date(row.document.createdAt) },
    { title: "Hết hạn", render: (_, row) => date(row.document.expiresAt) },
    {
      title: "Thao tác",
      render: (_, row) => (
        <Button size="small" onClick={() => setDocument(row.document)}>
          Xem và duyệt
        </Button>
      ),
    },
  ];
  return (
    <>
      <Heading
        title="Duyệt hồ sơ tài xế"
        subtitle="Kiểm tra từng giấy tờ trước khi duyệt tài khoản tài xế."
        actions={
          <Refresh
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          />
        }
      />
      <div className="filters">
        <Select
          aria-label="Trạng thái giấy tờ"
          value={status}
          options={["PENDING", "APPROVED", "REJECTED"].map((value) => ({
            value,
            label: label(value),
          }))}
          onChange={(status) => f.update({ status })}
        />
      </div>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable
          data={
            query.data
              ? {
                  ...query.data,
                  content: query.data.content.map((row) => ({
                    ...row,
                    id: row.document.id,
                  })),
                }
              : undefined
          }
          columns={columns}
          loading={query.isPending}
          onPage={(page, size) => f.update({ page, size }, false)}
          scroll={1050}
        />
      </Panel>
      {document && (
        <DocumentReview
          document={document}
          onClose={() => setDocument(undefined)}
        />
      )}
    </>
  );
}

export function DriverDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const f = useFilters();
  const { modal } = App.useApp();
  const [review, setReview] = useState<DriverDocument>();
  const [verification, setVerification] = useState(false);
  const [form] = Form.useForm<{ status: string; rejectionReason?: string }>();
  const query = useQuery({
    queryKey: ["admin", "driver", id],
    queryFn: () => api.driver(id),
    enabled: valid,
  });
  const skill = useAction((v: { id: number; verified: boolean }) =>
    api.verifySkill(v.id, v.verified),
  );
  const offline = useAction<void>(() => api.offline(id));
  const verify = useAction(
    (v: { status: string; rejectionReason?: string }) =>
      api.verifyDriver(id, v.status, v.rejectionReason?.trim()),
    () => setVerification(false),
  );
  if (!valid) return <InvalidRecord />;
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const { driver, documents, skills } = query.data;
  const skillColumns: ColumnsType<Skill> = [
    { title: "Loại xe", dataIndex: "vehicleType", render: label },
    { title: "Hộp số", dataIndex: "transmission", render: label },
    { title: "Hạng bằng", dataIndex: "licenseClass", render: text },
    {
      title: "Xác minh",
      dataIndex: "verified",
      render: (v) => (
        <Tag color={v ? "green" : "default"}>
          {v ? "Đã xác minh" : "Chưa xác minh"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      render: (_, row) => (
        <Button
          size="small"
          disabled={skill.isPending}
          onClick={() =>
            modal.confirm({
              title: row.verified
                ? "Bỏ xác minh kỹ năng?"
                : "Xác minh kỹ năng?",
              content: `${label(row.vehicleType)} · ${label(row.transmission)} · ${text(row.licenseClass)}`,
              okText: "Xác nhận",
              cancelText: "Đóng",
              onOk: () =>
                skill.mutateAsync({ id: row.id, verified: !row.verified }),
            })
          }
        >
          {row.verified ? "Bỏ xác minh" : "Xác minh"}
        </Button>
      ),
    },
  ];
  return (
    <>
      <Link className="back-link" to={location.state?.from || "/drivers"}>
        <ArrowLeftOutlined /> Quay lại danh sách
      </Link>
      <Heading
        title={driver.fullName || `Tài xế #${id}`}
        subtitle={`Mã tài xế #${id} · ${driver.phoneNumber}`}
        actions={
          <>
            <Status value={driver.verificationStatus} />
            <Refresh
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            />
            <Button
              type="primary"
              onClick={() => {
                form.resetFields();
                verify.reset();
                setVerification(true);
              }}
            >
              Duyệt tài khoản
            </Button>
            <Button
              danger
              disabled={driver.status === "OFFLINE"}
              loading={offline.isPending}
              onClick={() =>
                modal.confirm({
                  title: "Ép tài xế ngoại tuyến?",
                  content:
                    "Tài xế sẽ bị loại khỏi danh sách khả dụng nhận chuyến. Thao tác này không hủy chuyến đang thực hiện.",
                  okText: "Ép offline",
                  cancelText: "Đóng",
                  okButtonProps: { danger: true },
                  onOk: () => offline.mutateAsync(),
                })
              }
            >
              Ép offline
            </Button>
          </>
        }
      />
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <Tabs
        activeKey={
          ["profile", "documents", "skills"].includes(f.read("tab", "profile"))
            ? f.read("tab", "profile")
            : "profile"
        }
        onChange={(tab) => f.update({ tab }, false)}
        items={[
          {
            key: "profile",
            label: "Hồ sơ",
            children: (
              <div className="detail-grid">
                <Panel title="Thông tin tài xế">
                  <Descriptions
                    column={1}
                    items={[
                      {
                        key: "email",
                        label: "Email",
                        children: text(driver.email),
                      },
                      {
                        key: "phone",
                        label: "Số điện thoại",
                        children: driver.phoneNumber,
                      },
                      {
                        key: "status",
                        label: "Hoạt động",
                        children: <Status value={driver.status} />,
                      },
                      {
                        key: "flag",
                        label: "Đánh dấu",
                        children: driver.flagged ? "Có đánh dấu" : "Không",
                      },
                      {
                        key: "created",
                        label: "Ngày tạo",
                        children: date(driver.createdAt),
                      },
                    ]}
                  />
                </Panel>
                <Panel title="Chỉ số và số dư">
                  <Descriptions
                    column={1}
                    items={[
                      {
                        key: "trips",
                        label: "Tổng chuyến",
                        children: driver.totalTrips,
                      },
                      {
                        key: "rating",
                        label: "Đánh giá trung bình",
                        children: text(driver.averageRating),
                      },
                      {
                        key: "acceptance",
                        label: "Tỷ lệ nhận chuyến",
                        children: text(driver.acceptanceRate),
                      },
                      {
                        key: "completion",
                        label: "Tỷ lệ hoàn thành",
                        children: text(driver.completionRate),
                      },
                      {
                        key: "cancel",
                        label: "Tỷ lệ hủy 30 ngày",
                        children: text(driver.cancelRate30d),
                      },
                      {
                        key: "credit",
                        label: "Số dư tín dụng",
                        children: money(driver.creditBalance),
                      },
                      {
                        key: "income",
                        label: "Số dư thu nhập",
                        children: money(driver.incomeBalance),
                      },
                    ]}
                  />
                </Panel>
              </div>
            ),
          },
          {
            key: "documents",
            label: `Giấy tờ (${documents.length})`,
            children: (
              <Panel>
                {documents.length ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="document-card">
                      <Photo
                        url={doc.secureUrl}
                        alt={label(doc.documentType)}
                      />
                      <div className="document-info">
                        <strong>{label(doc.documentType)}</strong>{" "}
                        {!doc.isCurrent && <Tag>Bản cũ</Tag>}
                        <p>
                          Số: {text(doc.documentNumber)} · Hết hạn:{" "}
                          {date(doc.expiresAt)}
                        </p>
                        <Status value={doc.verificationStatus} />
                        {doc.rejectionReason && (
                          <p>Lý do: {doc.rejectionReason}</p>
                        )}
                        <p>
                          Gửi: {date(doc.createdAt)} · Duyệt:{" "}
                          {date(doc.reviewedAt)}
                        </p>
                      </div>
                      <Button
                        size="small"
                        disabled={!doc.isCurrent}
                        onClick={() => setReview(doc)}
                      >
                        Xem và duyệt
                      </Button>
                    </div>
                  ))
                ) : (
                  <Typography.Text type="secondary">
                    Chưa có giấy tờ.
                  </Typography.Text>
                )}
              </Panel>
            ),
          },
          {
            key: "skills",
            label: `Kỹ năng (${skills.length})`,
            children: (
              <Panel>
                <Table
                  rowKey="id"
                  columns={skillColumns}
                  dataSource={skills}
                  pagination={false}
                  scroll={{ x: 650 }}
                  locale={{ emptyText: "Chưa có kỹ năng" }}
                />
              </Panel>
            ),
          },
        ]}
      />
      {review && (
        <DocumentReview
          document={review}
          onClose={() => setReview(undefined)}
        />
      )}
      <Modal
        title="Quyết định xác minh tài xế"
        open={verification}
        onCancel={() => {
          if (!verify.isPending) setVerification(false);
        }}
        onOk={() => form.submit()}
        okText="Lưu quyết định"
        cancelText="Đóng"
        confirmLoading={verify.isPending}
        cancelButtonProps={{ disabled: verify.isPending }}
      >
        <Alert
          className="toolbar-note"
          type="info"
          showIcon
          title="Tài khoản chỉ được duyệt khi đủ giấy tờ bắt buộc đã được duyệt."
        />
        <QueryError error={verify.error} retry={() => verify.reset()} />
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "APPROVED" }}
          onFinish={(v) => {
            if (!verify.isPending) verify.mutate(v);
          }}
        >
          <Form.Item
            label="Trạng thái xác minh"
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={["APPROVED", "REJECTED"].map((value) => ({
                value,
                label: label(value),
              }))}
            />
          </Form.Item>
          <Form.Item
            label="Lý do từ chối (nếu có)"
            name="rejectionReason"
            rules={[{ max: 1000 }]}
          >
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
