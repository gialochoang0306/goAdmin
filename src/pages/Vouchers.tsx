import { useState } from "react";
import { QueryError } from "../components/common";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  BellOutlined,
  EyeOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { api } from "../lib/api";
import type { AdminVoucher, BudgetLedgerItem, CampaignClaimant, PromoBudget } from "../types";

type BudgetForm = { budgetLimit: number };

const formatVndInput = (value?: string | number) => {
  if (value === undefined || value === null || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseVndInput = (value?: string) => Number(value?.replace(/\./g, "") || 0);
const formatDots = (value?: number | string) =>
  Number(value ?? 0).toLocaleString("vi-VN");
const formatMoney = (value?: number | null) => `${formatDots(value ?? 0)}đ`;

const isCampaignExpired = (row: AdminVoucher) =>
  Date.now() > new Date(row.validTo).getTime();

const getCampaignStatus = (row: AdminVoucher) => {
  const now = Date.now();
  const start = new Date(row.validFrom).getTime();
  const end = new Date(row.validTo).getTime();
  if (now > end) return { label: "Đã hết hạn", color: "default" };
  if (row.active === false) return { label: "Đang tạm dừng", color: "orange" };
  if (now < start) return { label: "Sắp diễn ra", color: "gold" };
  return { label: "Đang diễn ra", color: "green" };
};

const claimStatusMap: Record<CampaignClaimant["status"], { label: string; color: string }> = {
  CLAIMED: { label: "Đã nhận · Chưa dùng", color: "blue" },
  HELD: { label: "Đang áp dụng chuyến", color: "orange" },
  USED: { label: "Đã sử dụng", color: "green" },
  EXPIRED: { label: "Tạm khóa / Hết hạn", color: "default" },
};

const ledgerActionMap: Record<string, { label: string; color: string; sign: string }> = {
  BUDGET_SET: { label: "Cập nhật tổng quỹ", color: "blue", sign: "" },
  ISSUE_RESERVE: { label: "Phân bổ / Dự phòng", color: "orange", sign: "-" },
  HOLD: { label: "Giữ cho chuyến", color: "gold", sign: "-" },
  RELEASE: { label: "Hoàn về quỹ tổng", color: "green", sign: "+" },
  SPEND: { label: "Chi thực tế chuyến", color: "red", sign: "-" },
};

export default function Vouchers() {
  const client = useQueryClient();
  const { message } = App.useApp();
  const [voucherForm] = Form.useForm();
  const [budgetForm] = Form.useForm<BudgetForm>();
  const [selectedCampaign, setSelectedCampaign] = useState<AdminVoucher | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const selectedDiscountType = Form.useWatch("discountType", voucherForm) ?? "PERCENT";
  const previewCode = Form.useWatch("code", voucherForm) ?? "";
  const previewTitle = Form.useWatch("campaignTitle", voucherForm) ?? "";
  const previewValue = Form.useWatch("value", voucherForm);
  const previewMaxDiscount = Form.useWatch("maxDiscount", voucherForm);
  const previewLimit = Form.useWatch("usageLimit", voucherForm);
  const previewDescription = Form.useWatch("description", voucherForm) ?? "";

  const vouchers = useQuery({
    queryKey: ["admin", "vouchers"],
    queryFn: api.vouchers,
    retry: false,
  });
  const budget = useQuery({
    queryKey: ["admin", "vouchers", "budget"],
    queryFn: api.promoBudget,
    retry: false,
  });
  const ledger = useQuery({
    queryKey: ["admin", "vouchers", "budget", "ledger"],
    queryFn: api.promoBudgetLedger,
    enabled: ledgerOpen,
    retry: false,
  });

  const rows: AdminVoucher[] = vouchers.data ?? [];
  const fund: PromoBudget | undefined = budget.data;

  const activeDetail = selectedCampaign
    ? rows.find((r) => r.id === selectedCampaign.id) ?? selectedCampaign
    : null;

  const claimants = useQuery({
    queryKey: ["admin", "vouchers", activeDetail?.id, "claims"],
    queryFn: () => api.voucherClaimants(activeDetail!.id),
    enabled: activeDetail !== null && activeDetail.source === "PUBLIC_CODE",
    retry: false,
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "vouchers"] }),
      client.invalidateQueries({ queryKey: ["admin", "vouchers", "budget"] }),
      client.invalidateQueries({ queryKey: ["admin", "vouchers", "budget", "ledger"] }),
      client.invalidateQueries({ queryKey: ["admin", "dashboard", "promo-budget"] }),
      client.invalidateQueries({ queryKey: ["admin", "vouchers", activeDetail?.id, "claims"] }),
    ]);
  };

  const setBudget = useMutation({
    mutationFn: ({ budgetLimit }: BudgetForm) => api.setPromoBudget(budgetLimit),
    onSuccess: async () => {
      await refresh();
      message.success("Đã cập nhật hạn mức tổng quỹ chiến dịch");
    },
    onError: (error) =>
      message.error(error instanceof Error ? error.message : "Không cập nhật được"),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.setVoucherStatus(id, active),
    onSuccess: async (_, vars) => {
      await refresh();
      message.success(
        vars.active
          ? "Đã tiếp tục chiến dịch và cấp lại ngân sách từ quỹ tổng"
          : "Đã tạm dừng chiến dịch và hoàn phần dư về quỹ tổng",
      );
    },
    onError: (error) =>
      message.error(error instanceof Error ? error.message : "Không đổi được trạng thái chiến dịch"),
  });

  const createVoucher = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      api.createVoucher({
        ...values,
        validFrom: new Date(String(values.validFrom)).toISOString(),
        validTo: new Date(String(values.validTo)).toISOString(),
      }),
    onSuccess: async () => {
      voucherForm.resetFields();
      await refresh();
      message.success("Đã phát hành chiến dịch mới (chiến dịch cũ đã kết thúc và hoàn phần dư về quỹ tổng)");
    },
    onError: (error) =>
      message.error(error instanceof Error ? error.message : "Không tạo được chiến dịch"),
  });

  // Tách chi tiết khoản đang giữ (issuanceReserved) thành 2 nguồn rõ ràng
  const activeCampaignSurplus = rows
    .filter((r) => r.source === "PUBLIC_CODE" && r.active !== false && r.campaignBudgetLimit !== null)
    .reduce(
      (sum, r) =>
        sum +
        Math.max(
          0,
          (r.campaignBudgetLimit ?? 0) -
            r.campaignHeldAmount -
            r.campaignSpentAmount -
            r.campaignReleasedAmount,
        ),
      0,
    );
  const systemVoucherReserved = Math.max(0, (fund?.issuanceReserved ?? 0) - activeCampaignSurplus);
  const activeSystemVoucherCount = rows.filter(
    (r) => r.source !== "PUBLIC_CODE" && r.active !== false && !isCampaignExpired(r),
  ).length;
  const maxAllocatableForNewCampaign = (fund?.availableAmount ?? 0) + activeCampaignSurplus;

  const detailBudgetLimit = activeDetail?.campaignBudgetLimit ?? 0;
  const detailRemaining = activeDetail
    ? Math.max(
        0,
        detailBudgetLimit -
          activeDetail.campaignHeldAmount -
          activeDetail.campaignSpentAmount -
          activeDetail.campaignReleasedAmount,
      )
    : 0;
  const budgetUsedPercent =
    detailBudgetLimit > 0
      ? Math.min(
          100,
          Math.round(
            (((activeDetail?.campaignSpentAmount ?? 0) + (activeDetail?.campaignHeldAmount ?? 0)) /
              detailBudgetLimit) *
              100,
          ),
        )
      : 0;
  const claimPercent =
    activeDetail && (activeDetail.usageLimit ?? 0) > 0
      ? Math.min(100, Math.round((activeDetail.campaignClaimCount / (activeDetail.usageLimit ?? 1)) * 100))
      : 0;

  return (
    <Space className="voucher-page" direction="vertical" size="large" style={{ width: "100%" }}>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Quản lý khuyến mãi &amp; ngân sách</Typography.Title>
          <Typography.Paragraph type="secondary">
            Quản lý mức tổng toàn bộ cho các chiến dịch; bấm Chi tiết để dừng/tiếp tục chiến dịch do Admin phát hành và theo dõi khách hàng nhận mã.
          </Typography.Paragraph>
        </div>
      </div>

      {budget.isError && (
        <Alert
          type="error"
          showIcon
          message="Không tải được quỹ khuyến mãi"
          description={budget.error.message}
        />
      )}
      {fund && (
        <Card
          loading={budget.isLoading}
          title="Tổng quan quỹ khuyến mãi"
          extra={
            <Button icon={<HistoryOutlined />} onClick={() => setLedgerOpen(true)}>
              Lịch sử biến động quỹ
            </Button>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={5}>
              <Statistic title="Tổng quỹ chiến dịch" value={fund.budgetLimit} formatter={formatDots} suffix="đ" />
            </Col>
            <Col xs={24} sm={12} lg={7}>
              <Statistic
                title="Đang giữ cho chiến dịch & ưu đãi"
                value={fund.issuanceReserved}
                formatter={formatDots}
                suffix="đ"
              />
              <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, opacity: 0.78 }}>
                <div>• Quỹ chiến dịch đang chạy: <strong>{formatMoney(activeCampaignSurplus)}</strong></div>
                <div>
                  • Dự phòng ưu đãi chào mừng ({activeSystemVoucherCount} mã):{" "}
                  <strong>{formatMoney(systemVoucherReserved)}</strong>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic title="Đang giữ chuyến" value={fund.heldAmount} formatter={formatDots} suffix="đ" />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic title="Đã chi thực tế" value={fund.spentAmount} formatter={formatDots} suffix="đ" />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="Quỹ tổng khả dụng"
                value={fund.availableAmount}
                formatter={formatDots}
                suffix="đ"
                valueStyle={{ color: "#73d13d" }}
              />
            </Col>
          </Row>
          <Divider style={{ margin: "16px 0" }} />
          <Form<BudgetForm>
            form={budgetForm}
            layout="inline"
            initialValues={{ budgetLimit: fund.budgetLimit }}
            onFinish={(values) => setBudget.mutate(values)}
          >
            <Form.Item
              name="budgetLimit"
              label="Cập nhật tổng quỹ chiến dịch"
              rules={[{ required: true, message: "Nhập tổng quỹ" }]}
            >
              <InputNumber
                style={{ width: 220 }}
                min={0}
                step={1_000_000}
                formatter={formatVndInput}
                parser={parseVndInput}
                addonAfter="đ"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={setBudget.isPending}>
              Lưu tổng quỹ
            </Button>
          </Form>
        </Card>
      )}

      <Card title="Phát hành chiến dịch khuyến mãi mới">
        <Alert
          type="warning"
          showIcon
          message={`Khi phát hành chiến dịch mới, chiến dịch công khai đang chạy sẽ tự động kết thúc và hoàn ${formatMoney(activeCampaignSurplus)} phần dư về quỹ tổng. Quỹ tối đa có thể cấp cho chiến dịch mới: ${formatMoney(maxAllocatableForNewCampaign)}.`}
          style={{ marginBottom: 20 }}
        />
        <Form
          form={voucherForm}
          layout="vertical"
          onFinish={(values) => createVoucher.mutate(values)}
        >
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item
                name="campaignTitle"
                label="Tên chiến dịch / Khẩu hiệu thông báo"
                rules={[{ required: true, whitespace: true, message: "Nhập tên chiến dịch hoặc khẩu hiệu thu hút khách hàng" }]}
              >
                <Input placeholder="Ví dụ: Mừng đại lễ — Giảm ngay 20% mọi chuyến đi" maxLength={120} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="code" label="Mã khuyến mãi" rules={[{ required: true, message: "Nhập mã khuyến mãi" }]}>
                <Input placeholder="DAILE20" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="discountType"
                label="Loại giảm giá"
                initialValue="PERCENT"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "PERCENT", label: "Phần trăm (%)" },
                    { value: "FIXED", label: "Số tiền cố định (đ)" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="value"
                label={selectedDiscountType === "PERCENT" ? "Mức giảm (%)" : "Số tiền giảm (đ)"}
                rules={[{ required: true }]}
              >
                <InputNumber style={{ width: "100%" }} min={1} formatter={formatVndInput} parser={parseVndInput} />
              </Form.Item>
            </Col>

            {selectedDiscountType === "PERCENT" && (
              <Col xs={24} md={6}>
                <Form.Item
                  name="maxDiscount"
                  label="Giảm tối đa (đ)"
                  rules={[{ required: true, message: "Nhập mức giảm tối đa" }]}
                  preserve={false}
                >
                  <InputNumber style={{ width: "100%" }} min={1} formatter={formatVndInput} parser={parseVndInput} />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={selectedDiscountType === "PERCENT" ? 6 : 8}>
              <Form.Item name="usageLimit" label="Tổng suất nhận" rules={[{ required: true }]}>
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={selectedDiscountType === "PERCENT" ? 6 : 8}>
              <Form.Item
                name="campaignBudgetLimit"
                label={`Quỹ chiến dịch (≤ ${formatMoney(maxAllocatableForNewCampaign)})`}
                rules={[
                  { required: true, message: "Nhập quỹ riêng của chiến dịch" },
                  {
                    validator: (_, val) => {
                      if (val != null && val > maxAllocatableForNewCampaign) {
                        return Promise.reject(
                          new Error(`Không được vượt quá ${formatMoney(maxAllocatableForNewCampaign)}`),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber style={{ width: "100%" }} min={1} step={100_000} formatter={formatVndInput} parser={parseVndInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={selectedDiscountType === "PERCENT" ? 6 : 8}>
              <Form.Item name="minimumOrderAmount" label="Đơn tối thiểu (đ)" initialValue={0}>
                <InputNumber style={{ width: "100%" }} min={0} formatter={formatVndInput} parser={parseVndInput} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="validFrom" label="Thời gian bắt đầu" rules={[{ required: true }]}>
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="validTo" label="Thời gian kết thúc" rules={[{ required: true }]}>
                <Input type="datetime-local" />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="description"
                label="Mô tả chi tiết điều kiện & nội dung thông báo"
                rules={[{ required: true, whitespace: true, message: "Nhập nội dung thông báo cho khách hàng" }]}
              >
                <Input.TextArea
                  placeholder="Ví dụ: Áp dụng cho mọi chuyến xe nội thành trong tuần lễ vàng. Số lượng có hạn!"
                  maxLength={500}
                  showCount
                  autoSize={{ minRows: 2, maxRows: 3 }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(24, 144, 255, 0.08)",
                  border: "1px dashed rgba(24, 144, 255, 0.45)",
                  marginBottom: 16,
                }}
              >
                <Space align="start" size={10}>
                  <BellOutlined style={{ color: "#1677ff", fontSize: 18, marginTop: 3 }} />
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Xem trước thông báo gửi tới App Khách hàng:
                    </Typography.Text>
                    <Typography.Text strong style={{ display: "block", fontSize: 14, marginTop: 2 }}>
                      {(previewTitle || "Tên chiến dịch / Khẩu hiệu")}{previewCode ? ` (${String(previewCode).toUpperCase()})` : ""}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {previewValue
                        ? selectedDiscountType === "PERCENT"
                          ? `Giảm ${previewValue}%${previewMaxDiscount ? ` (tối đa ${formatMoney(previewMaxDiscount)})` : ""}`
                          : `Giảm ${formatMoney(previewValue)}`
                        : "Mức giảm giá"}{" "}
                      · Giới hạn {previewLimit || 0} suất. {previewDescription || "Nội dung mô tả chiến dịch sẽ hiển thị tại đây."}
                    </Typography.Text>
                  </div>
                </Space>
              </div>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={createVoucher.isPending}>
            Phát hành chiến dịch mới
          </Button>
        </Form>
      </Card>

      <Card title="Lịch sử &amp; danh sách chiến dịch khuyến mãi">
        {vouchers.isError && (
          <Alert
            type="error"
            showIcon
            message="Không tải được danh sách khuyến mãi"
            description={vouchers.error.message}
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          rowKey="id"
          loading={vouchers.isLoading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            onClick: () => setSelectedCampaign(record),
            style: { cursor: "pointer" },
          })}
          columns={[
            {
              title: "Chiến dịch / Mã",
              dataIndex: "code",
              width: 240,
              render: (value: string | null, row: AdminVoucher) => (
                <div>
                  <Typography.Text strong style={{ color: "#ff7875", display: "block" }}>
                    {value || "Ưu đãi chào mừng"}
                  </Typography.Text>
                  {row.campaignTitle && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {row.campaignTitle}
                    </Typography.Text>
                  )}
                </div>
              ),
            },
            {
              title: "Nguồn phát hành",
              dataIndex: "source",
              width: 155,
              render: (source: string) => (
                <Tag color={source === "PUBLIC_CODE" ? "purple" : "cyan"} style={{ margin: 0 }}>
                  {source === "PUBLIC_CODE" ? "Admin phát hành" : "Hệ thống tự phát"}
                </Tag>
              ),
            },
            {
              title: "Trạng thái",
              width: 135,
              render: (_: unknown, row: AdminVoucher) => {
                const st = getCampaignStatus(row);
                return <Tag color={st.color} style={{ margin: 0 }}>{st.label}</Tag>;
              },
            },
            {
              title: "Mức giảm",
              width: 190,
              render: (_: unknown, row: AdminVoucher) =>
                row.discountType === "PERCENT"
                  ? `${row.value}% · tối đa ${formatMoney(row.maxDiscount)}`
                  : formatMoney(row.value),
            },
            {
              title: "Suất nhận",
              width: 135,
              render: (_: unknown, row: AdminVoucher) =>
                row.source === "PUBLIC_CODE"
                  ? `${row.campaignClaimCount}/${row.usageLimit ?? 0} đã nhận`
                  : `${row.usageLimit ?? 1} suất`,
            },
            {
              title: "Quỹ / Dự phòng",
              align: "right",
              width: 175,
              render: (_: unknown, row: AdminVoucher) => {
                if (row.campaignBudgetLimit != null) {
                  return formatMoney(row.campaignBudgetLimit);
                }
                if ((row.systemReserveAmount ?? 0) > 0) {
                  return (
                    <Typography.Text type="warning">
                      {formatMoney(row.systemReserveAmount)} (Dự phòng)
                    </Typography.Text>
                  );
                }
                return "—";
              },
            },
            {
              title: "Đã hoàn quỹ tổng",
              dataIndex: "campaignReleasedAmount",
              align: "right",
              width: 145,
              render: (value: number) => (value > 0 ? formatMoney(value) : "0đ"),
            },
            {
              title: "Thao tác",
              key: "action",
              align: "right",
              width: 110,
              render: (_: unknown, row: AdminVoucher) => (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCampaign(row);
                  }}
                >
                  Chi tiết
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={ledgerOpen}
        onCancel={() => setLedgerOpen(false)}
        title="Sổ cái biến động quỹ khuyến mãi (50 giao dịch gần nhất)"
        footer={[
          <Button key="close" type="primary" onClick={() => setLedgerOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={920}
        centered
      >
        <Table<BudgetLedgerItem>
          rowKey="id"
          size="small"
          loading={ledger.isLoading}
          dataSource={ledger.data ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: "Thời gian",
              dataIndex: "createdAt",
              width: 155,
              render: (val: string) => new Date(val).toLocaleString("vi-VN"),
            },
            {
              title: "Loại biến động",
              dataIndex: "action",
              width: 165,
              render: (act: string) => {
                const info = ledgerActionMap[act] ?? { label: act, color: "default", sign: "" };
                return <Tag color={info.color} style={{ margin: 0 }}>{info.label}</Tag>;
              },
            },
            {
              title: "Số tiền",
              align: "right",
              width: 120,
              render: (_, item) => {
                const info = ledgerActionMap[item.action] ?? { sign: "" };
                const isPlus = info.sign === "+";
                return (
                  <Typography.Text strong style={{ color: isPlus ? "#73d13d" : undefined }}>
                    {info.sign}{formatMoney(item.amount)}
                  </Typography.Text>
                );
              },
            },
            {
              title: "Đối tượng áp dụng",
              width: 220,
              render: (_, item) => (
                <div>
                  <Typography.Text strong style={{ display: "block" }}>
                    {item.voucherLabel || (item.campaignCode ? `Chiến dịch ${item.campaignCode}` : "Quỹ tổng hệ thống")}
                  </Typography.Text>
                  {item.customerName && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Khách nhận: {item.customerName}
                    </Typography.Text>
                  )}
                  {item.rideId && (
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Mã chuyến đi: #{item.rideId}
                    </Typography.Text>
                  )}
                </div>
              ),
            },
            {
              title: "Diễn giải chi tiết",
              render: (_, item) => (
                <Typography.Text type="secondary">
                  {item.note || "—"}
                </Typography.Text>
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={activeDetail !== null}
        onCancel={() => setSelectedCampaign(null)}
        title={
          activeDetail && (
            <Space size={10}>
              <span>Chi tiết chiến dịch</span>
              <Tag color={activeDetail.source === "PUBLIC_CODE" ? "red" : "cyan"} style={{ margin: 0 }}>
                {activeDetail.code || "Ưu đãi chào mừng"}
              </Tag>
              <Tag color={getCampaignStatus(activeDetail).color} style={{ margin: 0 }}>
                {getCampaignStatus(activeDetail).label}
              </Tag>
            </Space>
          )
        }
        footer={
          activeDetail && [
            activeDetail.source === "PUBLIC_CODE" &&
              !isCampaignExpired(activeDetail) &&
              (activeDetail.active !== false ? (
                <Popconfirm
                  key="pause"
                  title="Tạm dừng chiến dịch này?"
                  description="Khách sẽ không thể nhận hoặc dùng voucher của chiến dịch và phần ngân sách dư (nếu có) sẽ hoàn về quỹ tổng."
                  okText="Dừng chiến dịch"
                  cancelText="Hủy"
                  onConfirm={() => toggleStatus.mutate({ id: activeDetail.id, active: false })}
                >
                  <Button danger icon={<PauseCircleOutlined />} loading={toggleStatus.isPending}>
                    Dừng chiến dịch
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  key="resume"
                  title="Tiếp tục chạy chiến dịch này?"
                  description="Hệ thống sẽ đóng chiến dịch đang chạy khác (nếu có) và mở lại chiến dịch này."
                  okText="Tiếp tục"
                  cancelText="Hủy"
                  onConfirm={() => toggleStatus.mutate({ id: activeDetail.id, active: true })}
                >
                  <Button type="primary" ghost icon={<PlayCircleOutlined />} loading={toggleStatus.isPending}>
                    Tiếp tục chiến dịch
                  </Button>
                </Popconfirm>
              )),
            <Button key="close" type="primary" onClick={() => setSelectedCampaign(null)}>
              Đóng
            </Button>,
          ]
        }
        width={780}
        centered
      >
        {activeDetail && (
          <Space direction="vertical" size={16} style={{ width: "100%", marginTop: 8 }}>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(24, 144, 255, 0.12)",
                border: "1px solid rgba(24, 144, 255, 0.32)",
              }}
            >
              <Space align="start" size={10}>
                <BellOutlined style={{ color: "#40a9ff", marginTop: 3 }} />
                <div>
                  <Typography.Text strong style={{ display: "block", marginBottom: 2 }}>
                    {activeDetail.campaignTitle
                      ? `${activeDetail.campaignTitle}${activeDetail.code ? ` (${activeDetail.code})` : ""}`
                      : "Nội dung thông báo gửi khách hàng"}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {activeDetail.description || "Không có mô tả"}
                  </Typography.Text>
                </div>
              </Space>
            </div>

            {activeDetail.campaignBudgetLimit !== null && (
              <div>
                <Typography.Text strong style={{ display: "block", marginBottom: 10 }}>
                  <WalletOutlined style={{ marginRight: 6 }} />
                  Đối soát ngân sách chiến dịch
                </Typography.Text>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Quỹ phân bổ
                    </Typography.Text>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                      {formatMoney(detailBudgetLimit)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Đã chi thực tế
                    </Typography.Text>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                      {formatMoney(activeDetail.campaignSpentAmount)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(250, 173, 20, 0.08)",
                      border: "1px solid rgba(250, 173, 20, 0.3)",
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Hoàn về quỹ tổng
                    </Typography.Text>
                    <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: "#faad14" }}>
                      {formatMoney(activeDetail.campaignReleasedAmount)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(82, 196, 26, 0.08)",
                      border: "1px solid rgba(82, 196, 26, 0.3)",
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Còn lại khả dụng
                    </Typography.Text>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        marginTop: 4,
                        color: detailRemaining > 0 ? "#73d13d" : "#ff4d4f",
                      }}
                    >
                      {formatMoney(detailRemaining)}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <Typography.Text type="secondary">Tỷ lệ dùng ngân sách (chi + giữ)</Typography.Text>
                      <Typography.Text strong>{budgetUsedPercent}%</Typography.Text>
                    </div>
                    <Progress percent={budgetUsedPercent} showInfo={false} size="small" strokeColor="#52c41a" />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <Typography.Text type="secondary">Tỷ lệ phát suất</Typography.Text>
                      <Typography.Text strong>
                        {activeDetail.campaignClaimCount}/{activeDetail.usageLimit ?? 0} suất ({claimPercent}%)
                      </Typography.Text>
                    </div>
                    <Progress percent={claimPercent} showInfo={false} size="small" strokeColor="#1677ff" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                Chi tiết trạng thái suất &amp; điều kiện áp dụng
              </Typography.Text>
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="Nguồn phát hành">
                  {activeDetail.source === "PUBLIC_CODE" ? "Chiến dịch Admin phát hành" : "Hệ thống tự phát (Chào mừng)"}
                </Descriptions.Item>
                <Descriptions.Item label="Suất đã phát">
                  <strong>{activeDetail.campaignClaimCount}</strong> / {activeDetail.usageLimit ?? 0} suất
                </Descriptions.Item>
                <Descriptions.Item label="Ưu đãi đã dùng">
                  <strong>{activeDetail.campaignUsedCount}</strong> lượt hoàn thành
                </Descriptions.Item>
                <Descriptions.Item label="Đang giữ cho chuyến">
                  <strong>{activeDetail.campaignHeldCount ?? 0}</strong> chuyến ({formatMoney(activeDetail.campaignHeldAmount)})
                </Descriptions.Item>
                <Descriptions.Item label="Mức giảm tối đa / lượt">
                  {formatMoney(activeDetail.maxDiscount ?? activeDetail.value)}
                </Descriptions.Item>
                <Descriptions.Item label="Đơn tối thiểu">
                  {formatMoney(activeDetail.minimumOrderAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="Thời gian hiệu lực" span={2}>
                  {new Date(activeDetail.validFrom).toLocaleString("vi-VN")} –{" "}
                  {new Date(activeDetail.validTo).toLocaleString("vi-VN")}
                </Descriptions.Item>
              </Descriptions>
            </div>

            {activeDetail.source === "PUBLIC_CODE" && (
              <div>
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  <TeamOutlined style={{ marginRight: 6 }} />
                  Danh sách tài khoản đã nhận voucher ({claimants.data?.length ?? activeDetail.campaignClaimCount})
                </Typography.Text>
                <QueryError error={claimants.error} retry={() => void claimants.refetch()} />
                <Table<CampaignClaimant>
                  rowKey="voucherId"
                  size="small"
                  loading={claimants.isLoading}
                  dataSource={claimants.data ?? []}
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: "Chưa có tài khoản nào nhận voucher từ chiến dịch này" }}
                  columns={[
                    {
                      title: "Khách hàng",
                      render: (_, item) => (
                        <div>
                          <Typography.Text strong>{item.fullName}</Typography.Text>
                          <div style={{ fontSize: 12, opacity: 0.65 }}>ID #{item.customerId} · {item.phone}</div>
                        </div>
                      ),
                    },
                    {
                      title: "Thời điểm nhận",
                      dataIndex: "claimedAt",
                      render: (val: string) => new Date(val).toLocaleString("vi-VN"),
                    },
                    {
                      title: "Trạng thái",
                      dataIndex: "status",
                      render: (st: CampaignClaimant["status"]) => {
                        const info = claimStatusMap[st] ?? { label: st, color: "default" };
                        return <Tag color={info.color}>{info.label}</Tag>;
                      },
                    },
                    {
                      title: "Chuyến / Giảm thực tế",
                      render: (_, item) =>
                        item.rideId
                          ? `Chuyến #${item.rideId} (${formatMoney(item.discountAmount)})`
                          : "—",
                    },
                  ]}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>
    </Space>
  );
}