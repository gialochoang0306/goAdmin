import { ImageViewer } from "../components/ImageViewer";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftOutlined, PictureOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Input,
  Select,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { Link, useLocation, useParams } from "react-router-dom";
import { SearchDateFields, listSearch } from "../components/SearchDateFields";
import { FilterField } from "../components/FilterField";
import { FilterSelect } from "../components/FilterSelect";
import { DataTable, Heading, InvalidRecord, Loading, Panel, Photo, QueryError, Refresh } from "../components/common";
import { api, errorMessage } from "../lib/api";
import { uploadSupportImage } from "../lib/upload";
import { date, label, safeImage } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { TicketDetail, TicketMessage, TicketStatus, TicketSummary } from "../types";

const listKey = ["admin", "tickets", "list"] as const;
const detailKey = (id: number) => ["admin", "tickets", "detail", id] as const;


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
  const rawStatus = filters.read("status");
  const status = rawStatus ? rawStatus as TicketStatus : undefined;
  const search = listSearch(filters);
  const ownerRole = filters.read("ownerRole");
  const category = filters.read("category");
  const params = { ...filters.params, ...search.params, ownerRole, category };
  const query = useQuery({
    queryKey: [...listKey, filters.page, status, params],
    queryFn: () => api.tickets(filters.page, status, params),
    enabled: !search.error,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
  });
  const location = useLocation();
  const columns: TableColumnsType<TicketSummary> = [
    {
      title: "Ticket",
      key: "code",
      width: 110,
      render: (_, ticket) => (
        <Link to={{ pathname: `/tickets/${ticket.id}`, search: location.search }}>
          {ticket.code}
        </Link>
      ),
    },
    {
      title: "Người tạo",
      key: "owner",
      width: 210,
      render: (_, ticket) => (
        <div>
          <div>{ticket.ownerName ?? "—"}</div>
          <Typography.Text type="secondary">{ticket.ownerPhoneNumber ?? "—"}</Typography.Text>
        </div>
      ),
    },
    { title: "Vai trò", key: "role", width: 120, render: (_, ticket) => label(ticket.ownerRole) },
    { title: "Chủ đề", key: "category", width: 140, render: (_, ticket) => categories[ticket.category] ?? ticket.category },
    { title: "Trạng thái", key: "status", width: 150, render: (_, ticket) => <TicketStatusTag status={ticket.status} /> },
    { title: "Cập nhật", key: "updatedAt", width: 150, render: (_, ticket) => date(ticket.updatedAt) },
  ];
  return (
    <>
      <Heading
        title="Hỗ trợ"
        subtitle="Hội thoại CSKH hai chiều; ticket tự chuyển trạng thái khi khách phản hồi."
        actions={<Refresh loading={query.isFetching} disabled={!!search.error} onClick={() => void query.refetch()} />}
      />
      <div className="filters">
        <SearchDateFields filters={filters} label="Tìm yêu cầu hỗ trợ" placeholder="Mã HT-, mã chuyến, tên hoặc SĐT" />
        <FilterField label="Vai trò người gửi"><FilterSelect aria-label="Vai trò người gửi" allLabel="Tất cả vai trò" value={ownerRole}
          options={[{value:"CUSTOMER",label:"Khách hàng"},{value:"DRIVER",label:"Tài xế"}]} onChange={ownerRole => filters.update({ownerRole})} /></FilterField>
        <FilterField label="Chủ đề hỗ trợ"><FilterSelect aria-label="Chủ đề hỗ trợ" allLabel="Tất cả chủ đề" value={category}
          options={Object.entries(categories).map(([value,label])=>({value,label}))} onChange={category => filters.update({category})} /></FilterField>
        <FilterField label="Trạng thái">
          <FilterSelect
            aria-label="Lọc trạng thái ticket"
            allLabel="Tất cả trạng thái"
            options={statusOptions}
            value={status ?? ""}
            onChange={value => filters.update({ status: value })}
          />
        </FilterField>
        <Button className="filter-reset" onClick={filters.reset}>Xóa bộ lọc</Button>
      </div>
      {search.error && <Alert className="query-error" type="warning" showIcon title={search.error} />}
      <QueryError error={search.error ? null : query.error} retry={() => void query.refetch()} />
      <Panel>
        <DataTable<TicketSummary>
          data={search.error ? undefined : query.data}
          columns={columns}
          loading={!search.error && query.isFetching}
          onPage={(page, size) => filters.update({ page, size }, false)}
          scroll={880}
        />
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [history, setHistory] = useState<{ ticketId: number; messages: TicketMessage[]; hasMore: boolean }>();
  const prior = history?.ticketId === id ? history : undefined;
  const timeline = Array.from(new Map([
    ...(prior?.messages ?? []), ...(detail?.messages ?? []),
  ].map(message => [message.id, message])).values());
  const loadOlder = useMutation({
    mutationFn: (beforeId: number) => api.ticketMessages(id, beforeId),
    onSuccess: page => {
      const visibleIds = new Set(timeline.map(message => message.id));
      const previous = page.filter(message => !visibleIds.has(message.id));
      setHistory({ ticketId: id, messages: [...previous, ...timeline], hasMore: previous.length === 100 });
    },
  });
  const pending = useRef<{
    key: string; ticketId: number; body: string; status: TicketStatus; file: File | null; imageUrl?: string;
  } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseImage = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const send = useMutation({
    mutationFn: async () => {
      const body = reply.trim();
      const requestedStatus = status ?? ticket!.status;
      const previous = pending.current;
      const draft: NonNullable<typeof pending.current> = previous && previous.ticketId === id && previous.body === body &&
        (status == null || previous.status === requestedStatus) && previous.file === imageFile
        ? previous
        : { key: crypto.randomUUID(), ticketId: id, body, status: requestedStatus, file: imageFile };
      pending.current = draft;
      if (draft.file && !draft.imageUrl) draft.imageUrl = await uploadSupportImage(draft.file);
      return api.sendTicketMessage(id, {
        body: draft.body, status: draft.status, imageUrl: draft.imageUrl, clientMessageId: draft.key,
      });
    },
    onSuccess: (message: TicketMessage) => {
      pending.current = null;
      setReply("");
      chooseImage(null);
      client.setQueryData<TicketDetail>(detailKey(id), current => current && !current.messages.some(item => item.id === message.id) ? {
        ...current,
        messages: [...current.messages, message],
      } : current);
      void client.invalidateQueries({ queryKey: detailKey(id) });
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
            title={`Hỗ trợ · ${ticket.code}`}
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
              {loadOlder.error ? <Alert className="query-error" type="error" showIcon title={errorMessage(loadOlder.error)} /> : null}
              {timeline.length ? (
                <div className="ticket-chat" role="log" aria-label="Lịch sử tin nhắn hỗ trợ">
                  {(prior?.hasMore ?? detail.hasOlderMessages) ? (
                    <Button loading={loadOlder.isPending} onClick={() => loadOlder.mutate(timeline[0].id)}>
                      Tải tin nhắn cũ hơn
                    </Button>
                  ) : null}
                  {timeline.map(message => {
                    const msgImage = safeImage(message.imageUrl);
                    return (
                      <div key={message.id} className={`ticket-bubble ${message.senderRole === "ADMIN" ? "admin" : "user"}`}>
                        {msgImage ? (
                          <ImageViewer
                            src={msgImage}
                            alt="Ảnh trong hội thoại hỗ trợ"
                            width={220}
                            style={{ borderRadius: 8 }}
                          />
                        ) : null}
                        {message.body.trim() ? <Typography.Text>{message.body}</Typography.Text> : null}
                        <div className="ticket-meta">
                          {message.senderRole === "ADMIN" ? "CSKH" : label(ticket.ownerRole)} · {date(message.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tin nhắn" />}
              <div className="ticket-composer">
                <div className="ticket-composer-field">
                  <label className="filter-label" htmlFor="ticket-status-select">
                    Trạng thái sau phản hồi
                  </label>
                  <Select
                    id="ticket-status-select"
                    aria-label="Cập nhật trạng thái ticket"
                    options={statusOptions}
                    value={status ?? ticket.status}
                    onChange={(value: TicketStatus) => setStatus(value)}
                    style={{ maxWidth: 240 }}
                  />
                </div>
                <div className="ticket-composer-field">
                  <label className="filter-label" htmlFor="ticket-reply-input">
                    Nội dung phản hồi
                  </label>
                  <Input.TextArea
                    id="ticket-reply-input"
                    aria-label="Nội dung phản hồi"
                    value={reply}
                    onChange={event => setReply(event.target.value)}
                    placeholder="Nhập câu trả lời cho người dùng…"
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    maxLength={4000}
                    showCount
                  />
                </div>
                {imagePreview ? (
                  <div className="ticket-image-preview">
                    <ImageViewer src={imagePreview} alt="Ảnh sẽ gửi" width={72} />
                    <Button size="small" onClick={() => chooseImage(null)}>Xóa ảnh</Button>
                  </div>
                ) : null}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null;
                    chooseImage(file);
                    event.target.value = "";
                  }}
                />
                <div className="ticket-send-actions">
                  <Button icon={<PictureOutlined />} onClick={() => fileInput.current?.click()} disabled={send.isPending}>
                    Đính kèm ảnh
                  </Button>
                  <Button
                    type="primary"
                    loading={send.isPending}
                    disabled={send.isPending || (!reply.trim() && !imageFile)}
                    onClick={() => send.mutate()}
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
