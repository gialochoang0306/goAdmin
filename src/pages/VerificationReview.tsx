import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Descriptions, Drawer, Empty, Image, Input, Select, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import { DataTable, Heading, Loading, Panel, QueryError, Refresh } from "../components/common";
import { FilterField } from "../components/FilterField";
import { date } from "../lib/format";
import { errorMessage, request, verificationEnabled, verificationFetch } from "../lib/api";
import { LicensePolicyPreview, type ApprovalCapabilityReview } from "./LicensePolicyPreview";
import { FaceComparisonPanel } from "./FaceComparisonPanel";
import { useFilters } from "../lib/hooks";
import { captures, fieldComparison, fields, states, warningText, type QueueItem, type QueueResponse, type ReviewDetail, type UnsubmittedApplication, type VerificationWarning, verificationQueueKey, verificationReviewPath } from "./verificationReviewModel";

const statuses = [{ value: "PENDING_REVIEW", label: "Chờ duyệt" }, ...Object.entries(states).filter(([value]) => value !== "DRAFT").map(([value, label]) => ({ value, label }))];
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
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

function Review({ detail, snapshot, setSnapshot, onChanged, onPendingChange }: {
  detail: ReviewDetail; snapshot?: number; setSnapshot: (value?: number) => void;
  onChanged: () => void;
  onPendingChange: (pending: boolean) => void;
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
  useEffect(() => {
    onPendingChange(decision.isPending);
    return () => onPendingChange(false);
  }, [decision.isPending, onPendingChange]);
  const needsReason = action === "REJECTED" || action === "NEEDS_MORE_INFO" || action === "REVOKED";
  return <Space orientation="vertical" size="large" style={{ width: "100%" }}>
    <Descriptions size="small" column={1} items={[
      { key: "status", label: "Trạng thái", children: <Tag color={detail.status === "APPROVED" ? "green" : detail.status === "REJECTED" || detail.status === "REVOKED" ? "red" : "gold"}>{states[detail.status] ?? detail.status}</Tag> },
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
    <FilterField label="Phiên bản hồ sơ đang xem">
      <Select aria-label="Bản nộp" value={snapshot ?? detail.submissionRevision} style={{ minWidth: 260 }}
        options={detail.submissions.map(item => ({ value: item.revision, label: "Bản " + item.revision + " · " + date(item.submittedAt) }))}
        onChange={value => setSnapshot(value === detail.submissionRevision ? undefined : value)} />
    </FilterField>
    {!current && (
      <Alert
        type="info"
        showIcon
        title={`Đang xem bản nộp cũ (Bản ${doc.revision}). Chuyển về bản mới nhất (Bản ${detail.submissionRevision}) để ra quyết định.`}
      />
    )}
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
    <div className="verification-capture-grid">
      {Object.entries(captures).map(([slot, label]) => {
        const capture = doc.captures[slot];
        if (!capture) return null;
        const result = doc.proposals[slot]?.result;
        return <section key={slot} aria-label={label} className="verification-capture-card">
          <h4>{label}</h4>
          <PrivateImage id={detail.id} slot={slot} revision={doc.revision} />
          <Typography.Text type="secondary" className="muted">
            {capture.quality ? capture.quality.width + " × " + capture.quality.height + " px" : "Chưa có số đo chất lượng"}
          </Typography.Text>
          {warnings?.filter(warning => warning.evidenceSource === "FACE_COMPARISON" && warning.slot === slot)
            .map(warning => <Alert key={warning.code} type={warning.severity === "INFO" ? "info" : "warning"}
              title={warning.humanReadableMessage} description={<>{warning.recommendedAction} <Tag>{warning.code}</Tag></>} />)}
          {capture.quality?.warnings.map(code => <Tag key={code} color="gold">{warningText(code)}</Tag>)}
          {result ? [...new Set([
            result.qrStatus, result.ocrStatus, ...result.warnings,
            ...Object.values(result.fieldStatuses ?? {}).filter(code => code !== "READ"),
          ])].map(code =>
            <Typography.Text key={code} type="secondary" className="muted">{warningText(code)}</Typography.Text>) : <Typography.Text type="secondary" className="muted">Chưa có lượt trích xuất cho ảnh này.</Typography.Text>}
        </section>;
      })}
    </div>
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
    {available.length > 0 && <section className="verification-decision-box" aria-label="Quyết định xét duyệt">
      <h4>Quyết định xét duyệt</h4>
      <form onSubmit={event => {
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
        <FilterField label="Quyết định">
          <Select aria-label="Quyết định" placeholder="Chọn quyết định" value={action} style={{ width: "100%" }}
            options={available.map(value => ({ value, label: labels[value] }))} onChange={setAction} />
        </FilterField>
        {action === "NEEDS_MORE_INFO" && <>
          <FilterField label="Ảnh cần bổ sung">
            <Select mode="multiple" aria-label="Ảnh cần bổ sung" placeholder="Ảnh cần bổ sung" style={{ width: "100%" }}
              options={Object.entries(captures).map(([value, label]) => ({ value, label }))} onChange={setCaptureTargets} />
          </FilterField>
          <FilterField label="Trường cần sửa">
            <Select mode="multiple" aria-label="Trường cần sửa" placeholder="Trường cần sửa" style={{ width: "100%" }}
              options={Object.entries(fields).map(([value, label]) => ({ value, label }))} onChange={setFieldTargets} />
          </FilterField>
        </>}
        {needsReason && <FilterField label="Lý do">
          <Input.TextArea aria-label="Lý do" placeholder="Lý do cụ thể gửi tài xế"
            maxLength={500} showCount value={reason} onChange={event => setReason(event.target.value)} />
        </FilterField>}
        <Checkbox checked={reviewed} onChange={event => setReviewed(event.target.checked)}>Tôi đã xem bản nộp hiện tại</Checkbox>
        {(message || decision.error) && <Alert type="error" title={message || errorMessage(decision.error)} />}
        <Button type="primary" danger={action === "REJECTED" || action === "REVOKED"} htmlType="submit" loading={decision.isPending} disabled={!action || !available.includes(action)}>Lưu quyết định</Button>
      </Space>
    </form>
    </section>}
  </Space>;
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
          <Select aria-label="Trạng thái hồ sơ" placeholder="Tất cả trạng thái" allowClear value={status || undefined}
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
            { title: "Trạng thái", dataIndex: "status", render: value => <Tag color={value === "APPROVED" ? "green" : value === "REJECTED" || value === "REVOKED" ? "red" : "gold"}>{states[value] ?? value}</Tag> },
            { title: "Thời gian nộp", dataIndex: "submittedAt", render: date },
            { title: "Lần bổ sung", dataIndex: "resubmissionCount", align: "right" },
            { title: "Cảnh báo", dataIndex: "warningCount", align: "right", render: value => value ? <Tag color="orange">{value}</Tag> : "0" },
          ]} />
        <div className="verification-pagination">
          <Button size="small" disabled={!filters.page} onClick={() => filters.update({ page: filters.page - 1 }, false)}>Trang trước</Button>
          <Typography.Text type="secondary">Trang {filters.page + 1}</Typography.Text>
          <Button size="small" disabled={!canSearch || !queue.data?.hasMore} onClick={() => filters.update({ page: filters.page + 1 }, false)}>Trang sau</Button>
        </div>
      </Panel>
    </>}
    <Drawer aria-label="Chi tiết xác minh tài xế" title="Chi tiết xác minh tài xế" open={!!id} closable={!decisionPending} keyboard={!decisionPending} mask={{ closable: !decisionPending }} onClose={() => { if (!decisionPending) {
      filters.update({ review: undefined, application_id: search === id ? undefined : search }, false);
      setHistorical(undefined);
    } }} size="large" destroyOnHidden>
      {detail.isFetching ? <Loading /> : <QueryError error={detail.error} retry={() => void detail.refetch()} />}
      {id && detail.data && !detail.isFetching && !detail.error && !("document" in detail.data) && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tài xế chưa nộp hồ sơ xác minh." />
      )}
      {id && detail.data && !detail.isFetching && !detail.error && "document" in detail.data && <Review
        key={id + ":" + detail.data.revision + ":" + detail.data.document.revision}
        detail={detail.data} snapshot={snapshot} setSnapshot={revision => setHistorical(revision ? { id, revision } : undefined)} onPendingChange={setDecisionPending} onChanged={() => {
          setNotice("Đã lưu quyết định.");
          void client.invalidateQueries({ queryKey: verificationQueueKey });
          void client.invalidateQueries({ queryKey: ["admin", "driver"] });
          void client.invalidateQueries({ queryKey: ["admin", "drivers"] });
        }} />}
    </Drawer>
  </>;
}

