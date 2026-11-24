import { useState } from "react";
import { FilterField } from "../components/FilterField";
import { FilterSelect } from "../components/FilterSelect";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { api, request } from "../lib/api";
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
import type { Driver, DriverCapabilities, DriverCapabilityGroup } from "../types";
import { returnPath, returnLabel } from "../lib/navigation";
import { states, verificationApplicationPath, verificationStatusColor } from "./verificationReviewModel";

const capabilityReasons: Record<string, string> = {
  WORKFLOW_DISABLED: "Dịch vụ nhận chuyến theo nhóm xe đang tắt",
  DRIVER_UNAVAILABLE: "Tài khoản chưa thể nhận chuyến",
  VERIFICATION_NOT_SYNCHRONIZED: "Chưa đồng bộ hồ sơ xác minh",
  VERIFICATION_NOT_APPROVED: "Hồ sơ eKYC chưa được duyệt",
  CCCD_EXPIRED: "CCCD đã hết hạn",
  CAPABILITY_NOT_APPROVED: "Chưa được duyệt nhóm xe này",
  CAPABILITY_EXPIRED_OR_POLICY_CHANGED: "Quyền đã hết hiệu lực hoặc chính sách GPLX thay đổi",
};

function capabilityState(group: DriverCapabilityGroup) {
  if (group.enabled && group.effective) return { color: "green", label: "Đang bật nhận chuyến" };
  if (group.enabled) return { color: "red", label: "Đang bật · quyền hết hiệu lực" };
  return { color: "default", label: "Chưa bật nhận chuyến" };
}

/** Lý do không có nhóm xe nào được duyệt, lấy từ reasonCode của projection hiện tại. */
function noApprovedReason(groups: readonly DriverCapabilityGroup[]) {
  const code = groups.find(group => group.reasonCode)?.reasonCode;
  if (code) return capabilityReasons[code] ?? code;
  return "Chưa có nhóm xe nào được duyệt trong hồ sơ eKYC.";
}

