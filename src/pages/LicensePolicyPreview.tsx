import { Alert, Button, Checkbox, Input, Select, Tag, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useVerificationReviewDraft } from "./useVerificationReviewDraft";
import { errorMessage, request } from "../lib/api";
import { FilterField } from "../components/FilterField";

export type ApprovalCapabilityReview = {
  policyVersion: string;
  issuedOn: string;
  restriction: string;
  restrictionCode: string | null;
  selectedGroupIds: string[];
};

type Result = {
  groupId: string;
  label: string;
  result: { status: "ELIGIBLE" | "INELIGIBLE" | "REQUIRES_MANUAL_REVIEW"; reasonCodes: string[]; policyVersion: string };
};

const outcomes = {
  ELIGIBLE: { label: "Phù hợp phạm vi GPLX", color: "green" },
  INELIGIBLE: { label: "Không phù hợp", color: "red" },
  REQUIRES_MANUAL_REVIEW: { label: "Cần đối chiếu", color: "gold" },
};

const explanations: Record<string, string> = {
  LICENSE_CLASS_SCOPE_MATCH: "Hạng bằng, thời hạn và hạn chế phù hợp nhóm xe.",
  ISSUE_DATE_MISSING: "Chưa nhập ngày cấp GPLX. Hãy nhập ngày cấp trên mặt trước GPLX để xác định quy định áp dụng.",
  LICENSE_EXPIRED: "GPLX đã hết hạn.",
  LICENSE_DATES_INCONSISTENT: "Ngày cấp GPLX không hợp lệ (lớn hơn ngày hiện tại hoặc sau ngày hết hạn).",
  EXPIRY_UNVERIFIED: "Chưa xác minh được thời hạn GPLX (cần rõ ngày hết hạn hoặc trạng thái 'Không thời hạn').",
  EXPIRY_CLASS_INCONSISTENT:
    "Hạn GPLX không khớp với hạng bằng: bằng mô tô (A, A1, B1 cấp từ 01/01/2025; A1, A2, A3 cấp trước 01/01/2025) phải để 'Không thời hạn', còn bằng ô tô phải có ngày hết hạn cụ thể.",
  CLASS_OR_ISSUE_REGIME_UNVERIFIED:
    "Hạng GPLX không khớp với mốc ngày cấp: trước 01/01/2025 áp dụng hệ cũ (A1, A2, A3, B1, B2, C, D, E...); từ 01/01/2025 trở đi mới có hệ mới (A, A1, B1, B, C1, C, D1, D2, D...). Hãy kiểm tra lại ngày cấp hoặc yêu cầu tài xế sửa hạng GPLX.",
  RESTRICTION_UNVERIFIED:
    "Chưa chọn mục Hạn chế GPLX. Hãy đối chiếu mặt sau GPLX rồi chọn 'Đã đối chiếu, không có hạn chế' hoặc mã hạn chế tương ứng.",
  RESTRICTION_SCOPE_UNVERIFIED:
    "Mã hạn chế không khớp với hạng GPLX hoặc chế độ cấp (B.01 chỉ áp dụng cho hạng B cấp từ 01/01/2025; A.03 chỉ áp dụng cho hạng A cấp từ 01/01/2025).",
  AUTOMATIC_ONLY: "GPLX giới hạn ở xe số tự động.",
  LEGACY_B1_NON_PROFESSIONAL: "Hạng B1 cũ (trước 01/01/2025) chỉ cấp cho người không hành nghề lái xe.",
  MOTORCYCLE_CLASS_LIMIT: "Hạng GPLX hiện tại nằm ngoài phạm vi phân khối/công suất của nhóm mô tô này.",
  PASSENGER_CAR_CLASS_REQUIRED: "Cần hạng GPLX ô tô phù hợp để lái ô tô chở người.",
  LEGACY_TRUCK_PAYLOAD_REQUIRED: "Bằng hệ cũ (trước 01/01/2025) cần đối chiếu tải trọng thiết kế của xe tải.",
  TRAILER_ENTITLEMENT_REVIEW: "Bằng kéo rơ-moóc (hạng E / F) cần đối chiếu thủ công.",
};

