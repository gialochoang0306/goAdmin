import { useRef, useState } from "react";
import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { Alert, App, Button, Checkbox, Descriptions, Input, Modal, Space, Typography } from "antd";
import { api, errorMessage } from "../lib/api";
import { money } from "../lib/format";
import type { AdminWithdrawal, Page, WithdrawalReview } from "../types";

export type WithdrawalReviewTarget = { request: AdminWithdrawal; action: WithdrawalReview["action"] };

export const completeBank = (item: AdminWithdrawal) => Boolean(item.bankName?.trim() && item.bankAccountNumber?.trim());

export function WithdrawalReviewDialog({ target, query, onClose, onCompleted }: {
  target: WithdrawalReviewTarget;
  query: UseQueryResult<Page<AdminWithdrawal>>;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const { request, action } = target;
  const approving = action === "APPROVE";
  const client = useQueryClient();
  const { message } = App.useApp();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const sending = useRef(false);
  const current = query.data?.content.find(item => item.id === request.id);
  const stale = !current || current.status !== "PENDING" || current.amount !== request.amount
    || current.bankName !== request.bankName || current.bankAccountNumber !== request.bankAccountNumber;
  const save = useMutation({
    mutationFn: (body: WithdrawalReview) => api.reviewWithdrawal(request.id, body),
    retry: false,
    onSettled: () => client.invalidateQueries({ queryKey: ["admin"] }),
  });
  const trimmedReason = reason.trim();
  const invalid = approving ? !confirmed || !completeBank(request) : !trimmedReason || trimmedReason.length > 500;
  const blocked = stale || query.isError || query.isFetching || invalid;
  const close = () => { if (!sending.current) onClose(); };

  const submit = async () => {
    if (blocked || save.isPending || sending.current) return;
    sending.current = true;
    try {
      await save.mutateAsync(approving ? { action } : { action, rejectReason: trimmedReason });
      onClose();
      onCompleted?.();
      void message.success(approving ? "Đã duyệt yêu cầu rút tiền." : "Đã từ chối và hoàn tiền vào ví tài xế.");
    } catch {
      sending.current = false;
    }
  };

  return (
    <Modal
      title={approving ? `Duyệt yêu cầu #${request.id}` : `Từ chối yêu cầu #${request.id}`}
      open
      onCancel={close}
      closable={!save.isPending}
      keyboard={!save.isPending}
      mask={{ closable: !save.isPending }}
      footer={
        <Space>
          <Button disabled={save.isPending} onClick={close}>Hủy</Button>
          <Button type="primary" danger={!approving} loading={save.isPending} disabled={blocked} onClick={() => void submit()}>
            {approving ? "Xác nhận đã chuyển tiền" : "Từ chối và hoàn tiền"}
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Descriptions column={1} size="small" items={[
          { key: "driver", label: "Tài xế", children: request.driverName || `#${request.driverId}` },
          { key: "bank", label: "Ngân hàng", children: request.bankName || "Chưa cung cấp" },
          { key: "account", label: "Số tài khoản", children: request.bankAccountNumber || "Chưa cung cấp" },
          { key: "amount", label: "Số tiền", children: <Typography.Text strong>{money(request.amount)}</Typography.Text> },
        ]} />
        {stale && <Alert type="warning" showIcon title="Yêu cầu hoặc thông tin ngân hàng đã thay đổi. Đóng hộp thoại và kiểm tra lại danh sách trước khi xử lý." />}
        {query.isError && <Alert type="error" showIcon title="Chưa xác minh được trạng thái yêu cầu. Hãy đóng hộp thoại và làm mới hàng chờ." />}
        {save.error && <Alert type="error" showIcon title={errorMessage(save.error)} />}
        {approving ? (
          <>
            <Alert type="info" showIcon title="Chuyển khoản bên ngoài trước khi duyệt" description="Ứng dụng chỉ ghi nhận kết quả. Hãy đối chiếu người nhận và chuyển đúng số tiền bằng ứng dụng ngân hàng." />
            <Checkbox checked={confirmed} disabled={save.isPending} onChange={event => setConfirmed(event.target.checked)}>Tôi đã chuyển khoản thành công cho tài xế.</Checkbox>
          </>
        ) : (
          <>
            <Alert type="info" showIcon title="Tiền đã giữ sẽ được hoàn về ví tiền mặt của tài xế khi từ chối." />
            <label htmlFor="withdrawal-reason">Lý do từ chối (bắt buộc)</label>
            <Input.TextArea id="withdrawal-reason" value={reason} maxLength={500} showCount rows={3} disabled={save.isPending} onChange={event => setReason(event.target.value)} placeholder="Ví dụ: Số tài khoản ngân hàng không hợp lệ" />
          </>
        )}
      </Space>
    </Modal>
  );
}
