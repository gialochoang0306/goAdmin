import { FilterField } from "../components/FilterField";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  App,
  Button,
  Descriptions,
  Empty,
  Input,
  Select,
  Table,
  Tabs,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api } from "../lib/api";
import { date, label, money, percentage, text } from "../lib/format";
import { useAction, useFilters } from "../lib/hooks";
import {
  DataTable,
  Heading,
  InvalidRecord,
  Loading,
  Panel,
  QueryError,
  Refresh,
  Status,
} from "../components/common";
import type { Driver, Skill } from "../types";
import { returnPath, returnLabel } from "../lib/navigation";
import { states, verificationApplicationPath } from "./verificationReviewModel";

const verificationOptions = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
].map((value) => ({ value, label: label(value) }));
const booleanOptions = [
  { value: "true", label: "Có đánh dấu" },
  { value: "false", label: "Không đánh dấu" },
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
      width: 210, fixed: "left",
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
    { title: "Tổng chuyến", dataIndex: "totalTrips", align: "right" },
    { title: "Đánh giá", dataIndex: "averageRating", render: text, align: "right" },
    { title: "Số dư thu nhập", dataIndex: "incomeBalance", render: money, align: "right" },
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
        <FilterField label="Tìm tài xế" search><Input.Search
          key={f.read("search")}
          defaultValue={f.read("search")}
          aria-label="Tìm tài xế"
          placeholder="Tên hoặc số điện thoại"
          enterButton="Tìm" maxLength={200}
          onSearch={(search) => f.update({ search: search.trim() })}
        /></FilterField>
        <FilterField label="Xác minh tài xế"><Select
          allowClear
          aria-label="Xác minh tài xế"
          placeholder="Tất cả xác minh"
          value={f.read("verification_status") || undefined}
          options={verificationOptions}
          onChange={(v) => f.update({ verification_status: v })}
        /></FilterField>
        <FilterField label="Kết nối tài xế"><Select
          allowClear
          aria-label="Kết nối tài xế"
          placeholder="Tất cả kết nối"
          value={f.read("online") || undefined}
          options={[
            { value: "true", label: "Đang kết nối (kể cả bận)" },
            { value: "false", label: "Ngoại tuyến" },
          ]}
          onChange={(v) => f.update({ online: v })}
        /></FilterField>
        <FilterField label="Đánh dấu tài xế"><Select
          allowClear
          aria-label="Đánh dấu tài xế"
          placeholder="Đánh dấu"
          value={f.read("flagged") || undefined}
          options={booleanOptions}
          onChange={(v) => f.update({ flagged: v })}
        /></FilterField>
        <Button className="filter-reset" onClick={f.reset}>Xóa bộ lọc</Button>
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

export function DriverDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const f = useFilters();
  const { modal } = App.useApp();
  const query = useQuery({
    queryKey: ["admin", "driver", id],
    queryFn: () => api.driver(id),
    enabled: valid,
  });
  const offline = useAction<void>(() => api.offline(id), undefined, `Đã chuyển tài xế #${id} sang ngoại tuyến.`);
  if (!valid) return <InvalidRecord />;
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const { driver, verification, skills } = query.data;
  const verificationPath = verification ? verificationApplicationPath(verification.applicationId) : undefined;
  const activeTab = f.read("tab", "profile");
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
  ];
  return (
    <>
      <Link className="back-link" to={returnPath(location.state, "/drivers")}>
        <ArrowLeftOutlined aria-hidden /> {returnLabel(returnPath(location.state, "/drivers"))}
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
            {verificationPath && <Link to={verificationPath}>Xem hồ sơ eKYC</Link>}
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
        activeKey={["verification", "skills"].includes(activeTab) ? activeTab : "profile"}
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
                        children: percentage(driver.acceptanceRate),
                      },
                      {
                        key: "completion",
                        label: "Tỷ lệ hoàn thành",
                        children: percentage(driver.completionRate),
                      },
                      {
                        key: "cancel",
                        label: "Tỷ lệ hủy 30 ngày",
                        children: percentage(driver.cancelRate30d),
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
            key: "verification",
            label: "Xác minh eKYC",
            children: (
              <Panel>
                {verification && verificationPath ? (
                  <Descriptions column={1} items={[
                    { key: "application", label: "Mã hồ sơ", children: <Link to={verificationPath}>{verification.applicationId}</Link> },
                    { key: "status", label: "Trạng thái hồ sơ", children: <Tag>{states[verification.status] ?? verification.status}</Tag> },
                  ]} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tài xế chưa tạo hồ sơ xác minh eKYC." />
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
    </>
  );
}
