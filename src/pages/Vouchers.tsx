import { useEffect, useState } from "react";
import { Heading, Panel, QueryError, Refresh } from "../components/common";
import { date, money } from "../lib/format";
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
const formatMoney = (value?: number | null) => money(value);

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

function VoucherNotificationPreview({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const discountType = Form.useWatch("discountType", form) ?? "PERCENT";
  const code = Form.useWatch("code", form) ?? "";
  const title = Form.useWatch("campaignTitle", form) ?? "";
  const value = Form.useWatch("value", form);
  const maxDiscount = Form.useWatch("maxDiscount", form);
  const limit = Form.useWatch("usageLimit", form);
  const description = Form.useWatch("description", form) ?? "";
  return (
    <div className="voucher-preview-box">
      <Space align="start" size={10}>
        <BellOutlined className="voucher-preview-icon" />
        <div>
          <span className="voucher-preview-kicker">
            Xem trước thông báo gửi tới App Khách hàng:
          </span>
          <span className="voucher-preview-title">
            {(title || "Tên chiến dịch / Khẩu hiệu")}{code ? ` (${String(code).toUpperCase()})` : ""}
          </span>
          <span className="voucher-preview-desc">
            {value
              ? discountType === "PERCENT"
                ? `Giảm ${value}%${maxDiscount ? ` (tối đa ${formatMoney(maxDiscount)})` : ""}`
                : `Giảm ${formatMoney(value)}`
              : "Mức giảm giá"}{" "}
            · Giới hạn {limit || 0} suất. {description || "Nội dung mô tả chiến dịch sẽ hiển thị tại đây."}
          </span>
        </div>
      </Space>
    </div>
  );
}

export default function Vouchers() {
  const client = useQueryClient();
  const { message } = App.useApp();
  const [voucherForm] = Form.useForm();
  const [budgetForm] = Form.useForm<BudgetForm>();
  const [selectedCampaign, setSelectedCampaign] = useState<AdminVoucher | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const selectedDiscountType = Form.useWatch("discountType", voucherForm) ?? "PERCENT";

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

  useEffect(() => {
    if (fund) {
      budgetForm.setFieldsValue({ budgetLimit: fund.budgetLimit });
    }
  }, [fund, budgetForm]);

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
    mutationFn: (values: Record<string, unknown>) => {
      const start = new Date(String(values.validFrom));
      const end = new Date(String(values.validTo));
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        throw new Error("Thời gian bắt đầu hoặc kết thúc không hợp lệ.");
      }
      if (end.getTime() <= start.getTime()) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      }
      return api.createVoucher({
        ...values,
        code: String(values.code ?? "").trim().toUpperCase(),
        campaignTitle: String(values.campaignTitle ?? "").trim(),
        description: String(values.description ?? "").trim(),
        validFrom: start.toISOString(),
        validTo: end.toISOString(),
      });
    },
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
    <Space className="voucher-page" orientation="vertical" size="large" style={{ width: "100%" }}>
      <Heading
        title="Quản lý khuyến mãi & ngân sách"
        subtitle="Quản lý mức tổng toàn bộ cho các chiến dịch; bấm Chi tiết để dừng hoặc tiếp tục chiến dịch do Admin phát hành và theo dõi khách hàng nhận mã."
        actions={
          <Refresh
            loading={vouchers.isFetching || budget.isFetching}
            onClick={() => void refresh()}
          />
        }
      />

      <QueryError error={budget.error} retry={() => void budget.refetch()} />
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
              <Statistic title="Tổng quỹ chiến dịch" value={fund.budgetLimit} formatter={formatDots} suffix="₫" />
            </Col>
            <Col xs={24} sm={12} lg={7}>
              <Statistic
                title="Đang giữ cho chiến dịch & ưu đãi"
                value={fund.issuanceReserved}
                formatter={formatDots}
                suffix="₫"
              />
              <div className="voucher-budget-sub">
                <div>• Quỹ chiến dịch đang chạy: <strong>{formatMoney(activeCampaignSurplus)}</strong></div>
                <div>
                  • Dự phòng ưu đãi chào mừng ({activeSystemVoucherCount} mã):{" "}
                  <strong>{formatMoney(systemVoucherReserved)}</strong>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic title="Đang giữ chuyến" value={fund.heldAmount} formatter={formatDots} suffix="₫" />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic title="Đã chi thực tế" value={fund.spentAmount} formatter={formatDots} suffix="₫" />
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Statistic
                title="Quỹ tổng khả dụng"
                value={fund.availableAmount}
                formatter={formatDots}
                suffix="₫"
                styles={{ content: { color: "var(--md-sys-color-success)" } }}
              />
            </Col>
          </Row>
          <Divider style={{ margin: "16px 0" }} />
          <Form<BudgetForm>
            form={budgetForm}
            layout="inline"
            className="voucher-budget-form"
            initialValues={{ budgetLimit: fund.budgetLimit }}
            onFinish={(values) => { if (!setBudget.isPending) setBudget.mutate(values); }}
          >
            <Form.Item
              name="budgetLimit"
              label="Cập nhật tổng quỹ chiến dịch"
              rules={[
                { required: true, message: "Nhập tổng quỹ" },
                { type: "number", min: 0, message: "Tổng quỹ không được âm" },
              ]}
            >
              <InputNumber
                min={0}
                step={1_000_000}
                formatter={formatVndInput}
                parser={parseVndInput}
                suffix="đ"
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
          title={`Khi phát hành chiến dịch mới, chiến dịch công khai đang chạy sẽ tự động kết thúc và hoàn ${formatMoney(activeCampaignSurplus)} phần dư về quỹ tổng. Quỹ tối đa có thể cấp cho chiến dịch mới: ${formatMoney(maxAllocatableForNewCampaign)}.`}
          style={{ marginBottom: 20 }}
        />
        <Form
          form={voucherForm}
          layout="vertical"
          onFinish={(values) => { if (!createVoucher.isPending) createVoucher.mutate(values); }}
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
              <Form.Item
                name="code"
                label="Mã khuyến mãi"
                rules={[
                  { required: true, whitespace: true, message: "Nhập mã khuyến mãi" },
                  {
                    pattern: /^[A-Za-z0-9_-]{3,50}$/,
                    message: "Mã chỉ gồm 3–50 ký tự chữ, số, dấu gạch dưới hoặc gạch nối",
                  },
                ]}
              >
                <Input placeholder="DAILE20" maxLength={50} style={{ textTransform: "uppercase" }} />
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
                rules={[
                  { required: true, message: "Nhập mức giảm" },
                  ...(selectedDiscountType === "PERCENT"
                    ? [{ type: "number" as const, min: 1, max: 100, message: "Mức giảm phần trăm từ 1% đến 100%" }]
                    : [{ type: "number" as const, min: 1, message: "Số tiền giảm phải lớn hơn 0" }]),
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={selectedDiscountType === "PERCENT" ? 100 : undefined}
                  formatter={formatVndInput}
                  parser={parseVndInput}
                />
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
              <Form.Item name="usageLimit" label="Tổng suất nhận" rules={[{ required: true, message: "Nhập tổng suất nhận" }]}>
                <InputNumber style={{ width: "100%" }} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={selectedDiscountType === "PERCENT" ? 6 : 8}>
              <Form.Item
                name="campaignBudgetLimit"
                label={`Quỹ chiến dịch (≤ ${formatMoney(maxAllocatableForNewCampaign)})`}
                dependencies={["discountType", "value", "maxDiscount"]}
                rules={[
                  { required: true, message: "Nhập quỹ riêng của chiến dịch" },
                  {
                    validator: (_, val) => {
                      if (val == null) return Promise.resolve();
                      if (val > maxAllocatableForNewCampaign) {
                        return Promise.reject(
                          new Error(`Không được vượt quá ${formatMoney(maxAllocatableForNewCampaign)}`),
                        );
                      }
                      const discountCap =
                        selectedDiscountType === "FIXED"
                          ? Number(voucherForm.getFieldValue("value") ?? 0)
                          : Number(voucherForm.getFieldValue("maxDiscount") ?? 0);
                      if (discountCap > 0 && val < discountCap) {
                        return Promise.reject(
                          new Error(`Quỹ chiến dịch phải >= mức giảm tối đa/lượt (${formatMoney(discountCap)})`),
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
              <Form.Item name="validFrom" label="Thời gian bắt đầu" rules={[{ required: true, message: "Chọn thời gian bắt đầu" }]}>
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="validTo"
                label="Thời gian kết thúc"
                dependencies={["validFrom"]}
                rules={[
                  { required: true, message: "Chọn thời gian kết thúc" },
                  {
                    validator: (_, val) => {
                      if (!val) return Promise.resolve();
                      const end = new Date(String(val));
                      if (!Number.isFinite(end.getTime())) {
                        return Promise.reject(new Error("Thời gian kết thúc không hợp lệ"));
                      }
                      const fromVal = voucherForm.getFieldValue("validFrom");
                      if (fromVal) {
                        const start = new Date(String(fromVal));
                        if (Number.isFinite(start.getTime()) && end.getTime() <= start.getTime()) {
                          return Promise.reject(new Error("Thời gian kết thúc phải sau thời gian bắt đầu"));
                        }
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
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
              <VoucherNotificationPreview form={voucherForm} />
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={createVoucher.isPending}>
            Phát hành chiến dịch mới
          </Button>
        </Form>
      </Card>

      <Panel title="Lịch sử & danh sách chiến dịch khuyến mãi">
        <QueryError error={vouchers.error} retry={() => void vouchers.refetch()} />
        <Table
          rowKey="id"
          loading={vouchers.isLoading}
          dataSource={rows}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} chiến dịch` }}
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
                  <Typography.Text strong className="voucher-code-label">
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
              render: (value: number) => formatMoney(value ?? 0),
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
      </Panel>

      <Modal
        open={ledgerOpen}
        onCancel={() => setLedgerOpen(false)}
        title="Sổ cái biến động quỹ khuyến mãi (50 giao dịch gần nhất)"
        styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
        footer={[
          <Button key="close" type="primary" onClick={() => setLedgerOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={920}
        centered
      >
        <QueryError error={ledger.error} retry={() => void ledger.refetch()} />
        <Table<BudgetLedgerItem>
          rowKey="id"
          size="small"
          loading={ledger.isLoading}
          dataSource={ledger.data ?? []}
          pagination={{ pageSize: 8 }}
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "Thời gian",
              dataIndex: "createdAt",
              width: 155,
              render: (val: string) => date(val),
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
                  <Typography.Text strong className={isPlus ? "voucher-positive-amount" : undefined}>
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
                  <Button type="primary" icon={<PlayCircleOutlined />} loading={toggleStatus.isPending}>
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
        styles={{ body: { maxHeight: "72vh", overflowY: "auto" } }}
      >
        {activeDetail && (
          <Space orientation="vertical" size={16} style={{ width: "100%", marginTop: 8 }}>
            <div className="voucher-preview-box compact">
              <Space align="start" size={10}>
                <BellOutlined className="voucher-preview-icon" />
                <div>
                  <span className="voucher-preview-title">
                    {activeDetail.campaignTitle
                      ? `${activeDetail.campaignTitle}${activeDetail.code ? ` (${activeDetail.code})` : ""}`
                      : "Nội dung thông báo gửi khách hàng"}
                  </span>
                  <span className="voucher-preview-desc">
                    {activeDetail.description || "Không có mô tả"}
                  </span>
                </div>
              </Space>
            </div>

            {activeDetail.campaignBudgetLimit !== null && (
              <div>
                <Typography.Text strong style={{ display: "block", marginBottom: 10 }}>
                  <WalletOutlined style={{ marginRight: 6 }} />
                  Đối soát ngân sách chiến dịch
                </Typography.Text>
                <div className="voucher-detail-budget-grid">
                  <div className="voucher-detail-stat">
                    <div className="voucher-detail-stat-label">Quỹ phân bổ</div>
                    <div className="voucher-detail-stat-value">{formatMoney(detailBudgetLimit)}</div>
                  </div>

                  <div className="voucher-detail-stat">
                    <div className="voucher-detail-stat-label">Đã chi thực tế</div>
                    <div className="voucher-detail-stat-value">{formatMoney(activeDetail.campaignSpentAmount)}</div>
                  </div>

                  <div className="voucher-detail-stat warning">
                    <div className="voucher-detail-stat-label">Hoàn về quỹ tổng</div>
                    <div className="voucher-detail-stat-value">{formatMoney(activeDetail.campaignReleasedAmount)}</div>
                  </div>

                  <div className={`voucher-detail-stat ${detailRemaining > 0 ? "success" : "danger"}`}>
                    <div className="voucher-detail-stat-label">Còn lại khả dụng</div>
                    <div className="voucher-detail-stat-value">{formatMoney(detailRemaining)}</div>
                  </div>
                </div>

                <div className="voucher-progress-grid">
                  <div>
                    <div className="voucher-progress-header">
                      <Typography.Text type="secondary">Tỷ lệ dùng ngân sách (chi + giữ)</Typography.Text>
                      <Typography.Text strong>{budgetUsedPercent}%</Typography.Text>
                    </div>
                    <Progress percent={budgetUsedPercent} showInfo={false} size="small" strokeColor="var(--md-sys-color-success)" />
                  </div>
                  <div>
                    <div className="voucher-progress-header">
                      <Typography.Text type="secondary">Tỷ lệ phát suất</Typography.Text>
                      <Typography.Text strong>
                        {activeDetail.campaignClaimCount}/{activeDetail.usageLimit ?? 0} suất ({claimPercent}%)
                      </Typography.Text>
                    </div>
                    <Progress percent={claimPercent} showInfo={false} size="small" strokeColor="var(--md-sys-color-primary)" />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                Chi tiết trạng thái suất &amp; điều kiện áp dụng
              </Typography.Text>
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
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
                <Descriptions.Item label="Thời gian hiệu lực" span={{ xs: 1, sm: 2 }}>
                  {date(activeDetail.validFrom)} – {date(activeDetail.validTo)}
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
                  scroll={{ x: "max-content" }}
                  locale={{ emptyText: "Chưa có tài khoản nào nhận voucher từ chiến dịch này" }}
                  columns={[
                    {
                      title: "Khách hàng",
                      render: (_, item) => (
                        <div>
                          <Typography.Text strong>{item.fullName}</Typography.Text>
                          <Typography.Text type="secondary" className="muted" style={{ display: "block" }}>
                            ID #{item.customerId} · {item.phone}
                          </Typography.Text>
                        </div>
                      ),
                    },
                    {
                      title: "Thời điểm nhận",
                      dataIndex: "claimedAt",
                      render: (val: string) => date(val),
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