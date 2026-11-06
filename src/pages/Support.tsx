import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Descriptions, Empty, Form, Input, Select, Space, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { Link, useLocation, useParams } from "react-router-dom";
import { FilterField } from "../components/FilterField";
import { Heading, InvalidRecord, Loading, Panel, Photo, QueryError, Refresh } from "../components/common";
import { api, errorMessage } from "../lib/api";
import { date, label } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { SupportTicket, SupportTicketStatus, SupportTicketUpdate } from "../types";

const listKey = ["admin", "support-tickets", "list"] as const;
const detailKey = (id: number) => ["admin", "support-tickets", "detail", id] as const;
const pageSize = 20;
const maxPage = 10_000;
const responseLimit = 4_000;
const statusInfo = {
  OPEN: { label: "Mới", color: "gold" },
  IN_PROGRESS: { label: "Đang xử lý", color: "blue" },
  RESOLVED: { label: "Đã giải quyết", color: "green" },
} satisfies Record<SupportTicketStatus, { label: string; color: string }>;
const statuses = Object.entries(statusInfo).map(([value, { label }]) => ({ value, label }));
const categories: Record<string, string> = {
  TRIP: "Chuyến đi",
  PAYMENT: "Thanh toán",
  HANDOVER: "Bàn giao",
  ACCOUNT: "Tài khoản",
  OTHER: "Khác",
};

function TicketStatus({ status }: { status: SupportTicketStatus }) {
  return <Tag color={statusInfo[status]?.color}>{statusInfo[status]?.label ?? status}</Tag>;
}

export function Support() {
  const filters = useFilters();
  const page = Math.min(filters.page, maxPage);
  const rawStatus = filters.read("status");
  const status = statuses.some((item) => item.value === rawStatus) ? rawStatus as SupportTicketStatus : undefined;
  const location = useLocation();
  const query = useQuery({
    queryKey: [...listKey, page, status],
    queryFn: () => api.supportTickets(page, status),
  });
  const columns: TableColumnsType<SupportTicket> = [
    {
      title: "Mã yêu cầu",
      key: "code",
      render: (_, ticket) => (
        <Link to={{ pathname: `/support/${ticket.id}`, search: location.search }}>
          {ticket.code}
        </Link>
      ),
    },
    { title: "Chủ đề", key: "category", render: (_, ticket) => categories[ticket.category] ?? ticket.category },
    { title: "Trạng thái", key: "status", render: (_, ticket) => <TicketStatus status={ticket.status} /> },
    { title: "Người gửi", key: "owner", responsive: ["sm"], render: (_, ticket) => `${label(ticket.ownerRole)} #${ticket.ownerId}` },
    { title: "Ngày gửi", key: "createdAt", responsive: ["md"], render: (_, ticket) => date(ticket.createdAt) },
  ];
  const tickets = query.data ?? [];

  return (
    <>
      <Heading
        title="Yêu cầu hỗ trợ"
        subtitle="Tiếp nhận và phản hồi yêu cầu từ khách hàng và tài xế."
        actions={<Refresh loading={query.isFetching} onClick={() => void query.refetch()} />}
      />
      <Panel>
        <div className="support-list-controls">
          <FilterField label="Trạng thái">
            <Select
              aria-label="Lọc trạng thái"
              options={[{ value: "", label: "Tất cả trạng thái" }, ...statuses]}
              value={status ?? ""}
              onChange={(value) => filters.update({ status: value })}
            />
          </FilterField>
        </div>
        <QueryError error={query.error} retry={() => void query.refetch()} />
        <Table<SupportTicket>
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={query.isFetching}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={query.isPending ? "Đang tải dữ liệu…" : query.isError ? "Chưa tải được dữ liệu" : "Không có dữ liệu phù hợp"}
              />
            ),
          }}
        />
        <nav aria-label="Phân trang yêu cầu hỗ trợ" className="support-pagination">
          <Space wrap>
            <Button disabled={page === 0 || query.isFetching} onClick={() => filters.update({ page: page > 1 ? page - 1 : null }, false)}>
              Trang trước
            </Button>
            <Typography.Text type="secondary" aria-live="polite">Trang {page + 1}</Typography.Text>
            <Button
              disabled={query.isFetching || query.isError || tickets.length < pageSize || page === maxPage}
              onClick={() => filters.update({ page: page + 1 }, false)}
            >
              Trang sau
            </Button>
          </Space>
        </nav>
      </Panel>
    </>
  );
}

