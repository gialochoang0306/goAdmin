import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { App, Alert, Button, Drawer, Space, Tag, Typography } from "antd";
import { api } from "../lib/api";
import { date, label, text } from "../lib/format";
import { useAction } from "../lib/hooks";
import { Loading, Photo, QueryError, Refresh, Status } from "../components/common";
import type { DriverApplication } from "./documentApplications";
import { DriverReviewForm, type ReviewDecision } from "./DriverReviewForm";
import { UnsavedReviewGuard } from "../components/UnsavedReviewGuard";

export function DriverDocumentsDrawer({
  application, initialDocumentId, onClose,
}: {
  application: Pick<DriverApplication, "id" | "driverName" | "driverPhone">;
  initialDocumentId?: number;
  onClose: () => void;
}) {
  const [reviewId, setReviewId] = useState(initialDocumentId);
  const [paperDirty, setPaperDirty] = useState(false);
  const [accountDirty, setAccountDirty] = useState(false);
  const dirty = paperDirty || accountDirty;
  const { modal } = App.useApp();
  const discardThen = (action: () => void, all = false) => {
    if (!(all ? dirty : paperDirty)) { action(); return; }
    modal.confirm({ title: "Bỏ thay đổi chưa lưu?", content: "Nội dung đang nhập sẽ không được lưu.", okText: "Bỏ thay đổi", cancelText: "Tiếp tục chỉnh sửa", okButtonProps: { danger: true }, onOk: () => { setPaperDirty(false); if (all) setAccountDirty(false); action(); } });
  };
  const query = useQuery({
    queryKey: ["admin", "driver", application.id],
    queryFn: () => api.driver(application.id),
  });
  const documents = query.data?.documents.filter(document => document.isCurrent) ?? [];
  const verify = useAction((values: ReviewDecision) =>
    api.verifyDriver(application.id, values.status, values.rejectionReason),
    () => setAccountDirty(false), values => `${values.status === "APPROVED" ? "Đã duyệt" : "Đã từ chối"} tài khoản tài xế #${application.id}.`,
  );
  const paper = useAction((values: ReviewDecision & { id: number; next?: boolean }) =>
    api.review(values.id, values.status, values.rejectionReason),
    values => {
      const next = values.next ? documents.find(doc => doc.id !== values.id && doc.verificationStatus === "PENDING") : undefined;
      setPaperDirty(false); setReviewId(next?.id); verify.reset();
      if (next) requestAnimationFrame(() => {
        const element = document.getElementById(`review-document-${next.id}`);
        element?.scrollIntoView({ block: "nearest" });
        element?.querySelector<HTMLButtonElement>("button")?.focus();
      });
    }, values => `Đã ${values.status === "APPROVED" ? "duyệt" : "từ chối"} giấy tờ #${values.id}.`,
  );
  const skill = useAction((values: { id: number; verified: boolean }) =>
    api.verifySkill(values.id, values.verified),
    undefined, values => `${values.verified ? "Đã xác minh" : "Đã bỏ xác minh"} kỹ năng #${values.id}.`,
  );
  const busy = verify.isPending || paper.isPending || skill.isPending;
  const blocked = busy || query.isFetching || query.isError;
  const required = query.data?.requiredDocumentTypes;
  const missing = required?.filter(type => !documents.some(doc => doc.documentType === type && doc.verificationStatus === "APPROVED"));
  const approvalBlockedReason = missing?.length ? `Chưa thể duyệt: ${missing.map(label).join(", ")} chưa được duyệt hoặc chưa được gửi.` : undefined;
  const titleId = `driver-review-title-${application.id}`;
  return (
    <>
    <UnsavedReviewGuard dirty={dirty} pending={busy} />
    <Drawer
      open
      size="large"
      aria-labelledby={titleId}
      title={<span id={titleId}>Duyệt hồ sơ tài xế · {application.driverName || `Tài xế #${application.id}`}</span>}
      closable={{ disabled: busy, "aria-label": "Đóng hồ sơ" }}
      keyboard={!busy}
      mask={{ closable: !busy }}
      onClose={() => { if (!busy) discardThen(onClose, true); }}
      extra={<Refresh loading={query.isFetching} onClick={() => { if (!busy) void query.refetch(); }} />}
      footer={query.data && (
        <section aria-label="Quyết định tài khoản" className="driver-review-footer">
          <Space wrap>
            <Typography.Text strong>Tài khoản tài xế</Typography.Text>
            <span role="status" aria-label="Trạng thái tài khoản"><Status value={query.data.driver.verificationStatus} /></span>
            <Typography.Text type="secondary">
              {documents.filter(doc => doc.verificationStatus === "APPROVED").length}/{documents.length} giấy tờ đã duyệt
            </Typography.Text>
          </Space>
          <Typography.Paragraph type="secondary">
            Tài khoản chỉ được duyệt khi đủ giấy tờ bắt buộc đã được duyệt.
          </Typography.Paragraph>
          {approvalBlockedReason && <Alert type="warning" showIcon title={approvalBlockedReason} />}
          {!required?.length && <Typography.Paragraph type="secondary">Điều kiện duyệt sẽ được kiểm tra lại khi xác nhận.</Typography.Paragraph>}
          <QueryError error={verify.error} retry={() => { verify.reset(); void query.refetch(); }} />
          <DriverReviewForm
            title="Quyết định tài khoản"
            name={`account-review-${application.id}`}
            account
            currentStatus={query.data.driver.verificationStatus}
            pending={verify.isPending}
            disabled={blocked}
            approvalBlockedReason={approvalBlockedReason}
            onDirtyChange={setAccountDirty}
            onSubmit={values => verify.mutate(values)}
          />
        </section>
      )}
    >
      <Typography.Paragraph>
        Tài xế #{application.id} · {application.driverPhone}
      </Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        Kiểm tra giấy tờ, xác minh kỹ năng và duyệt tài khoản trong cùng hồ sơ.
      </Typography.Paragraph>
      <QueryError error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? <Loading /> : query.data && (
        <>
          <section aria-label="Giấy tờ tài xế">
            {!!required?.length && <>
              <Typography.Title level={5}>Giấy tờ bắt buộc</Typography.Title>
              <ul className="review-checklist">{required.map(type => {
                const doc = documents.find(doc => doc.documentType === type);
                return <li key={type}><span>{label(type)}</span>{doc ? <Status value={doc.verificationStatus} /> : <Tag color="orange">Chưa gửi</Tag>}</li>;
              })}</ul>
            </>}
            <Typography.Title level={5}>Giấy tờ ({documents.length})</Typography.Title>
            {documents.length ? documents.map(document => (
              <div key={document.id} id={`review-document-${document.id}`} className="document-card">
                <Photo url={document.secureUrl} alt={label(document.documentType)} />
                <div className="document-info">
                  <strong>{label(document.documentType)}</strong>
                  <p>Số: {text(document.documentNumber)}</p>
                  <p>Gửi: {date(document.createdAt)} · Hết hạn: {date(document.expiresAt)}</p>
                  <Status value={document.verificationStatus} />
                  {document.rejectionReason && <p>Lý do: {document.rejectionReason}</p>}
                  {reviewId === document.id && (
                    <>
                      <QueryError error={paper.error} retry={() => { paper.reset(); void query.refetch(); }} />
                      <DriverReviewForm
                        key={document.id}
                        title={`Duyệt ${label(document.documentType)} · #${document.id}`}
                        name={`document-review-${document.id}`}
                        pending={paper.isPending}
                        disabled={blocked}
                        onDirtyChange={setPaperDirty}
                        onSubmit={values => paper.mutate({ id: document.id, ...values })}
                        onContinue={values => paper.mutate({ id: document.id, ...values, next: true })}
                        onCancel={() => discardThen(() => { paper.reset(); setReviewId(undefined); })}
                      />
                    </>
                  )}
                </div>
                {reviewId !== document.id && (
                  <Button size="small" disabled={blocked} aria-label={`Duyệt giấy tờ ${label(document.documentType)}`} onClick={() => discardThen(() => { paper.reset(); setReviewId(document.id); })}>
                    Duyệt giấy tờ
                  </Button>
                )}
              </div>
            )) : <Typography.Text type="secondary">Chưa có giấy tờ hiện hành.</Typography.Text>}
          </section>
          <section aria-label="Xác minh kỹ năng">
            <Typography.Title level={5}>Kỹ năng lái xe ({query.data.skills.length})</Typography.Title>
            <QueryError error={skill.error} retry={() => { skill.reset(); void query.refetch(); }} />
            {query.data.skills.length ? query.data.skills.map(item => (
              <div key={item.id} className="document-card">
                <div className="document-info">
                  <strong>{label(item.vehicleType)} · {label(item.transmission)} · {text(item.licenseClass)}</strong>
                  <p><Tag color={item.verified ? "green" : "default"}>{item.verified ? "Đã xác minh" : "Chưa xác minh"}</Tag></p>
                </div>
                <Button
                  size="small"
                  disabled={blocked}
                  loading={skill.isPending && skill.variables?.id === item.id}
                  aria-label={`${item.verified ? "Bỏ xác minh" : "Xác minh"} kỹ năng ${label(item.vehicleType)} · ${label(item.transmission)} · ${text(item.licenseClass)}`}
                  onClick={() => { if (!blocked) skill.mutate({ id: item.id, verified: !item.verified }); }}
                >
                  {item.verified ? "Bỏ xác minh" : "Xác minh"}
                </Button>
              </div>
            )) : <Typography.Text type="secondary">Chưa có kỹ năng đăng ký.</Typography.Text>}
          </section>
        </>
      )}
    </Drawer>
    </>
  );
}
