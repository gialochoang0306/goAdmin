import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Descriptions, Drawer, Image, Input, Select, Space, Table, Tag } from "antd";
import { Link } from "react-router-dom";
import { Heading, Loading, QueryError, Refresh } from "../components/common";
import { date } from "../lib/format";
import { errorMessage, request, verificationEnabled, verificationFetch } from "../lib/api";
import { LicensePolicyPreview, type ApprovalCapabilityReview } from "./LicensePolicyPreview";
import { FaceComparisonPanel } from "./FaceComparisonPanel";
import { useFilters } from "../lib/hooks";
import { captures, fieldComparison, fields, states, warningText, type QueueItem, type ReviewDetail, type VerificationWarning } from "./verificationReviewModel";

const statuses = Object.entries(states).map(([value, label]) => ({ value, label }));
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const queueKey = ["admin", "ekyc-review"];
type Queue = { items: QueueItem[]; hasMore: boolean };
type Decision = "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO" | "REVOKED";

function PrivateImage({ id, slot, revision }: { id: string; slot: string; revision: number }) {
  const [url, setUrl] = useState<string>();
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!requested) return;
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
  }, [id, slot, revision, requested]);
  if (url) return <Image width={200} alt={captures[slot]} src={url} />;
  return <Space orientation="vertical">
    <Button loading={requested && !error} onClick={() => setRequested(true)} disabled={!!error}>Mở ảnh</Button>
    {error && <Alert type="warning" title={error} />}
  </Space>;
}

