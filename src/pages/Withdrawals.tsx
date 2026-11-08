import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Descriptions, Input, Modal, Select, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link } from "react-router-dom";
import { FilterField } from "../components/FilterField";
import { DataTable, Heading, Panel, QueryError, Refresh, UpdatedAt } from "../components/common";
import { api, errorMessage } from "../lib/api";
import { date, money } from "../lib/format";
import { useFilters } from "../lib/hooks";
import type { AdminWithdrawal, WithdrawalReview, WithdrawalStatus } from "../types";

const statuses: { value: WithdrawalStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" }, { value: "SUCCESS", label: "Đã chuyển tiền" },
  { value: "REJECTED", label: "Đã từ chối" }, { value: "ALL", label: "Tất cả trạng thái" },
];
const completeBank = (item: AdminWithdrawal) => Boolean(item.bankName?.trim() && item.bankAccountNumber?.trim());

export default function Withdrawals() {
  const filters = useFilters();
  const rawStatus = filters.read("status", "PENDING");
  const status = statuses.some(item => item.value === rawStatus) ? rawStatus : "PENDING";
  const client = useQueryClient();
  const { message } = App.useApp();
  const [review, setReview] = useState<{ request: AdminWithdrawal; action: WithdrawalReview["action"] } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const sending = useRef(false);
  const query = useQuery({
    queryKey: ["admin", "withdrawals", filters.page, filters.size, status],
    queryFn: () => api.withdrawals({ page: filters.page, size: filters.size, status: status === "ALL" ? undefined : status }),
    refetchInterval: 15000, refetchOnWindowFocus: "always",
  });
  const current = query.data?.content.find(item => item.id === review?.request.id);
  const stale = Boolean(review && (!current || current.status !== "PENDING" || current.bankName !== review.request.bankName || current.bankAccountNumber !== review.request.bankAccountNumber || current.amount !== review.request.amount));
  const save = useMutation({
    mutationFn: ({ id, body }: { id: number; body: WithdrawalReview }) => api.reviewWithdrawal(id, body),
    retry: false,
    onSuccess: (_data, { body }) => {
      setReview(null);
      void message.success(body.action === "APPROVE" ? "Đã duyệt yêu cầu rút tiền." : "Đã từ chối và hoàn tiền vào ví tài xế.");
    },
    onSettled: async () => { await client.invalidateQueries({ queryKey: ["admin"] }); },
  });
  const open = (request: AdminWithdrawal, action: WithdrawalReview["action"]) => {
    sending.current = false; save.reset(); setReason(""); setConfirmed(false); setReview({ request, action });
  };
  const submit = async () => {
    if (!review || stale || query.isError || save.isPending || sending.current) return;
    if (review.action === "APPROVE" ? !confirmed || !completeBank(review.request) : !reason.trim() || reason.trim().length > 500) return;
    sending.current = true;
    try {
      await save.mutateAsync({ id: review.request.id, body: review.action === "APPROVE" ? { action: "APPROVE" } : { action: "REJECT", rejectReason: reason.trim() } });
    } catch { sending.current = false; /* Keep the form visible to inspect the refreshed result. */ }
  };
  const columns: ColumnsType<AdminWithdrawal> = [
    { title: "Yêu cầu", key: "id", width: 140, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text strong>#{item.id}</Typography.Text><Typography.Text type="secondary">{date(item.createdAt)}</Typography.Text></Space> },
    { title: "Tài xế", key: "driver", width: 190, render: (_, item) => <Space orientation="vertical" size={0}><Link to={`/drivers/${item.driverId}`}>{item.driverName || `Tài xế #${item.driverId}`}</Link><Typography.Text type="secondary">{item.driverPhoneNumber || "Chưa có số điện thoại"}</Typography.Text></Space> },
    { title: "Tài khoản nhận tiền", key: "bank", width: 240, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text>{item.bankName || "Chưa có ngân hàng"}</Typography.Text><Typography.Text copyable={item.bankAccountNumber ? { text: item.bankAccountNumber } : false}>{item.bankAccountNumber || "Chưa có số tài khoản"}</Typography.Text>{!completeBank(item) && <Typography.Text type="danger">Cần bổ sung thông tin ngân hàng</Typography.Text>}</Space> },
    { title: "Số tiền", dataIndex: "amount", width: 150, align: "right", render: value => <Typography.Text strong>{money(value)}</Typography.Text> },
    { title: "Trạng thái", key: "status", width: 210, render: (_, item) => <Space orientation="vertical" size={4}><Tag color={item.status === "SUCCESS" ? "green" : item.status === "REJECTED" ? "red" : "gold"}>{statuses.find(s => s.value === item.status)?.label ?? item.status}</Tag>{item.reviewedAt && <Typography.Text type="secondary">{date(item.reviewedAt)} · Admin #{item.reviewedBy}</Typography.Text>}{item.rejectReason && <Typography.Text>Lý do: {item.rejectReason}</Typography.Text>}</Space> },
    { title: "Thao tác", key: "actions", width: 190, render: (_, item) => item.status === "PENDING" ? <Space wrap><Button type="primary" disabled={query.isError || save.isPending || !completeBank(item)} aria-label={`Duyệt yêu cầu #${item.id}`} onClick={() => open(item, "APPROVE")}>Duyệt</Button><Button danger disabled={query.isError || save.isPending} aria-label={`Từ chối yêu cầu #${item.id}`} onClick={() => open(item, "REJECT")}>Từ chối</Button></Space> : <Typography.Text type="secondary">Đã xử lý</Typography.Text> },
  ];
  return <>
    <Heading title="Yêu cầu rút tiền" subtitle="Kiểm tra tài khoản nhận tiền và xử lý yêu cầu rút từ ví tiền mặt của tài xế." actions={<Refresh loading={query.isFetching} onClick={() => void query.refetch()} />} />
    <Panel>
      <Space wrap style={{ marginBottom: 16 }}>
        <label htmlFor="withdrawal-status" className="sr-only">Trạng thái</label>
        <FilterField label="Trạng thái">
        <Select id="withdrawal-status" aria-label="Lọc trạng thái rút tiền" value={status} options={statuses} style={{ minWidth: 190 }} disabled={Boolean(review)} onChange={value => filters.update({ status: value })} />
        </FilterField>
      </Space>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      <UpdatedAt value={query.dataUpdatedAt} fetching={query.isFetching} />
      <DataTable data={query.data} columns={columns} mobileColumns={columns} loading={query.isPending} scroll={1120} onPage={(page, size) => { if (!review) filters.update({ page, size }, false); }} />
    </Panel>
    <Modal title={review?.action === "APPROVE" ? `Duyệt yêu cầu #${review.request.id}` : `Từ chối yêu cầu #${review?.request.id}`} open={Boolean(review)}
      onCancel={() => { if (!save.isPending) setReview(null); }} closable={!save.isPending} keyboard={!save.isPending} mask={{ closable: !save.isPending }}
      footer={<Space><Button disabled={save.isPending} onClick={() => setReview(null)}>Hủy</Button><Button type="primary" danger={review?.action === "REJECT"} loading={save.isPending}
        disabled={stale || query.isError || (review?.action === "APPROVE" ? !confirmed || !completeBank(review.request) : !reason.trim() || reason.trim().length > 500)} onClick={() => void submit()}>{review?.action === "APPROVE" ? "Xác nhận đã chuyển tiền" : "Từ chối và hoàn tiền"}</Button></Space>}>
      {review && <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Descriptions column={1} size="small" items={[
          { key: "driver", label: "Tài xế", children: review.request.driverName || `#${review.request.driverId}` },
          { key: "bank", label: "Ngân hàng", children: review.request.bankName || "Chưa cung cấp" },
          { key: "account", label: "Số tài khoản", children: review.request.bankAccountNumber || "Chưa cung cấp" },
          { key: "amount", label: "Số tiền", children: <Typography.Text strong>{money(review.request.amount)}</Typography.Text> },
        ]} />
        {stale && <Alert type="warning" showIcon title="Yêu cầu hoặc thông tin ngân hàng đã thay đổi. Đóng hộp thoại và kiểm tra lại danh sách trước khi xử lý." />}
        {save.error && <Alert type="error" showIcon title={errorMessage(save.error)} />}
        {review.action === "APPROVE" ? <>
          <Alert type="info" showIcon title="Chuyển khoản bên ngoài trước khi duyệt" description="Ứng dụng chỉ ghi nhận kết quả. Hãy đối chiếu người nhận và chuyển đúng số tiền bằng ứng dụng ngân hàng." />
          <Checkbox checked={confirmed} disabled={save.isPending} onChange={event => setConfirmed(event.target.checked)}>Tôi đã chuyển khoản thành công cho tài xế.</Checkbox>
        </> : <>
          <Alert type="info" showIcon title="Tiền đã giữ sẽ được hoàn về ví tiền mặt của tài xế khi từ chối." />
          <label htmlFor="withdrawal-reason">Lý do từ chối (bắt buộc)</label>
          <Input.TextArea id="withdrawal-reason" value={reason} maxLength={500} showCount rows={3} disabled={save.isPending} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: Số tài khoản ngân hàng không hợp lệ" />
        </>}
      </Space>}
    </Modal>
  </>;
}
