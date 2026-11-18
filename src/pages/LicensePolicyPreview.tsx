import { Alert, Button, Checkbox, Input, Select, Space, Tag } from "antd";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage, request } from "../lib/api";

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
  ISSUE_DATE_MISSING: "Cần đối chiếu ngày cấp để áp dụng đúng quy định.",
  LICENSE_EXPIRED: "GPLX đã hết hạn.",
  LICENSE_DATES_INCONSISTENT: "Ngày cấp hoặc ngày hết hạn cần đối chiếu.",
  EXPIRY_UNVERIFIED: "Cần xác minh hạn GPLX.",
  EXPIRY_CLASS_INCONSISTENT: "Thông tin hạn chưa phù hợp với hạng GPLX.",
  CLASS_OR_ISSUE_REGIME_UNVERIFIED: "Cần đối chiếu hạng GPLX và chế độ cấp.",
  RESTRICTION_UNVERIFIED: "Chưa có đủ thông tin về hạn chế trên GPLX.",
  RESTRICTION_SCOPE_UNVERIFIED: "Cần đối chiếu phạm vi của hạn chế.",
  AUTOMATIC_ONLY: "GPLX giới hạn ở xe số tự động.",
  LEGACY_B1_NON_PROFESSIONAL: "Hạng B1 cũ cấp cho người không hành nghề lái xe.",
  MOTORCYCLE_CLASS_LIMIT: "Hạng GPLX hiện tại nằm ngoài phạm vi nhóm mô tô này.",
  PASSENGER_CAR_CLASS_REQUIRED: "Cần hạng GPLX phù hợp để lái ô tô chở người.",
};

export function LicensePolicyPreview({ confirmed, onReviewChange }: {
  confirmed: Record<string, unknown>;
  onReviewChange: (review: ApprovalCapabilityReview | undefined) => void;
}) {
  const [date, setDate] = useState("");
  const [restriction, setRestriction] = useState("UNKNOWN");
  const [selected, setSelected] = useState<string[]>([]);
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
  });
  const invalidate = () => { setSelected([]); preview.reset(); onReviewChange(undefined); };
  return <section aria-label="Phạm vi GPLX theo nhóm xe">
    <h3>Phạm vi GPLX theo nhóm xe</h3>
    <p>Đối chiếu trực tiếp ngày cấp và hạn chế trên GPLX. Kết quả xem trước chỉ đánh giá phạm vi GPLX.</p>
    <Space wrap>
      <label htmlFor="license-preview-issued-on">Ngày cấp GPLX</label>
      <Input id="license-preview-issued-on" type="date" value={date} disabled={preview.isPending}
        onChange={event => { setDate(event.target.value); invalidate(); }} />
      <label htmlFor="license-preview-restriction">Hạn chế GPLX</label>
      <Select id="license-preview-restriction" value={restriction} disabled={preview.isPending}
        onChange={value => { setRestriction(value); invalidate(); }}
        options={[
          { value: "UNKNOWN", label: "Chưa xác minh" },
          { value: "VERIFIED_NONE", label: "Đã đối chiếu, không có hạn chế" },
          { value: "AUTO_ONLY", label: "Chỉ lái xe số tự động" },
          { value: "B.01", label: "B.01 · Chỉ lái ô tô hạng B số tự động" },
          { value: "A.03", label: "A.03 · Giới hạn dưới 175 cm³ / 14 kW" },
          { value: "OTHER", label: "Có hạn chế khác" },
        ]} />
      <Button htmlType="button" loading={preview.isPending} onClick={() => { invalidate(); preview.mutate(); }}>Xem nhóm xe</Button>
    </Space>
    <div role="status">
      {preview.error ? <Alert type="warning" title={errorMessage(preview.error)} /> : null}
      {preview.data?.length ? <>
        <p>Phiên bản chính sách {preview.data[0].result.policyVersion}</p>
        <ul>{preview.data.map(({ groupId, label, result }) => <li key={groupId}>
          {result.status === "ELIGIBLE" && <Checkbox checked={selected.includes(groupId)}
            onChange={event => {
              const ids = event.target.checked ? [...selected, groupId] : selected.filter(id => id !== groupId);
              setSelected(ids);
              onReviewChange(ids.length ? { policyVersion: result.policyVersion, issuedOn: date,
                restriction: reviewedRestriction, restrictionCode, selectedGroupIds: ids } : undefined);
            }}>Duyệt {label}</Checkbox>}
          {result.status !== "ELIGIBLE" && label} <Tag color={outcomes[result.status].color}>{outcomes[result.status].label}</Tag>
          {result.reasonCodes.map(code => <span key={code}> {explanations[code] ?? code}</span>)}
        </li>)}</ul>
      </> : null}
    </div>
  </section>;
}
