import { Modal } from "antd";
import { useId } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

// useBlocker handles in-app history; beforeunload covers reload/tab closing.
// https://reactrouter.com/api/hooks/useBlocker
export function UnsavedReviewGuard({ dirty, pending }: { dirty: boolean; pending: boolean }) {
  const titleId = useId();
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) =>
    (dirty || pending) && (currentLocation.pathname !== nextLocation.pathname || historyAction === "POP"));
  useBeforeUnload(event => { if (dirty || pending) event.preventDefault(); });
  return <Modal open={blocker.state === "blocked"}
    aria-labelledby={titleId}
    title={<span id={titleId}>Rời hồ sơ đang chỉnh sửa?</span>}
    okText="Bỏ thay đổi và rời hồ sơ" cancelText="Ở lại hồ sơ"
    okButtonProps={{ danger: true, disabled: pending }}
    onOk={() => blocker.proceed?.()} onCancel={() => blocker.reset?.()}>
    {pending ? "Đang lưu kết quả. Vui lòng chờ trước khi rời hồ sơ." : "Nội dung chưa lưu sẽ bị mất khi rời hồ sơ này."}
  </Modal>;
}