function Review({ detail, snapshot, setSnapshot, onChanged }: {
  detail: ReviewDetail; snapshot?: number; setSnapshot: (value?: number) => void;
  onChanged: () => void;
}) {
  const [action, setAction] = useState<Decision>();
  const [capabilityReview, setCapabilityReview] = useState<ApprovalCapabilityReview>();
  const capabilities = useQuery({
    queryKey: ["admin", "capabilityPreferences", detail.id, detail.revision],
    enabled: detail.status === "APPROVED" && detail.document.revision === detail.submissionRevision,
    queryFn: () => request<{ enabled: boolean; groups: { groupId: string; label: string; approved: boolean; enabled: boolean; effective: boolean }[] }>(
      "/api/admin/vehicle-catalog/applications/" + detail.id + "/capabilities"),
  });
  const [reason, setReason] = useState("");
  const [captureTargets, setCaptureTargets] = useState<string[]>([]);
  const [fieldTargets, setFieldTargets] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const [liveFaceWarnings, setLiveFaceWarnings] = useState<VerificationWarning[]>();
  const doc = detail.document;
  const warnings = liveFaceWarnings
    ? [...(detail.verificationWarnings ?? []).filter(warning => warning.evidenceSource !== "FACE_COMPARISON"), ...liveFaceWarnings]
    : detail.verificationWarnings;
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
    onSuccess: () => onChanged(),
  });
  const needsReason = action === "REJECTED" || action === "NEEDS_MORE_INFO" || action === "REVOKED";
  return <Space orientation="vertical" size="large" style={{ width: "100%" }}>
    <Descriptions size="small" column={1} items={[
      { key: "status", label: "Trạng thái", children: states[detail.status] },
      { key: "revision", label: "Bản nộp đang xem", children: doc.revision },
      { key: "submitted", label: "Thời gian nộp", children: date(doc.submittedAt) },
      ...(detail.identityLocked ? [
        { key: "lockedCccd", label: "Danh tính đã khóa (CCCD)", children: detail.lockedIdentity?.cccdId ?? detail.lockedIdentity?.maskedCccdId ?? "Đã khóa" },
        { key: "lockedName", label: "Họ tên xác minh", children: detail.lockedIdentity?.fullName ?? "—" },
        { key: "lockedDob", label: "Ngày sinh xác minh", children: detail.lockedIdentity?.dob ?? "—" },
        { key: "approvedRev", label: "Bản đã duyệt hiệu lực", children: detail.approvedSubmissionRevision ? `Bản nộp ${detail.approvedSubmissionRevision}` : "—" },
      ] : []),
    ]} />
    {detail.identityHold && <Alert type="error" title="Hồ sơ đang bị tạm giữ để kiểm tra danh tính"
      description={detail.identityHoldReason || "Phát hiện dấu hiệu mâu thuẫn danh tính hoặc trùng giấy tờ."} />}
    <Select aria-label="Bản nộp" value={snapshot ?? detail.submissionRevision} style={{ minWidth: 230 }}
      options={detail.submissions.map(item => ({ value: item.revision, label: "Bản " + item.revision + " · " + date(item.submittedAt) }))}
      onChange={value => setSnapshot(value === detail.submissionRevision ? undefined : value)} />
    {doc.warningAcknowledgement?.codes.length ? <span>
      Tài xế đã xác nhận xem cảnh báo ở revision {doc.warningAcknowledgement.revision}.
    </span> : null}
    {warnings ? warnings.filter(warning => warning.evidenceSource !== "FACE_COMPARISON" || !warning.slot).map(warning =>
      <Alert key={[warning.code, warning.slot, warning.fieldKey].join(":")}
        type={warning.severity === "INFO" ? "info" : warning.severity === "WARNING" ? "warning" : "error"}
        title={warning.humanReadableMessage}
        description={<>{warning.recommendedAction} <Tag>{warning.code}</Tag> {warning.blocksActivation ? "Cần xử lý trước khi duyệt." : ""}
          {warning.fieldKey ? " · " + (fields[warning.fieldKey] ?? warning.fieldKey) : warning.documentType ? " · " + warning.documentType : ""}
        </>} />
    ) : null}
    {!detail.verificationWarnings && doc.warningCodes?.map(code => <Alert key={code} type="warning" title={warningText(code)} />)}
    <Table rowKey="key" size="small" pagination={false} scroll={{ x: 680 }}
      dataSource={fieldComparison(doc, detail.approvedSubmissionRevision !== doc.revision ? detail.approvedDocument : null)}
      columns={[
        { title: "Trường", dataIndex: "label" },
        ...(detail.approvedDocument && detail.approvedSubmissionRevision !== doc.revision
          ? [{ title: "Đã duyệt trước đó", dataIndex: "approvedConfirmed" }]
          : []),
        { title: "Tài xế xác nhận", dataIndex: "confirmed" },
        { title: "QR / OCR", render: (_, row) => row.proposed.length
          ? row.proposed.map((item, index) => <div key={index}>{item.source}{item.sourceSide ? (item.sourceSide === "FRONT" ? " mặt trước" : " mặt sau") : ""} · {item.value}</div>) : "—" },
        { title: "Đối chiếu", render: (_, row) => <>
          {row.changedFromApproved && <Tag color="blue">Thay đổi từ bản đã duyệt</Tag>}
          {row.conflicts && <Tag color="orange">Mâu thuẫn</Tag>}
          {row.differs && <Tag>Khác đề xuất</Tag>}
          {(detail.editedFields?.includes(row.key) || (row.key === "expiry_date" && detail.editedFields?.includes("no_expiry")))
            && <Tag color="blue">Đã sửa từ bản trước</Tag>}
        </> },
      ]} />
    <Space wrap size="large" align="start">
      {Object.entries(captures).map(([slot, label]) => {
        const capture = doc.captures[slot];
        if (!capture) return null;
        const result = doc.proposals[slot]?.result;
        return <section key={slot} aria-label={label}>
          <h3>{label}</h3>
          <PrivateImage id={detail.id} slot={slot} revision={doc.revision} />
          <div>{capture.quality ? capture.quality.width + " × " + capture.quality.height + " px" : "Chưa có số đo chất lượng"}</div>
          {warnings?.filter(warning => warning.evidenceSource === "FACE_COMPARISON" && warning.slot === slot)
            .map(warning => <Alert key={warning.code} type={warning.severity === "INFO" ? "info" : "warning"}
              title={warning.humanReadableMessage} description={<>{warning.recommendedAction} <Tag>{warning.code}</Tag></>} />)}
          {capture.quality?.warnings.map(code => <div key={code}>{warningText(code)}</div>)}
          {result ? [...new Set([
            result.qrStatus, result.ocrStatus, ...result.warnings,
            ...Object.values(result.fieldStatuses ?? {}).filter(code => code !== "READ"),
          ])].map(code =>
            <div key={code}>{warningText(code)}</div>) : <div>Chưa có lượt trích xuất cho ảnh này.</div>}
        </section>;
      })}
    </Space>
    {detail.approvedDocument && detail.approvedSubmissionRevision != null && detail.approvedSubmissionRevision !== doc.revision
      && Object.keys(detail.approvedDocument.captures ?? {}).length > 0 && (
      <details><summary>Ảnh bản đã duyệt trước đó (Bản {detail.approvedSubmissionRevision})</summary>
        <Space wrap size="large" align="start" style={{ marginTop: 12 }}>
          {Object.entries(captures).map(([slot, label]) => {
            const cap = detail.approvedDocument?.captures?.[slot];
            if (!cap) return null;
            return <section key={"approved-" + slot} aria-label={"Bản đã duyệt · " + label}>
              <h4>{label}</h4>
              <PrivateImage id={detail.id} slot={slot} revision={detail.approvedSubmissionRevision!} />
            </section>;
          })}
        </Space>
      </details>
    )}
    {current && ["SUBMITTED", "UNDER_REVIEW"].includes(detail.status) ? <LicensePolicyPreview confirmed={doc.confirmed} onReviewChange={setCapabilityReview} /> : null}
    {capabilities.isError && <Alert type="warning" title="Chưa tải được tùy chọn nhận chuyến của tài xế." />}
    {capabilities.data?.enabled && <section aria-label="Tùy chọn nhận chuyến của tài xế">
      <h3>Tùy chọn nhận chuyến của tài xế</h3>
      {capabilities.data.groups.some(group => group.approved)
        ? <ul>{capabilities.data.groups.filter(group => group.approved).map(group => <li key={group.groupId}>
            {group.label} · {group.enabled ? "Đã bật" : "Đang tắt"}{group.enabled && !group.effective ? " · Quyền đã hết hiệu lực" : ""}
          </li>)}</ul>
        : <p>Chưa có nhóm xe được duyệt trong bản đồng bộ hiện tại.</p>}
    </section>}
    <FaceComparisonPanel key="face-comparison" detail={detail} onWarnings={setLiveFaceWarnings} />
    <details><summary>Lịch sử hồ sơ</summary>
      <ul>{detail.history.map((entry, idx) => <li key={entry.revision + ":" + entry.action + ":" + idx}>
        {date(entry.at)} · {labels[entry.action as Decision] ?? ({
          CREATE: "Tạo hồ sơ", ADD_CAPTURE: "Thêm ảnh", REPLACE_CAPTURE: "Thay ảnh",
          CONFIRM_FIELDS: "Xác nhận thông tin", EXTRACT: "Trích xuất", SUBMIT: "Nộp hồ sơ", RESUBMIT: "Nộp bổ sung",
          START_REVERIFICATION: "Mở cập nhật giấy tờ", CANCEL_REVERIFICATION: "Hủy cập nhật giấy tờ",
          LEGACY_BACKFILL: "Đồng bộ hồ sơ đã duyệt", IDENTITY_HOLD_APPLIED: "Tạm giữ kiểm tra danh tính",
          ADMIN_IDENTITY_OVERRIDE: "Ngoại lệ điều chỉnh danh tính",
        }[entry.action] ?? entry.action)} · Bản {entry.revision} · {entry.role === "admin" ? "Quản trị viên" : "Tài xế"}
        {entry.metadata?.reason ? <div>{entry.metadata.reason}</div> : null}
        {entry.metadata?.requestedChanges ? <div>{[
          ...entry.metadata.requestedChanges.captures.map(key => captures[key]),
          ...entry.metadata.requestedChanges.fields.map(key => fields[key]),
        ].filter(Boolean).join(", ")}</div> : null}
      </li>)}</ul>
    </details>
    {available.length > 0 && <form onSubmit={event => {
      event.preventDefault();
      if (!action || !available.includes(action) || decision.isPending) return;
      if (!reviewed) { setMessage("Xác nhận đã xem bản nộp hiện tại."); return; }
      if (needsReason && !reason.trim()) { setMessage("Nhập lý do cụ thể."); return; }
      if (action === "NEEDS_MORE_INFO" && !captureTargets.length && !fieldTargets.length) {
        setMessage("Chọn ít nhất một ảnh hoặc trường cần bổ sung."); return;
      }
      if (action === "APPROVED" && !capabilityReview) {
        setMessage("Hãy xem phạm vi GPLX và chọn nhóm xe được duyệt.");
        return;
      }
      setMessage("");
      decision.mutate({
        ...(action === "APPROVED" ? { capabilityReview } : {}),
        revision: detail.revision, status: action, reason: needsReason ? reason.trim() : undefined,
        captures: action === "NEEDS_MORE_INFO" ? captureTargets : [],
        fields: action === "NEEDS_MORE_INFO" ? fieldTargets : [],
      });
    }}>
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Select aria-label="Quyết định" placeholder="Chọn quyết định" value={action} style={{ width: "100%" }}
          options={available.map(value => ({ value, label: labels[value] }))} onChange={setAction} />
        {action === "NEEDS_MORE_INFO" && <>
          <Select mode="multiple" aria-label="Ảnh cần bổ sung" placeholder="Ảnh cần bổ sung" style={{ width: "100%" }}
            options={Object.entries(captures).map(([value, label]) => ({ value, label }))} onChange={setCaptureTargets} />
          <Select mode="multiple" aria-label="Trường cần sửa" placeholder="Trường cần sửa" style={{ width: "100%" }}
            options={Object.entries(fields).map(([value, label]) => ({ value, label }))} onChange={setFieldTargets} />
        </>}
        {needsReason && <Input.TextArea aria-label="Lý do" placeholder="Lý do cụ thể gửi tài xế"
          maxLength={500} showCount value={reason} onChange={event => setReason(event.target.value)} />}
        <Checkbox checked={reviewed} onChange={event => setReviewed(event.target.checked)}>Tôi đã xem bản nộp hiện tại</Checkbox>
        {(message || decision.error) && <Alert type="error" title={message || errorMessage(decision.error)} />}
        <Button type="primary" htmlType="submit" loading={decision.isPending} disabled={!action || !available.includes(action)}>Lưu quyết định</Button>
      </Space>
    </form>}
  </Space>;
}