const verificationOptions = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
].map((value) => ({ value, label: label(value) }));
const accountStatusOptions = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "SUSPENDED", label: "Tạm ngưng nhận chuyến (Mức 1)" },
  { value: "BANNED", label: "Khóa vĩnh viễn (Mức 2)" },
];
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
    account_status: f.read("account_status"),
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
      title: "Tài khoản",
      dataIndex: "accountStatus",
      render: (v, r) => (
        <Space direction="vertical" size={4}>
          <Status value={v ?? "ACTIVE"} />
          {r.withdrawalFrozen && <Tag color="red">Khóa rút tiền</Tag>}
        </Space>
      ),
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
        <FilterField label="Xác minh tài xế"><FilterSelect
          aria-label="Xác minh tài xế"
          allLabel="Tất cả xác minh"
          value={f.read("verification_status")}
          options={verificationOptions}
          onChange={(v) => f.update({ verification_status: v })}
        /></FilterField>
        <FilterField label="Trạng thái tài khoản"><FilterSelect
          aria-label="Trạng thái tài khoản"
          allLabel="Tất cả tài khoản"
          value={f.read("account_status")}
          options={accountStatusOptions}
          onChange={(v) => f.update({ account_status: v })}
        /></FilterField>
        <FilterField label="Kết nối tài xế"><FilterSelect
          aria-label="Kết nối tài xế"
          allLabel="Tất cả kết nối"
          value={f.read("online")}
          options={[
            { value: "true", label: "Đang kết nối (kể cả bận)" },
            { value: "false", label: "Ngoại tuyến" },
          ]}
          onChange={(v) => f.update({ online: v })}
        /></FilterField>
        <FilterField label="Đánh dấu tài xế"><FilterSelect
          aria-label="Đánh dấu tài xế"
          allLabel="Tất cả đánh dấu"
          value={f.read("flagged")}
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
  const applicationId = query.data?.verification?.applicationId;
  const capabilities = useQuery({
    queryKey: ["admin", "driverCapabilities", applicationId],
    queryFn: () => request<DriverCapabilities>(`/api/admin/vehicle-catalog/applications/${applicationId}/capabilities`),
    enabled: Boolean(applicationId),
    retry: false,
  });
  const offline = useAction<void>(() => api.offline(id), undefined, `Đã chuyển tài xế #${id} sang ngoại tuyến.`);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  if (!valid) return <InvalidRecord />;
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <QueryError error={query.error} retry={() => void query.refetch()} />
    );
  const { driver, verification } = query.data;
  const verificationPath = verification ? verificationApplicationPath(verification.applicationId) : undefined;
  const activeTab = f.read("tab", "profile");
  const tabKey = activeTab === "skills" ? "vehicles" : activeTab;
  const capabilityColumns: ColumnsType<DriverCapabilityGroup> = [
    { title: "Nhóm xe", dataIndex: "label" },
    {
      title: "Nhận chuyến",
      dataIndex: "effective",
      render: (_, group) => {
        const state = capabilityState(group);
        return <Tag color={state.color}>{state.label}</Tag>;
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "reasonCode",
      render: (_, group) => {
        if (group.reasonCode) return capabilityReasons[group.reasonCode] ?? group.reasonCode;
        if (group.expiresOn) return `Hiệu lực đến ${date(group.expiresOn)}`;
        if (!group.enabled) return "Tài xế bật trong mục Loại xe nhận lái hộ";
        return "—";
      },
    },
  ];
  // Chỉ hiện nhóm xe tài xế thực sự được phép lái (đã duyệt trong hồ sơ eKYC).
  const approvedGroups = (capabilities.data?.groups ?? []).filter(group => group.approved);
  const sortedGroups = [...approvedGroups].sort((a, b) =>
    Number(b.effective) - Number(a.effective) || Number(b.enabled) - Number(a.enabled));
  const acceptingLabels = approvedGroups.filter(group => group.enabled && group.effective).map(group => group.label);
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
            <Status value={driver.accountStatus ?? "ACTIVE"} />
            <Status value={driver.verificationStatus} />
            <Refresh
              loading={query.isFetching || capabilities.isFetching}
              onClick={() => {
                void query.refetch();
                void capabilities.refetch();
              }}
            />
            {verificationPath && <Link className="ant-btn ant-btn-default verification-header-link" to={verificationPath}>Xem hồ sơ eKYC</Link>}
            <Button onClick={() => setStatusModalOpen(true)}>
              Trạng thái tài khoản
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
        activeKey={["verification", "vehicles"].includes(tabKey) ? tabKey : "profile"}
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
                        key: "accountStatus",
                        label: "Trạng thái tài khoản",
                        children: <Status value={driver.accountStatus ?? "ACTIVE"} />,
                      },
                      ...(driver.accountStatusReason
                        ? [
                            {
                              key: "accountStatusReason",
                              label: "Lý do tạm ngưng / khóa",
                              children: driver.accountStatusReason,
                            },
                          ]
                        : []),
                      {
                        key: "withdrawalFrozen",
                        label: "Rút tiền",
                        children: driver.withdrawalFrozen ? (
                          <Tag color="red">Đang khóa rút tiền (đối soát)</Tag>
                        ) : (
                          "Bình thường"
                        ),
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
                  <Descriptions bordered column={1} items={[
                    { key: "application", label: "Mã hồ sơ", children: <Link to={verificationPath}>{verification.applicationId}</Link> },
                    { key: "status", label: "Trạng thái hồ sơ", children: <Tag color={verificationStatusColor(verification.status)}>{states[verification.status] ?? verification.status}</Tag> },
                  ]} />
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tài xế chưa tạo hồ sơ xác minh eKYC." />
                )}
              </Panel>
            ),
          },
          {
            key: "vehicles",
            label: `Loại xe nhận chuyến (${approvedGroups.length})`,
            children: (
              <Panel>
                {!applicationId ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tài xế chưa có hồ sơ eKYC nên chưa xét được nhóm xe nhận chuyến." />
                ) : capabilities.isPending ? <Loading /> : capabilities.error ? (
                  <QueryError error={capabilities.error} retry={() => void capabilities.refetch()} />
                ) : approvedGroups.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<div>
                      <div>Tài xế chưa được duyệt nhóm xe nào</div>
                      <div className="muted">{noApprovedReason(capabilities.data?.groups ?? [])}</div>
                    </div>}
                  />
                ) : (
                  <>
                    <div className="muted" style={{ marginBottom: 12 }}>
                      {acceptingLabels.length
                        ? `Đang bật nhận chuyến: ${acceptingLabels.join(", ")}`
                        : "Tài xế chưa bật nhóm xe nào để nhận chuyến"}
                    </div>
                    <Table<DriverCapabilityGroup>
                      rowKey="groupId"
                      columns={capabilityColumns}
                      dataSource={sortedGroups}
                      pagination={false}
                      scroll={{ x: 640 }}
                    />
                  </>
                )}
              </Panel>
            ),
          },
        ]}
      />
      {statusModalOpen && (
        <DriverAccountStatusModal
          driver={driver}
          onClose={() => setStatusModalOpen(false)}
        />
      )}
    </>
  );
}