export function LicensePolicyPreview({ confirmed, onReviewChange, draftScope }: {
  draftScope: readonly (string | number)[];
  confirmed: Record<string, unknown>;
  onReviewChange: (review: ApprovalCapabilityReview | undefined) => void;
}) {
  const [draft, updateDraft] = useVerificationReviewDraft<{
    date: string; restriction: string; selected: string[]; results?: Result[];
  }>([...draftScope, "license"], { date: "", restriction: "UNKNOWN", selected: [] });
  const { date, restriction, selected, results } = draft;
  const reviewedRestriction = restriction.includes(".") ? "UNKNOWN" : restriction;
  const restrictionCode = restriction.includes(".") ? restriction : null;
  const grades = Array.isArray(confirmed.gplx_classes)
    ? confirmed.gplx_classes.filter((grade): grade is string => typeof grade === "string")
    : [];
  const preview = useMutation({
    mutationFn: () => request<Result[]>("/api/admin/vehicle-catalog/license-preview", {
      method: "POST",
      body: {
        licenseClasses: grades,
        issuedOn: date || null,
        expiresOn: typeof confirmed.expiry_date === "string" ? confirmed.expiry_date : null,
        noExpiry: typeof confirmed.no_expiry === "boolean" ? confirmed.no_expiry : null,
        restriction: reviewedRestriction, restrictionCode,
      },
    }),
    onSuccess: results => updateDraft({ results }),
  });
  const invalidate = () => {
    updateDraft({ selected: [], results: undefined });
    preview.reset();
    onReviewChange(undefined);
  };
  const eligibleIds = results?.filter(item => item.result.status === "ELIGIBLE").map(item => item.groupId) ?? [];
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every(groupId => selected.includes(groupId));
  const sharedBlockingReasons = results?.length && eligibleIds.length === 0
    ? Array.from(new Set(results.flatMap(item => item.result.reasonCodes)))
    : [];
  const expirySummary = confirmed.no_expiry === true
    ? "Không thời hạn"
    : typeof confirmed.expiry_date === "string" && confirmed.expiry_date
      ? confirmed.expiry_date
      : "Chưa rõ";

  return <section aria-label="Phạm vi GPLX theo nhóm xe" className="verification-decision-box">
    <h4>Phạm vi GPLX theo nhóm xe</h4>
    <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
      Đối chiếu trực tiếp ngày cấp và hạn chế trên GPLX. Kết quả xem trước chỉ đánh giá phạm vi GPLX.
    </Typography.Paragraph>
    <div className="verification-inline-controls">
      <FilterField label="Ngày cấp GPLX" htmlFor="license-preview-issued-on">
        <Input id="license-preview-issued-on" type="date" value={date} disabled={preview.isPending || undefined}
          onChange={event => { updateDraft({ date: event.target.value }); invalidate(); }} />
      </FilterField>
      <FilterField label="Hạn chế GPLX" htmlFor="license-preview-restriction">
        <Select id="license-preview-restriction" value={restriction} disabled={preview.isPending || undefined}
          onChange={value => { updateDraft({ restriction: value }); invalidate(); }}
          options={[
            { value: "UNKNOWN", label: "Chưa xác minh" },
            { value: "VERIFIED_NONE", label: "Đã đối chiếu, không có hạn chế" },
            { value: "AUTO_ONLY", label: "Chỉ lái xe số tự động" },
            { value: "B.01", label: "B.01 · Chỉ lái ô tô hạng B số tự động" },
            { value: "A.03", label: "A.03 · Giới hạn dưới 175 cm³ / 14 kW" },
            { value: "OTHER", label: "Có hạn chế khác" },
          ]} />
      </FilterField>
      <Button htmlType="button" loading={preview.isPending} onClick={() => { invalidate(); preview.mutate(); }}>Xem nhóm xe</Button>
    </div>
    <div role="status">
      {preview.error ? <Alert type="warning" showIcon title={errorMessage(preview.error)} /> : null}
      {results?.length ? <>
        {sharedBlockingReasons.length > 0 ? (
          <Alert
            className="toolbar-note"
            type="warning"
            showIcon
            title={`Chưa có nhóm xe phù hợp (Hạng: ${grades.join(", ") || "—"} · Ngày cấp: ${date || "Chưa nhập"} · Hạn: ${expirySummary})`}
            description={sharedBlockingReasons.map(code => explanations[code] ?? code).join(" ")}
          />
        ) : null}
        <div className="verification-policy-header">
          <Typography.Text type="secondary">
            Phiên bản chính sách {results[0].result.policyVersion}
            {eligibleIds.length > 0 ? <span className="numeric"> · Đã chọn {selected.length}/{eligibleIds.length}</span> : null}
          </Typography.Text>
          {eligibleIds.length > 0 ? (
            <Button
              size="small"
              htmlType="button"
              onClick={() => {
                const next = allEligibleSelected ? [] : eligibleIds;
                updateDraft({ selected: next });
                onReviewChange(next.length ? {
                  policyVersion: results[0].result.policyVersion,
                  issuedOn: date,
                  restriction: reviewedRestriction,
                  restrictionCode,
                  selectedGroupIds: next,
                } : undefined);
              }}
            >
              {allEligibleSelected ? "Bỏ chọn tất cả" : "Chọn tất cả nhóm phù hợp"}
            </Button>
          ) : null}
        </div>
        <ul className="verification-policy-list">{results.map(({ groupId, label, result }) => <li key={groupId} className="verification-policy-item">
          <div className="verification-policy-main">
            {result.status === "ELIGIBLE" ? <Checkbox checked={selected.includes(groupId)}
              onChange={event => {
                const ids = event.target.checked ? [...selected, groupId] : selected.filter(id => id !== groupId);
                updateDraft({ selected: ids });
                onReviewChange(ids.length ? { policyVersion: result.policyVersion, issuedOn: date,
                  restriction: reviewedRestriction, restrictionCode, selectedGroupIds: ids } : undefined);
              }}>Duyệt {label}</Checkbox> : <span>{label}</span>}
            <Tag color={outcomes[result.status].color}>{outcomes[result.status].label}</Tag>
          </div>
          {result.reasonCodes.length > 0 ? (
            <div className="verification-policy-reason">
              {result.reasonCodes.map(code => explanations[code] ?? code).join(" ")}
            </div>
          ) : null}
        </li>)}</ul>
      </> : null}
    </div>
  </section>;
}