export default function VerificationReview() {
  const filters = useFilters();
  const client = useQueryClient();
  const [id, setId] = useState<string>();
  const [snapshot, setSnapshot] = useState<number>();
  const [notice, setNotice] = useState("");
  const search = filters.read("application_id");
  const status = filters.read("status");
  const params = new URLSearchParams({ limit: String(filters.size), offset: String(filters.size * filters.page) });
  if (search && uuid.test(search)) params.set("application_id", search);
  if (status && states[status]) params.set("status", status);
  const canSearch = !search || uuid.test(search);
  const queue = useQuery({
    queryKey: [...queueKey, params.toString()],
    queryFn: ({ signal }) => verificationFetch<Queue>("review-queue?" + params.toString(), { signal }),
    enabled: verificationEnabled && canSearch, retry: false, gcTime: 0,
  });
  const detailKey = [...queueKey, id, snapshot] as const;
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => verificationFetch<ReviewDetail>("applications/" + id + (snapshot ? "?snapshot=" + snapshot : ""), { signal }),
    enabled: verificationEnabled && !!id, retry: false, gcTime: 0,
  });
  return <>
    <Heading title="Xác minh hồ sơ tài xế" subtitle="Đối chiếu hồ sơ nộp từ ứng dụng tài xế."
      actions={<Space><Link to="/driver-documents">Hồ sơ hiện có</Link>
        <Refresh loading={queue.isFetching || detail.isFetching} onClick={() => {
          void queue.refetch(); if (id) void detail.refetch();
        }} /></Space>} />
    {!verificationEnabled ? <Alert type="info" title="Chưa cấu hình máy chủ eKYC." /> : <>
      <Space wrap>
        <Input.Search aria-label="Mã hồ sơ" placeholder="Mã hồ sơ đầy đủ" defaultValue={search}
          maxLength={36} enterButton="Tìm" onSearch={value => filters.update({ application_id: value.trim() })} />
        <Select aria-label="Trạng thái hồ sơ" placeholder="Tất cả trạng thái" allowClear value={status || undefined}
          options={statuses} style={{ minWidth: 170 }} onChange={value => filters.update({ status: value })} />
      </Space>
      {!canSearch && <Alert type="warning" title="Nhập mã hồ sơ UUID đầy đủ." />}
      {notice && <Alert type="success" title={notice} closable onClose={() => setNotice("")} />}
      <QueryError error={queue.error} retry={() => void queue.refetch()} />
      <Table<QueueItem> rowKey="id" loading={queue.isFetching} pagination={false} scroll={{ x: 760 }}
        dataSource={canSearch ? queue.data?.items ?? [] : []} columns={[
          { title: "Mã hồ sơ", dataIndex: "id", render: (value, row) => <Button type="link" onClick={() => {
            setId(row.id); setSnapshot(undefined); setNotice("");
          }}>{value}</Button> },
          { title: "Trạng thái", dataIndex: "status", render: value => states[value] },
          { title: "Thời gian nộp", dataIndex: "submittedAt", render: date },
          { title: "Lần bổ sung", dataIndex: "resubmissionCount" },
          { title: "Cảnh báo", dataIndex: "warningCount", render: value => value ? <Tag color="orange">{value}</Tag> : "0" },
        ]} />
      <Space><Button disabled={!filters.page} onClick={() => filters.update({ page: filters.page - 1 }, false)}>Trang trước</Button>
        <span>Trang {filters.page + 1}</span>
        <Button disabled={!canSearch || !queue.data?.hasMore} onClick={() => filters.update({ page: filters.page + 1 }, false)}>Trang sau</Button>
      </Space>
    </>}
    <Drawer title="Chi tiết xác minh tài xế" open={!!id} onClose={() => setId(undefined)} size="large" destroyOnHidden>
      {detail.isFetching ? <Loading /> : <QueryError error={detail.error} retry={() => void detail.refetch()} />}
      {id && detail.data && !detail.isFetching && !detail.error && <Review
        key={id + ":" + detail.data.revision + ":" + detail.data.document.revision}
        detail={detail.data} snapshot={snapshot} setSnapshot={setSnapshot} onChanged={() => {
          setNotice("Đã lưu quyết định.");
          void client.invalidateQueries({ queryKey: queueKey });
        }} />}
    </Drawer>
  </>;
}