function DriverAccountStatusModal({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const accountStatus =
    Form.useWatch("accountStatus", form) ?? driver.accountStatus ?? "ACTIVE";
  const withdrawalFrozen =
    Form.useWatch("withdrawalFrozen", form) ?? Boolean(driver.withdrawalFrozen);
  const mutation = useAction<{
    accountStatus: string;
    reason?: string;
    withdrawalFrozen: boolean;
  }>(
    (values) =>
      api.driverStatus(
        driver.id,
        values.accountStatus,
        values.reason?.trim() || undefined,
        values.withdrawalFrozen,
      ),
    onClose,
    "Đã cập nhật trạng thái tài khoản tài xế.",
  );
  const reasonRequired =
    accountStatus !== "ACTIVE" ||
    (withdrawalFrozen && !driver.withdrawalFrozen);

  return (
    <Modal
      open
      title="Cập nhật trạng thái tài khoản tài xế"
      okText="Lưu trạng thái"
      cancelText="Đóng"
      closable={!mutation.isPending}
      keyboard={!mutation.isPending}
      mask={{ closable: !mutation.isPending }}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      okButtonProps={{ danger: accountStatus === "BANNED" }}
      onCancel={onClose}
      onOk={() => void form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          accountStatus: driver.accountStatus ?? "ACTIVE",
          withdrawalFrozen: Boolean(driver.withdrawalFrozen),
          reason: driver.accountStatusReason ?? "",
        }}
        onFinish={(values) => {
          if (!mutation.isPending) mutation.mutate(values);
        }}
      >
        <Form.Item
          name="accountStatus"
          label="Mức xử lý tài khoản"
          rules={[{ required: true, message: "Chọn trạng thái tài khoản" }]}
        >
          <Select options={accountStatusOptions} />
        </Form.Item>
        {accountStatus === "SUSPENDED" && (
          <Alert
            className="toolbar-note"
            showIcon
            type="info"
            title="Mức 1 (Tạm ngưng nhận chuyến): Tài xế vẫn đăng nhập xem doanh thu, lịch sử chuyến, nạp tiền vào ví, cập nhật giấy tờ và gửi khiếu nại; nhưng bị khóa nút Bật trực tuyến và ngừng điều phối cuốc mới. Nếu đang Online sẽ tự động ép Offline; nếu đang trong chuyến sẽ hoàn tất cuốc rồi mới ép Offline."
          />
        )}
        {accountStatus === "BANNED" && (
          <Alert
            className="toolbar-note"
            showIcon
            type="warning"
            title="Mức 2 (Khóa vĩnh viễn): Đá văng phiên đăng nhập, thu hồi refresh token và chặn đăng nhập lại. Nếu tài xế đang có chuyến đi hoạt động, hệ thống cho hoàn tất cuốc hiện tại rồi mới tự động ép Offline và khóa phiên."
          />
        )}
        <Form.Item name="withdrawalFrozen" valuePropName="checked">
          <Checkbox>
            Khóa rút tiền (giữ số dư ví chờ đối soát gian lận / tranh chấp)
          </Checkbox>
        </Form.Item>
        <Form.Item
          name="reason"
          label="Lý do xử lý"
          rules={[
            {
              required: reasonRequired,
              whitespace: true,
              message: "Nhập lý do khi tạm ngưng, khóa tài khoản hoặc khóa rút tiền",
            },
            { max: 1000, message: "Tối đa 1000 ký tự" },
          ]}
        >
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            placeholder="Ví dụ: GPLX hết hạn, tỷ lệ hủy cao, gian lận GPS..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
