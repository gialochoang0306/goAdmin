import { useEffect, useRef, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FilterField } from "../components/FilterField";
import { Heading, InvalidRecord, Loading, Panel, Photo, QueryError, Refresh } from "../components/common";
import { api, errorMessage } from "../lib/api";
import { date, label } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { TicketDetail, TicketMessage, TicketStatus, TicketSummary } from "../types";

const listKey = ["admin", "tickets", "list"] as const;
const detailKey = (id: number) => ["admin", "tickets", "detail", id] as const;
const pageSize = 20;

const statusInfo: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: "Mới", color: "gold" },
  IN_PROGRESS: { label: "Đang xử lý", color: "blue" },
  WAITING_FOR_USER: { label: "Chờ khách", color: "orange" },
  RESOLVED: { label: "Đã giải quyết", color: "green" },
  CLOSED: { label: "Đã đóng", color: "default" },
};
const statusOptions: { value: TicketStatus; label: string }[] =
  (Object.keys(statusInfo) as TicketStatus[]).map(value => ({ value, label: statusInfo[value].label }));
const categories: Record<string, string> = {
  TRIP: "Chuyến đi",
  PAYMENT: "Thanh toán",
  HANDOVER: "Bàn giao xe",
  ACCOUNT: "Tài khoản",
  OTHER: "Vấn đề khác",
};

function TicketStatusTag({ status }: { status: TicketStatus }) {
  const info = statusInfo[status];
  return <Tag color={info?.color}>{info?.label ?? status}</Tag>;
}

export function Tickets() {
  const filters = useFilters();
  const page = filters.page;
  const rawStatus = filters.read("status");
  const status = rawStatus && rawStatus in statusInfo ? rawStatus as TicketStatus : undefined;
  const query = useQuery({
    queryKey: [...listKey, page, status],
    queryFn: () => api.tickets(page, status),
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const columns: TableColumnsType<TicketSummary> = [
    {
      title: "Ticket",
      key: "code",
      render: (_, ticket) => (
        <Link to={{ pathname: `/tickets/${ticket.id}`, search: location.search }} onClick={event => event.stopPropagation()}>{ticket.code}</Link>
      ),
    },
    {
      title: "Người tạo",
      key: "owner",
      render: (_, ticket) => (
        <div>
          <div>{ticket.ownerName ?? "—"}</div>
          <Typography.Text type="secondary">{ticket.ownerPhoneNumber ?? "—"}</Typography.Text>
        </div>
      ),
    },
    { title: "Vai trò", key: "role", render: (_, ticket) => label(ticket.ownerRole) },
    { title: "Chủ đề", key: "category", render: (_, ticket) => categories[ticket.category] ?? ticket.category },
    { title: "Trạng thái", key: "status", render: (_, ticket) => <TicketStatusTag status={ticket.status} /> },
    { title: "Cập nhật", key: "updatedAt", render: (_, ticket) => date(ticket.updatedAt) },
  ];
  const rows = query.data?.content ?? [];
  return (
    <>
      <Heading
        title="Ticket hỗ trợ"
        subtitle="Hội thoại CSKH hai chiều; ticket tự chuyển trạng thái khi khách phản hồi."
        actions={<Refresh loading={query.isFetching} onClick={() => void query.refetch()} />}
      />
      <Panel>
        <div className="support-list-controls">
          <FilterField label="Trạng thái">
            <Select
              aria-label="Lọc trạng thái ticket"
              options={[{ value: "", label: "Tất cả trạng thái" }, ...statusOptions]}
              value={status ?? ""}
              onChange={value => filters.update({ status: value })}
            />
          </FilterField>
        </div>
        <QueryError error={query.error} retry={() => void query.refetch()} />
        <Table<TicketSummary>
          columns={columns}
          dataSource={rows}
          rowKey="id"
          loading={query.isFetching}
          pagination={false}
          onRow={ticket => ({ onClick: () => navigate({ pathname: `/tickets/${ticket.id}`, search: location.search }) })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={query.isPending ? "Đang tải dữ liệu…" : query.isError ? "Chưa tải được dữ liệu" : "Không có ticket phù hợp"}
              />
            ),
          }}
        />
        <div className="support-pagination">
          <Pagination
            current={page + 1}
            pageSize={pageSize}
            total={query.data?.totalElements ?? 0}
            showSizeChanger={false}
            onChange={next => filters.update({ page: next - 1 }, false)}
          />
        </div>
      </Panel>
    </>
  );
}

