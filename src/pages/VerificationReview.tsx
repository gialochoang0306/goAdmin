import { ImageViewer } from "../components/ImageViewer";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircleFilled, MinusCircleOutlined, WarningFilled, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, ConfigProvider, Descriptions, Drawer, Empty, Input, Select, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { DataTable, Heading, Loading, Panel, QueryError, Refresh } from "../components/common";
import { FilterField } from "../components/FilterField";
import { FilterSelect } from "../components/FilterSelect";
import { date } from "../lib/format";
import { errorMessage, request, verificationEnabled, verificationFetch } from "../lib/api";
import { LicensePolicyPreview, type ApprovalCapabilityReview } from "./LicensePolicyPreview";
import { useVerificationReviewDraft } from "./useVerificationReviewDraft";
import { FaceComparisonPanel } from "./FaceComparisonPanel";
import { useFilters } from "../lib/hooks";
import {
  captures,
  fieldComparison,
  fields,
  formatFieldText,
  queueStatusLabel,
  states,
  verificationQueueKey,
  verificationReviewPath,
  verificationStatusColor,
  warningText,
  type QueueItem,
  type QueueResponse,
  type ReviewDetail,
  type UnsubmittedApplication,
  type VerificationWarning,
} from "./verificationReviewModel";

const statuses = [{ value: "PENDING_REVIEW", label: "Chờ duyệt" }, ...Object.entries(states).filter(([value]) => value !== "DRAFT").map(([value, label]) => ({ value, label }))];
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
type Decision = "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO" | "REVOKED";
const severityRank: Record<VerificationWarning["severity"], number> = {
  BLOCKING: 0,
  CRITICAL: 1,
  WARNING: 2,
  INFO: 3,
};
type ReviewIssue = { target: string; message: string };