function TicketEditor({ ticket }: { ticket: SupportTicket }) {
  const client = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<SupportTicketUpdate>();
  const status = Form.useWatch("status", form) ?? ticket.status;
  const save = useMutation({
    mutationFn: (update: SupportTicketUpdate) => api.updateSupportTicket(ticket.id, update),
    onSuccess: async (updated) => {
      client.setQueryData(detailKey(ticket.id), updated);
      form.setFieldsValue({ status: updated.status, response: updated.response ?? "" });
      await client.invalidateQueries({ queryKey: listKey });
      void message.success(`Đã cập nhật yêu cầu ${updated.code}.`);
    },
    retry: false,
  });

  return (
    <Panel title="Xử lý yêu cầu">
      {save.error && <Alert className="query-error" type="error" showIcon title={errorMessage(save.error)} />}
      <Form<SupportTicketUpdate>
        form={form}
        layout="vertical"
        disabled={save.isPending}
        initialValues={{ status: ticket.status, response: ticket.response ?? "" }}
        onFinish={({ status, response }) => {
          if (!save.isPending) save.mutate({ status, response: response?.trim() || null });
        }}
      >
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
          <Select options={statuses} />
        </Form.Item>
        <Form.Item
          name="response"
          label="Phản hồi"
          required={status === "RESOLVED"}
          dependencies={["status"]}
          rules={[
            { max: responseLimit, message: "Phản hồi tối đa 4.000 ký tự." },
            ({ getFieldValue }) => ({
              validator: (_, value: string | undefined) =>
                getFieldValue("status") === "RESOLVED" && !value?.trim()
                  ? Promise.reject(new Error("Nhập phản hồi trước khi đóng yêu cầu."))
                  : Promise.resolve(),
            }),
          ]}
        >
          <Input.TextArea rows={5} maxLength={responseLimit} showCount placeholder="Nhập nội dung trả lời người gửi" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={save.isPending}>Lưu cập nhật</Button>
      </Form>
    </Panel>
  );
}

export function SupportDetail() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const location = useLocation();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => api.supportTicket(id),
    enabled: valid,
    refetchOnWindowFocus: false,
  });
  const ticket = query.data;

  return (
    <>
      <Link className="back-link" to={{ pathname: "/support", search: location.search }}>
        <ArrowLeftOutlined aria-hidden /> Quay lại danh sách
      </Link>
      {!valid ? <InvalidRecord /> : query.isPending ? <Loading /> : !ticket ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Heading title={`Yêu cầu ${ticket.code}`} actions={<TicketStatus status={ticket.status} />} />
          <div className="detail-grid">
            <Panel title="Nội dung yêu cầu">
              <Descriptions column={{ xs: 1, md: 1, xl: 2 }} items={[
                { key: "category", label: "Chủ đề", children: categories[ticket.category] ?? ticket.category },
                { key: "owner", label: "Người gửi", children: `${label(ticket.ownerRole)} #${ticket.ownerId}` },
                { key: "created", label: "Ngày gửi", children: date(ticket.createdAt) },
                { key: "updated", label: "Cập nhật", children: date(ticket.updatedAt) },
                {
                  key: "ride",
                  label: "Chuyến liên quan",
                  children: ticket.rideId == null ? "—" : (
                    <Link to={`/rides/${ticket.rideId}`} state={{ from: location.pathname + location.search }}>
                      Chuyến #{ticket.rideId}
                    </Link>
                  ),
                },
              ]} />
              <Typography.Paragraph className="support-description">{ticket.description}</Typography.Paragraph>
              {ticket.images.length > 0 && (
                <>
                  <Typography.Text strong>Ảnh đính kèm</Typography.Text>
                  <div className="photo-grid">
                    {ticket.images.map((image, index) => (
                      <Photo key={`${image.publicId}-${index}`} url={image.fileUrl} alt={`Ảnh đính kèm ${index + 1}`} />
                    ))}
                  </div>
                </>
              )}
            </Panel>
            <TicketEditor key={ticket.id} ticket={ticket} />
          </div>
        </>
      )}
    </>
  );
}