export function TicketDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isSafeInteger(id) && id > 0;
  const client = useQueryClient();
  const location = useLocation();
  const query = useQuery({
    queryKey: detailKey(id),
    queryFn: () => api.ticket(id),
    enabled: valid,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
  });
  const claim = useMutation({
    mutationFn: () => api.claimTicket(id),
    onSuccess: data => client.setQueryData(detailKey(id), data),
  });
  const claimed = useRef(false);
  useEffect(() => {
    if (!valid || claimed.current) return;
    claimed.current = true;
    claim.mutate();
    // Router param đã đổi thì component được remount; chỉ claim một lần cho mỗi ticket.
  }, [valid, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const detail = query.data;
  const ticket = detail?.ticket;
  const [status, setStatus] = useState<TicketStatus>();
  const [reply, setReply] = useState("");

  const send = useMutation({
    mutationFn: () => api.sendTicketMessage(id, { body: reply.trim(), status: status ?? ticket!.status }),
    onSuccess: (message: TicketMessage) => {
      setReply("");
      client.setQueryData<TicketDetail>(detailKey(id), current => current ? {
        ...current,
        ticket: { ...current.ticket, status: status ?? current.ticket.status, updatedAt: message.createdAt },
        messages: [...current.messages.filter(item => item.id !== message.id), message],
      } : current);
      void client.invalidateQueries({ queryKey: listKey });
    },
  });

  return (
    <>
      <Link className="back-link" to={{ pathname: "/tickets", search: location.search }}>
        <ArrowLeftOutlined aria-hidden /> Quay lại danh sách
      </Link>
      {!valid ? <InvalidRecord /> : query.isPending ? <Loading /> : !detail || !ticket ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <Heading
            title={`Ticket ${ticket.code}`}
            actions={<><TicketStatusTag status={ticket.status} /><Refresh loading={query.isFetching} onClick={() => void query.refetch()} /></>}
          />
          <QueryError error={query.error} retry={() => void query.refetch()} />
          {claim.error ? <Alert className="query-error" type="warning" showIcon title={errorMessage(claim.error)} /> : null}
          {send.error ? <Alert className="query-error" type="error" showIcon title={errorMessage(send.error)} /> : null}
          <div className="detail-grid">
            <Panel title="Thông tin yêu cầu">
              <Descriptions column={1} items={[
                { key: "owner", label: "Người gửi", children: ticket.ownerName ?? "—" },
                { key: "phone", label: "Số điện thoại", children: ticket.ownerPhoneNumber ?? "—" },
                { key: "role", label: "Vai trò", children: label(ticket.ownerRole) },
                { key: "category", label: "Chủ đề", children: categories[ticket.category] ?? ticket.category },
                {
                  key: "ride",
                  label: "Chuyến liên quan",
                  children: ticket.rideId == null ? "—" : (
                    <Link to={`/rides/${ticket.rideId}`} state={{ from: location.pathname + location.search }}>
                      Chuyến #{ticket.rideId}
                    </Link>
                  ),
                },
                { key: "status", label: "Trạng thái", children: <TicketStatusTag status={ticket.status} /> },
                { key: "created", label: "Ngày tạo", children: date(ticket.createdAt) },
                { key: "updated", label: "Cập nhật", children: date(ticket.updatedAt) },
              ]} />
              <Typography.Title level={5}>Nội dung ban đầu</Typography.Title>
              <Typography.Paragraph className="support-description">{detail.description}</Typography.Paragraph>
              {detail.images.length > 0 && (
                <>
                  <Typography.Text strong>Ảnh đính kèm</Typography.Text>
                  <div className="photo-grid">
                    {detail.images.map((image, index) => (
                      <Photo key={`${image.publicId}-${index}`} url={image.fileUrl} alt={`Ảnh đính kèm ${index + 1}`} />
                    ))}
                  </div>
                </>
              )}
            </Panel>
            <Panel title="Hội thoại & xử lý" extra={claim.isPending ? <Typography.Text type="secondary">Đang nhận ticket…</Typography.Text> : null}>
              {detail.messages.length ? (
                <div className="ticket-chat" role="log" aria-label="Lịch sử tin nhắn hỗ trợ">
                  {detail.messages.map(message => (
                    <div key={message.id} className={`ticket-bubble ${message.senderRole === "ADMIN" ? "admin" : "user"}`}>
                      <Typography.Text>{message.body}</Typography.Text>
                      <div className="ticket-meta">
                        {message.senderRole === "ADMIN" ? "CSKH" : label(ticket.ownerRole)} · {date(message.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tin nhắn" />}
              <div className="ticket-composer">
                <Select
                  aria-label="Cập nhật trạng thái ticket"
                  options={statusOptions}
                  value={status ?? ticket.status}
                  onChange={(value: TicketStatus) => setStatus(value)}
                  style={{ maxWidth: 240 }}
                />
                <Input.TextArea
                  aria-label="Nội dung phản hồi"
                  value={reply}
                  onChange={event => setReply(event.target.value)}
                  placeholder="Nhập câu trả lời cho người dùng…"
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  maxLength={4000}
                  showCount
                />
                <Button
                  type="primary"
                  loading={send.isPending}
                  disabled={send.isPending || !reply.trim()}
                  onClick={() => send.mutate()}
                >
                  Gửi phản hồi
                </Button>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