function PrivateImage({ id, slot, revision, openTrigger = 0, onOpen }: { id: string; slot: string; revision: number; openTrigger?: number; onOpen?: () => void }) {
  const [url, setUrl] = useState<string>();
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string>();
  const shouldLoad = requested || openTrigger > 0;
  useEffect(() => {
    if (!shouldLoad) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void verificationFetch<Blob>("applications/" + id + "/captures/" + slot + "?snapshot=" + revision, {
      binary: true, signal: controller.signal,
    }).then(blob => {
      if (!controller.signal.aborted) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    }).catch(err => {
      if (!controller.signal.aborted) setError(errorMessage(err));
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, slot, revision, shouldLoad, attempt, openTrigger]);
  if (url) return <ImageViewer width={200} alt={captures[slot]} src={url} />;
  return (
    <div className="verification-image-placeholder">
      {error ? (
        <>
          <Alert type="warning" showIcon title={error} />
          <Button onClick={() => { setError(undefined); setAttempt(prev => prev + 1); }}>Thử lại</Button>
        </>
      ) : (
        <>
          <Typography.Text type="secondary">Ảnh bảo mật · Bấm để xem</Typography.Text>
          <Button loading={requested && !url} onClick={() => { setRequested(true); setError(undefined); onOpen?.(); }}>Mở ảnh</Button>
        </>
      )}
    </div>
  );
}

function Review({ detail, snapshot, setSnapshot, onChanged, onPendingChange, refreshing }: {
  detail: ReviewDetail; snapshot?: number; setSnapshot: (value?: number) => void;
  refreshing: boolean;
  onChanged: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const reviewClient = useQueryClient();
  const draftScope = [detail.id, detail.submissionRevision, detail.document.revision] as const;
  const [draft, updateDraft] = useVerificationReviewDraft<{
    action?: Decision; capabilityReview?: ApprovalCapabilityReview;
    reason: string; captureTargets: string[]; fieldTargets: string[]; reviewed: boolean;
  }>([...draftScope, "decision"], { reason: "", captureTargets: [], fieldTargets: [], reviewed: false });
  const { action, capabilityReview, reason, captureTargets, fieldTargets, reviewed } = draft;
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const setAction = (value?: Decision) => { setIssues([]); updateDraft({ action: value }); };
  const setCapabilityReview = (value?: ApprovalCapabilityReview) => updateDraft({ capabilityReview: value });
  const capabilities = useQuery({
    queryKey: ["admin", "capabilityPreferences", detail.id, detail.revision],
    enabled: detail.status === "APPROVED" && detail.document.revision === detail.submissionRevision,
    queryFn: () => request<{ enabled: boolean; groups: { groupId: string; label: string; approved: boolean; enabled: boolean; effective: boolean }[] }>(
      "/api/admin/vehicle-catalog/applications/" + detail.id + "/capabilities"),
  });




  const [liveFaceWarnings, setLiveFaceWarnings] = useState<VerificationWarning[]>();
  const [openAllSignal, setOpenAllSignal] = useState(0);
  const [viewedSlots, setViewedSlots] = useState<string[]>([]);
  const markViewed = (slot: string) => setViewedSlots(previous => previous.includes(slot) ? previous : [...previous, slot]);
  const doc = detail.document;
  const warnings = (liveFaceWarnings
    ? [...(detail.verificationWarnings ?? []).filter(warning => warning.evidenceSource !== "FACE_COMPARISON"), ...liveFaceWarnings]
    : detail.verificationWarnings)?.slice().sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const current = doc.revision === detail.submissionRevision;
  const blockedActivation = detail.verificationWarnings?.some(warning => warning.blocksActivation);
  const available: Decision[] = !current ? [] : detail.status === "SUBMITTED"
    ? ["UNDER_REVIEW"] : detail.status === "UNDER_REVIEW" ? (blockedActivation ? ["REJECTED", "NEEDS_MORE_INFO"] : ["APPROVED", "REJECTED", "NEEDS_MORE_INFO"])
    : detail.status === "APPROVED" ? ["REVOKED", "NEEDS_MORE_INFO"]
    : detail.status === "REVOKED" ? ["NEEDS_MORE_INFO"] : [];
  const labels = { UNDER_REVIEW: "Bắt đầu xét duyệt", APPROVED: "Phê duyệt", REJECTED: "Từ chối",
    NEEDS_MORE_INFO: "Yêu cầu bổ sung", REVOKED: "Thu hồi xác minh" };
  const decision = useMutation({
    mutationFn: (body: object) => verificationFetch("applications/" + detail.id + "/decision", { body }),
    onSuccess: (_, body) => {
      setAction(undefined);
      updateDraft({ reviewed: false });
      setIssues([]);
      setLiveFaceWarnings(undefined);
      if ("status" in body && body.status !== "UNDER_REVIEW") {
        reviewClient.removeQueries({ queryKey: ["verificationReviewDraft", ...draftScope] });
      }
      onChanged();
    },
  });
  useEffect(() => {
    onPendingChange(decision.isPending);
    return () => onPendingChange(false);
  }, [decision.isPending, onPendingChange]);
  const needsReason = action === "REJECTED" || action === "NEEDS_MORE_INFO" || action === "REVOKED";
  const comparisonRows = fieldComparison(doc, detail.approvedSubmissionRevision !== doc.revision ? detail.approvedDocument : null);
  const attentionCount = comparisonRows.filter(row => row.conflicts || row.differs || row.changedFromApproved).length;
  const captureEntries = Object.entries(captures).filter(([slot]) => Boolean(doc.captures[slot]));
  const generalWarnings = warnings?.filter(warning => warning.evidenceSource !== "FACE_COMPARISON" || !warning.slot) ?? [];

  const blockedWarnings = warnings?.filter(warning => warning.blocksActivation) ?? [];
  const reviewedId = "verification-decision-reviewed";
  const reasonId = "verification-decision-reason";
  const captureTargetId = "verification-decision-captures";
  const capabilityTargetId = "verification-capability-scope";
  const jumpTo = (target: string) => {
    const element = document.getElementById(target);
    if (!element) return;
    element.scrollIntoView?.({ block: "center", behavior: "smooth" });
    (element as HTMLElement).focus?.({ preventScroll: true });
  };
  const readiness: { key: string; label: string; tone: "ok" | "warning" | "pending" | "danger"; target: string }[] = [
    {
      key: "warnings", tone: blockedWarnings.length ? "danger" : "ok",
      label: blockedWarnings.length ? `${blockedWarnings.length} cảnh báo chặn kích hoạt` : "Không có cảnh báo chặn kích hoạt",
      target: "verification-section-warnings",
    },
    {
      key: "comparison", tone: attentionCount ? "warning" : "ok",
      label: attentionCount ? `${attentionCount} trường cần đối chiếu` : "Thông tin khớp đề xuất",
      target: "verification-section-comparison",
    },
    {
      key: "captures", tone: captureEntries.length > 0 && viewedSlots.length < captureEntries.length ? "warning" : "ok",
      label: captureEntries.length ? `Đã mở ${viewedSlots.length}/${captureEntries.length} ảnh` : "Hồ sơ chưa có ảnh",
      target: "verification-section-captures",
    },
    { key: "reviewed", tone: reviewed ? "ok" : "pending", label: reviewed ? "Đã xác nhận đối chiếu" : "Chưa xác nhận đối chiếu", target: reviewedId },
    ...(available.includes("APPROVED") ? [{
      key: "capability", tone: (capabilityReview ? "ok" : "pending") as "ok" | "pending",
      label: capabilityReview ? "Đã chọn phạm vi GPLX" : "Chưa chọn phạm vi GPLX", target: capabilityTargetId,
    }] : []),
  ];
  const hasWarningSection = generalWarnings.length > 0 || (!detail.verificationWarnings && Boolean(doc.warningCodes?.length));
  const jumpable = (target: string) => target !== "verification-section-warnings" || hasWarningSection;
  const submitDecision = (event: FormEvent) => {
    event.preventDefault();
    if (refreshing || !action || !available.includes(action) || decision.isPending) return;
    const problems: ReviewIssue[] = [];
    if (!reviewed) problems.push({ target: reviewedId, message: "Xác nhận đã đối chiếu ảnh và thông tin của bản nộp." });
    if (needsReason && !reason.trim()) problems.push({ target: reasonId, message: "Nhập lý do cụ thể." });
    if (action === "NEEDS_MORE_INFO" && !captureTargets.length && !fieldTargets.length) {
      problems.push({ target: captureTargetId, message: "Chọn ít nhất một ảnh hoặc trường cần bổ sung." });
    }
    if (action === "APPROVED" && !capabilityReview) {
      problems.push({ target: capabilityTargetId, message: "Hãy xem phạm vi GPLX và chọn nhóm xe được duyệt." });
    }
    setIssues(problems);
    if (problems.length) { jumpTo(problems[0].target); return; }
    decision.mutate({
      ...(action === "APPROVED" ? { capabilityReview } : {}),
      revision: detail.revision, status: action, reason: needsReason ? reason.trim() : undefined,
      captures: action === "NEEDS_MORE_INFO" ? captureTargets : [],
      fields: action === "NEEDS_MORE_INFO" ? fieldTargets : [],
    });
  };

  return <div className={`verification-review-layout${available.length > 0 ? " has-rail" : ""}`}>
    <div className="verification-review-main">
    <section className="verification-summary-header" aria-label="Thông tin tóm tắt hồ sơ">
      <div className="verification-summary-top">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {detail.driverId != null ? (
              <Link to={`/drivers/${detail.driverId}`} state={{ from: verificationReviewPath }}>
                {detail.driverName || `Tài xế #${detail.driverId}`}
              </Link>
            ) : (
              "Chưa liên kết tài xế"
            )}
          </Typography.Title>
          <div className="muted">
            {detail.driverId != null ? `#${detail.driverId}` : ""}
            {detail.driverPhone ? ` · ${detail.driverPhone}` : ""}
            {` · Bổ sung: ${detail.resubmissionCount} lần`}
          </div>
        </div>
        <Space wrap size={6}>
          <Tag color={verificationStatusColor(detail.status)}>{queueStatusLabel(detail.status)}</Tag>
          {detail.warningCount > 0 ? <Tag color="orange">{detail.warningCount} cảnh báo</Tag> : null}
        </Space>
      </div>
      <div className="verification-toolbar">
        <FilterField label="Phiên bản hồ sơ đang xem">
          <Select aria-label="Bản nộp" value={snapshot ?? detail.submissionRevision} style={{ minWidth: 260 }}
            options={detail.submissions.map(item => ({ value: item.revision, label: "Bản " + item.revision + " · " + date(item.submittedAt) }))}
            onChange={value => setSnapshot(value === detail.submissionRevision ? undefined : value)} />
        </FilterField>
      </div>
    </section>

    <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }} items={[
      { key: "status", label: "Trạng thái", children: <Tag color={verificationStatusColor(detail.status)}>{queueStatusLabel(detail.status)}</Tag> },
      { key: "revision", label: "Bản nộp đang xem", children: <span className="numeric">{doc.revision}</span> },
      { key: "submitted", label: "Thời gian nộp", children: <span className="numeric">{date(doc.submittedAt)}</span> },
      ...(detail.identityLocked ? [
        { key: "lockedCccd", label: "Danh tính đã khóa (CCCD)", children: <code>{detail.lockedIdentity?.cccdId ?? detail.lockedIdentity?.maskedCccdId ?? "Đã khóa"}</code> },
        { key: "lockedName", label: "Họ tên xác minh", children: detail.lockedIdentity?.fullName ?? "—" },
        { key: "lockedDob", label: "Ngày sinh xác minh", children: <span className="numeric">{detail.lockedIdentity?.dob ?? "—"}</span> },
        { key: "approvedRev", label: "Bản đã duyệt hiệu lực", children: detail.approvedSubmissionRevision ? `Bản nộp ${detail.approvedSubmissionRevision}` : "—" },
      ] : []),
    ]} />

    {detail.identityHold && <Alert type="error" showIcon title="Hồ sơ đang bị tạm giữ để kiểm tra danh tính"
      description={detail.identityHoldReason || "Phát hiện dấu hiệu mâu thuẫn danh tính hoặc trùng giấy tờ."} />}

    {!current && (
      <Alert
        type="info"
        showIcon
        title={`Đang xem bản nộp cũ (Bản ${doc.revision}). Chuyển về bản mới nhất (Bản ${detail.submissionRevision}) để ra quyết định.`}
      />
    )}

    {doc.warningAcknowledgement?.codes.length ? (
      <div className="verification-ack-note">
        Tài xế đã xác nhận xem cảnh báo ở revision {doc.warningAcknowledgement.revision}.
      </div>
    ) : null}

    {generalWarnings.length > 0 || (!detail.verificationWarnings && doc.warningCodes?.length) ? (
      <section id="verification-section-warnings" tabIndex={-1} className="verification-section" aria-label="Cảnh báo xét duyệt">
        <div className="verification-section-header">
          <h4>Cảnh báo xét duyệt</h4>
          <Space size={6} wrap>
            {blockedWarnings.length > 0 ? <Tag color="red">{blockedWarnings.length} chặn kích hoạt</Tag> : null}
            <Tag color="orange">{generalWarnings.length || doc.warningCodes?.length || 0}</Tag>
          </Space>
        </div>
        {generalWarnings.map(warning => (
          <Alert key={[warning.code, warning.slot, warning.fieldKey].join(":")}
            type={warning.severity === "INFO" ? "info" : warning.severity === "WARNING" ? "warning" : "error"}
            showIcon
            title={warning.humanReadableMessage}
            description={<>
              {warning.recommendedAction} <Tag>{warning.code}</Tag> {warning.blocksActivation ? <Tag color="red">Cần xử lý trước khi duyệt</Tag> : ""}
              {warning.fieldKey ? " · " + (fields[warning.fieldKey] ?? warning.fieldKey) : warning.documentType ? " · " + warning.documentType : ""}
            </>} />
        ))}
        {!detail.verificationWarnings && doc.warningCodes?.map(code => <Alert key={code} type="warning" showIcon title={warningText(code)} />)}
      </section>
    ) : null}

    <section id="verification-section-comparison" tabIndex={-1} className="verification-section" aria-label="Đối chiếu thông tin giấy tờ">
      <div className="verification-section-header">
        <h4>Đối chiếu thông tin giấy tờ</h4>
        {attentionCount > 0 ? <Tag color="orange">{attentionCount} mục cần chú ý</Tag> : <Tag color="green">Khớp đề xuất</Tag>}
      </div>
      <Table rowKey="key" size="small" pagination={false} scroll={{ x: 680 }}
        rowClassName={row => (row.conflicts || row.differs || row.changedFromApproved ? "verification-row-attention" : "")}
        dataSource={comparisonRows}
        columns={[
          { title: "Trường", dataIndex: "label" },
          ...(detail.approvedDocument && detail.approvedSubmissionRevision !== doc.revision
            ? [{ title: "Đã duyệt trước đó", dataIndex: "approvedConfirmed", render: (value: string, row: (typeof comparisonRows)[number]) => formatFieldText(row.key, value) }]
            : []),
          { title: "Tài xế xác nhận", dataIndex: "confirmed", render: (value: string, row: (typeof comparisonRows)[number]) => formatFieldText(row.key, value) },
          { title: "QR / OCR", render: (_, row) => row.proposed.length
            ? <div className="verification-proposal-list">
                {row.proposed.map((item, index) => (
                  <div key={index} className="verification-proposal-item">
                    <Tag>{item.source}{item.sourceSide ? (item.sourceSide === "FRONT" ? " mặt trước" : " mặt sau") : ""}</Tag>
                    <span>{formatFieldText(row.key, item.value)}</span>
                  </div>
                ))}
              </div>
            : "—" },
          { title: "Đối chiếu", render: (_, row) => {
            const edited = detail.editedFields?.includes(row.key) || (row.key === "expiry_date" && detail.editedFields?.includes("no_expiry"));
            const cleanMatch = !row.changedFromApproved && !row.conflicts && !row.differs && !edited && row.proposed.length > 0;
            return <>
              {row.changedFromApproved && <Tag color="blue">Thay đổi từ bản đã duyệt</Tag>}
              {row.conflicts && <Tag color="orange">Mâu thuẫn</Tag>}
              {row.differs && <Tag>Khác đề xuất</Tag>}
              {edited && <Tag color="blue">Đã sửa từ bản trước</Tag>}
              {cleanMatch && <Tag color="green">Khớp</Tag>}
            </>;
          } },
        ]} />
    </section>

    <section id="verification-section-captures" tabIndex={-1} className="verification-section" aria-label="Ảnh giấy tờ và chân dung">
      <div className="verification-section-header">
        <h4>Ảnh giấy tờ &amp; chân dung ({captureEntries.length} ảnh)</h4>
        {captureEntries.length > 0 ? (
          <Button size="small" onClick={() => setOpenAllSignal(v => v + 1)}>Mở tất cả ảnh</Button>
        ) : null}
      </div>
      <div className="verification-capture-grid">
        {captureEntries.map(([slot, label]) => {
          const capture = doc.captures[slot]!;
          const result = doc.proposals[slot]?.result;
          const resultNotes = result ? [...new Set([
            result.qrStatus, result.ocrStatus, ...result.warnings,
            ...Object.values(result.fieldStatuses ?? {}).filter(code => code !== "READ"),
          ])] : [];
          return <section key={slot} aria-label={label} className="verification-capture-card">
            <div className="verification-capture-head">
              <h4>{label}</h4>
              <Typography.Text type="secondary" className="muted numeric">
                {capture.quality ? capture.quality.width + " × " + capture.quality.height + " px" : "Chưa có số đo chất lượng"}
              </Typography.Text>
            </div>
            <PrivateImage id={detail.id} slot={slot} revision={doc.revision} openTrigger={openAllSignal} onOpen={() => markViewed(slot)} />
            {warnings?.filter(warning => warning.evidenceSource === "FACE_COMPARISON" && warning.slot === slot)
              .map(warning => <Alert key={warning.code} type={warning.severity === "INFO" ? "info" : "warning"}
                title={warning.humanReadableMessage} description={<>{warning.recommendedAction} <Tag>{warning.code}</Tag></>} />)}
            {capture.quality?.warnings.length ? (
              <Space wrap size={4}>
                {capture.quality.warnings.map(code => <Tag key={code} color="gold">{warningText(code)}</Tag>)}
              </Space>
            ) : null}
            <div className="verification-capture-notes">
              {result ? resultNotes.map(code =>
                <Typography.Text key={code} type="secondary" className="muted">{warningText(code)}</Typography.Text>
              ) : <Typography.Text type="secondary" className="muted">Chưa có lượt trích xuất cho ảnh này.</Typography.Text>}
            </div>
          </section>;
        })}
      </div>
    </section>

    {detail.approvedDocument && detail.approvedSubmissionRevision != null && detail.approvedSubmissionRevision !== doc.revision
      && Object.keys(detail.approvedDocument.captures ?? {}).length > 0 && (
      <details className="verification-details-panel"><summary>Ảnh bản đã duyệt trước đó (Bản {detail.approvedSubmissionRevision})</summary>
        <div className="verification-capture-grid" style={{ marginTop: 12 }}>
          {Object.entries(captures).map(([slot, label]) => {
            const cap = detail.approvedDocument?.captures?.[slot];
            if (!cap) return null;
            return <section key={"approved-" + slot} aria-label={"Bản đã duyệt · " + label} className="verification-capture-card">
              <h4>{label}</h4>
              <PrivateImage id={detail.id} slot={slot} revision={detail.approvedSubmissionRevision!} />
            </section>;
          })}
        </div>
      </details>
    )}
    <div id={capabilityTargetId} tabIndex={-1} className="verification-capability-scope">
      {current && ["SUBMITTED", "UNDER_REVIEW"].includes(detail.status)
        ? <LicensePolicyPreview draftScope={draftScope} confirmed={doc.confirmed} onReviewChange={setCapabilityReview} />
        : <p className="verification-meta-note">Phạm vi GPLX chỉ được xét khi bản nộp mới nhất đang chờ duyệt.</p>}
    </div>
    {capabilities.isError && <Alert type="warning" showIcon title="Chưa tải được tùy chọn nhận chuyến của tài xế." />}
    {capabilities.data?.enabled && <section aria-label="Tùy chọn nhận chuyến của tài xế" className="verification-decision-box">
      <h4>Tùy chọn nhận chuyến của tài xế</h4>
      {capabilities.data.groups.some(group => group.approved)
        ? <ul className="verification-capability-list">{capabilities.data.groups.filter(group => group.approved).map(group => <li key={group.groupId} className="verification-capability-item">
            <span>{group.label}</span>
            <Space size={6}>
              <Tag color={group.enabled ? "green" : "default"}>{group.enabled ? "Đã bật" : "Đang tắt"}</Tag>
              {group.enabled && !group.effective ? <Tag color="red">Quyền đã hết hiệu lực</Tag> : null}
            </Space>
          </li>)}</ul>
        : <Typography.Text type="secondary">Chưa có nhóm xe được duyệt trong bản đồng bộ hiện tại.</Typography.Text>}
    </section>}
    <FaceComparisonPanel key="face-comparison" detail={detail} onWarnings={setLiveFaceWarnings} />
    <details className="verification-details-panel"><summary>Lịch sử hồ sơ ({detail.history.length})</summary>
      <ul className="verification-history-list">{detail.history.map((entry, idx) => <li key={entry.revision + ":" + entry.action + ":" + idx} className="verification-history-item">
        <div className="verification-history-meta">
          <span className="numeric">{date(entry.at)}</span>
          <strong>{labels[entry.action as Decision] ?? ({
            CREATE: "Tạo hồ sơ", ADD_CAPTURE: "Thêm ảnh", REPLACE_CAPTURE: "Thay ảnh",
            CONFIRM_FIELDS: "Xác nhận thông tin", EXTRACT: "Trích xuất", SUBMIT: "Nộp hồ sơ", RESUBMIT: "Nộp bổ sung",
            START_REVERIFICATION: "Mở cập nhật giấy tờ", CANCEL_REVERIFICATION: "Hủy cập nhật giấy tờ",
            LEGACY_BACKFILL: "Đồng bộ hồ sơ đã duyệt", IDENTITY_HOLD_APPLIED: "Tạm giữ kiểm tra danh tính",
            ADMIN_IDENTITY_OVERRIDE: "Ngoại lệ điều chỉnh danh tính",
          }[entry.action] ?? entry.action)}</strong>
          <span>Bản {entry.revision} · {entry.role === "admin" ? "Quản trị viên" : "Tài xế"}</span>
        </div>
        {entry.metadata?.reason ? <div className="verification-history-detail">{entry.metadata.reason}</div> : null}
        {entry.metadata?.requestedChanges ? <div className="verification-history-detail">{[
          ...entry.metadata.requestedChanges.captures.map(key => captures[key]),
          ...entry.metadata.requestedChanges.fields.map(key => fields[key]),
        ].filter(Boolean).join(", ")}</div> : null}
      </li>)}</ul>
    </details>
    {current && available.length === 0 ? (
      <Alert
        type="info"
        showIcon
        title="Hồ sơ không có hành động xét duyệt ở trạng thái hiện tại."
        description={detail.status === "DRAFT"
          ? "Tài xế đang cập nhật giấy tờ. Nội dung bên dưới là bản nộp gần nhất đã nộp; chưa có bản mới để ra quyết định."
          : detail.status === "NEEDS_MORE_INFO"
            ? "Đang chờ tài xế bổ sung. Hồ sơ quay lại hàng chờ sau khi tài xế nộp bản mới."
            : detail.status === "REJECTED"
              ? "Hồ sơ đã bị từ chối. Chỉ xét lại khi tài xế nộp bản mới."
              : "Chuyển sang bản nộp mới nhất để ra quyết định."}
      />
    ) : null}
    {available.length > 0 ? (
      <div className="verification-jump-bar">
        <span className="verification-jump-summary">
          {`${blockedWarnings.length} chặn · ${attentionCount} lệch · Đã mở ${viewedSlots.length}/${captureEntries.length} ảnh`}
        </span>
        <Button htmlType="button" onClick={() => jumpTo("verification-decision-rail")}>Tới quyết định</Button>
      </div>
    ) : null}
    </div>
    {available.length > 0 && (
      <aside id="verification-decision-rail" tabIndex={-1} className="verification-decision-rail" aria-label="Quyết định xét duyệt">
        <div className="verification-rail-head">
          <h4>Quyết định xét duyệt</h4>
          <Tag color={verificationStatusColor(detail.status)}>{queueStatusLabel(detail.status)}</Tag>
        </div>
        <p className="verification-rail-context">
          Bản nộp {doc.revision} · {date(doc.submittedAt)}
        </p>
        <ul className="verification-readiness">
          {readiness.map(item => (
            <li key={item.key} data-tone={item.tone}>
              <button type="button" className="verification-readiness-item" disabled={!jumpable(item.target)} onClick={() => jumpTo(item.target)}>
                <span className="verification-readiness-icon" aria-hidden>
                  {item.tone === "ok" ? <CheckCircleFilled /> : item.tone === "danger" ? <WarningFilled /> : item.tone === "warning" ? <WarningOutlined /> : <MinusCircleOutlined />}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {blockedActivation && detail.status === "UNDER_REVIEW" ? (
          <Alert
            type="warning"
            showIcon
            title="Phê duyệt đang bị khóa do có cảnh báo chặn kích hoạt."
            description="Chọn Yêu cầu bổ sung hoặc Từ chối."
          />
        ) : null}
        <form className="verification-decision-form" onSubmit={submitDecision}>
          <FilterField label="Quyết định">
            <Select aria-label="Quyết định" placeholder="Chọn quyết định" value={action} style={{ width: "100%" }}
              options={available.map(value => ({ value, label: labels[value] }))} onChange={setAction} />
          </FilterField>
          {action === "APPROVED" && !capabilityReview ? (
            <Alert type="info" showIcon title="Chọn phạm vi GPLX và nhóm xe được duyệt ở mục Phạm vi GPLX theo nhóm xe trước khi lưu phê duyệt." />
          ) : null}
          {action === "NEEDS_MORE_INFO" && <>
            <FilterField label="Ảnh cần bổ sung">
              <Select id={captureTargetId} mode="multiple" aria-label="Ảnh cần bổ sung" placeholder="Ảnh cần bổ sung" style={{ width: "100%" }}
                options={Object.entries(captures).map(([value, label]) => ({ value, label }))} value={captureTargets} onChange={value => updateDraft({ captureTargets: value })} />
            </FilterField>
            <FilterField label="Trường cần sửa">
              <Select id="verification-decision-fields" mode="multiple" aria-label="Trường cần sửa" placeholder="Trường cần sửa" style={{ width: "100%" }}
                options={Object.entries(fields).map(([value, label]) => ({ value, label }))} value={fieldTargets} onChange={value => updateDraft({ fieldTargets: value })} />
            </FilterField>
          </>}
          {needsReason && <FilterField label="Lý do">
            <Input.TextArea id={reasonId} aria-label="Lý do" placeholder="Lý do cụ thể gửi tài xế"
              maxLength={500} showCount value={reason} onChange={event => updateDraft({ reason: event.target.value })} />
          </FilterField>}
          <Checkbox id={reviewedId} checked={reviewed} onChange={event => updateDraft({ reviewed: event.target.checked })}>
            Tôi đã đối chiếu ảnh giấy tờ và thông tin của Bản {doc.revision}
          </Checkbox>
          {issues.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title="Chưa thể lưu quyết định"
              description={<ul className="verification-issues">
                {issues.map(issue => <li key={issue.target}>
                  <span>{issue.message}</span>
                  <Button type="link" size="small" htmlType="button" onClick={() => jumpTo(issue.target)}>Đi tới</Button>
                </li>)}
              </ul>}
            />
          ) : null}
          {decision.error ? <Alert type="error" showIcon title={errorMessage(decision.error)} /> : null}
          <Button type="primary" block danger={action === "REJECTED" || action === "REVOKED"} htmlType="submit" loading={decision.isPending} disabled={!action || !available.includes(action)}>Lưu quyết định</Button>
        </form>
      </aside>
    )}
  </div>;
}

export default function VerificationReview() {
  const filters = useFilters();
  const client = useQueryClient();
  const search = filters.read("application_id");
  const selected = filters.read("review") || search;
  const id = uuid.test(selected) ? selected : undefined;
  const [historical, setHistorical] = useState<{ id: string; revision: number }>();
  const snapshot = historical && historical.id === id ? historical.revision : undefined;
  const [notice, setNotice] = useState("");
  const [decisionPending, setDecisionPending] = useState(false);
  const status = filters.read("status");
  const params = new URLSearchParams({ limit: String(filters.size), offset: String(filters.size * filters.page) });
  if (search && uuid.test(search)) params.set("application_id", search);
  if (statuses.some(option => option.value === status)) params.set("status", status);
  const canSearch = !search || uuid.test(search);
  const queue = useQuery({
    queryKey: [...verificationQueueKey, params.toString()],
    queryFn: ({ signal }) => verificationFetch<QueueResponse>("review-queue?" + params.toString(), { signal }),
    enabled: verificationEnabled && canSearch, retry: false, gcTime: 0,
  });
  const detailKey = [...verificationQueueKey, id, snapshot] as const;
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => verificationFetch<ReviewDetail | UnsubmittedApplication>("applications/" + id + (snapshot ? "?snapshot=" + snapshot : ""), { signal }),
    enabled: verificationEnabled && !!id, retry: false, gcTime: 0,
  });
  return <>
    <Heading title="Duyệt hồ sơ tài xế" subtitle="Đối chiếu hồ sơ nộp từ ứng dụng tài xế."
      actions={<Space>
        <Refresh loading={queue.isFetching || detail.isFetching} onClick={() => {
          void queue.refetch(); if (id) void detail.refetch();
        }} /></Space>} />
    {!verificationEnabled ? <Alert type="info" title="Chưa cấu hình máy chủ eKYC." /> : <>
      <div className="filters">
        <FilterField label="Tìm theo mã hồ sơ" search>
          <Input.Search key={search} aria-label="Mã hồ sơ" placeholder="Mã hồ sơ UUID đầy đủ" defaultValue={search}
            maxLength={36} enterButton="Tìm" onSearch={value => filters.update({ application_id: value.trim(), review: undefined })} />
        </FilterField>
        <FilterField label="Trạng thái hồ sơ">
          <FilterSelect aria-label="Trạng thái hồ sơ" allLabel="Tất cả trạng thái" value={status}
            options={statuses} style={{ minWidth: 190 }} onChange={value => filters.update({ status: value })} />
        </FilterField>
        <Button className="filter-reset" onClick={filters.reset}>Xóa bộ lọc</Button>
      </div>
      {!canSearch && <Alert className="query-error" type="warning" showIcon title="Nhập mã hồ sơ UUID đầy đủ." />}
      {notice && <Alert className="query-error" type="success" showIcon title={notice} closable onClose={() => setNotice("")} />}
      <QueryError error={queue.error} retry={() => void queue.refetch()} />
      <Panel>
        <DataTable<QueueItem> loading={queue.isFetching} scroll={760}
          data={canSearch && queue.data ? {
            content: queue.data.items, totalElements: queue.data.totalElements, hasNext: queue.data.hasMore,
            page: filters.page, size: filters.size, totalPages: Math.ceil(queue.data.totalElements / filters.size),
          } : undefined} columns={[
            { title: "Tài xế", dataIndex: "driverName", render: (_, row) => row.driverId == null
              ? <Typography.Text type="secondary">Chưa liên kết tài xế</Typography.Text>
              : <><Link to={`/drivers/${row.driverId}`} state={{ from: verificationReviewPath }}>{row.driverName || `Tài xế #${row.driverId}`}</Link>
                <div className="muted">#{row.driverId}{row.driverPhone ? ` · ${row.driverPhone}` : ""}</div></> },
            { title: "Mã hồ sơ", dataIndex: "id", render: (value, row) => <Button type="link" className="verification-application-link" onClick={() => {
              filters.update({ review: row.id }, false); setHistorical(undefined); setNotice("");
            }}><code>{value}</code></Button> },
            { title: "Trạng thái", dataIndex: "status", render: value => <Tag color={verificationStatusColor(value)}>{queueStatusLabel(value)}</Tag> },
            { title: "Thời gian nộp", dataIndex: "submittedAt", render: date, className: "numeric" },
            { title: "Lần bổ sung", dataIndex: "resubmissionCount", align: "right" },
            { title: "Cảnh báo", dataIndex: "warningCount", align: "right", render: value => value ? <Tag color="orange">{value}</Tag> : "0" },
          ]} />
        <div className="verification-pagination">
          <Button size="small" disabled={!filters.page} onClick={() => filters.update({ page: filters.page - 1 }, false)}>Trang trước</Button>
          <Typography.Text type="secondary" className="numeric">
            {queue.data
              ? `Trang ${filters.page + 1} / ${Math.max(1, Math.ceil(queue.data.totalElements / filters.size))} · ${queue.data.totalElements} hồ sơ`
              : `Trang ${filters.page + 1}`}
          </Typography.Text>
          <Button size="small" disabled={!canSearch || !queue.data?.hasMore} onClick={() => filters.update({ page: filters.page + 1 }, false)}>Trang sau</Button>
        </div>
      </Panel>
    </>}
    <Drawer rootClassName="verification-review-drawer" aria-label="Chi tiết xác minh tài xế"
      title={<div className="verification-drawer-title">
        <span>Chi tiết xác minh tài xế</span>
        {id && detail.data && "document" in detail.data ? (
          <span className="verification-drawer-context">
            · {detail.data.driverName || `Tài xế #${detail.data.driverId}`} · Bản {detail.data.document.revision}
          </span>
        ) : null}
      </div>}
      open={!!id} closable={!decisionPending} keyboard={!decisionPending} mask={{ closable: !decisionPending }} onClose={() => { if (!decisionPending) {
      filters.update({ review: undefined, application_id: search === id ? undefined : search }, false);
      setHistorical(undefined);
    } }} size="large" destroyOnHidden>
      {detail.isFetching ? <Loading /> : <QueryError error={detail.error} retry={() => void detail.refetch()} />}
      {id && detail.data && !detail.isFetching && !detail.error && !("document" in detail.data) && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<div>
            <div>Chưa có bản nộp đang chờ duyệt</div>
            <Typography.Text type="secondary">
              Hồ sơ đang ở bản nháp hoặc tài xế đang cập nhật giấy tờ. Khi tài xế nộp bản mới, hồ sơ sẽ xuất hiện ở đây để duyệt.
            </Typography.Text>
          </div>}
        />
      )}
      {id && detail.data && !detail.error && "document" in detail.data && (
        <ConfigProvider componentDisabled={detail.isFetching || decisionPending}>
          <Review
          key={id + ":" + detail.data.submissionRevision + ":" + detail.data.document.revision}
          refreshing={detail.isFetching}
          detail={detail.data} snapshot={snapshot} setSnapshot={revision => setHistorical(revision ? { id, revision } : undefined)} onPendingChange={setDecisionPending} onChanged={() => {
            setNotice("Đã lưu quyết định.");
            void client.invalidateQueries({ queryKey: verificationQueueKey });
            void client.invalidateQueries({ queryKey: ["admin", "driver"] });
            void client.invalidateQueries({ queryKey: ["admin", "drivers"] });
          }} />
        </ConfigProvider>
      )}
    </Drawer>
  </>;
}

