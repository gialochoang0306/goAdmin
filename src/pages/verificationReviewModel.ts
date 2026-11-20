export const verificationReviewPath = "/driver-documents/verification";
export const verificationQueueKey = ["admin", "ekyc-review"] as const;

export function verificationApplicationPath(applicationId: string) {
  return verificationReviewPath + "?" + new URLSearchParams({ application_id: applicationId });
}

export const states: Record<string, string> = {
  DRAFT: "Chưa nộp", SUBMITTED: "Đã nộp", UNDER_REVIEW: "Đang xét duyệt", NEEDS_MORE_INFO: "Cần bổ sung",
  APPROVED: "Đã duyệt", REJECTED: "Đã từ chối", REVOKED: "Đã thu hồi",
};

/**
 * Hàng chờ chỉ chứa hồ sơ đã từng có bản nộp (JOIN theo submission_revision),
 * nên DRAFT ở đây luôn là hồ sơ đã nộp trước đó và tài xế đang mở bản cập nhật.
 * Hiển thị "Chưa nộp" cho trường hợp này là sai sự thật.
 */
export function queueStatusLabel(status: string | null | undefined): string {
  if (!status) return "";
  if (status === "DRAFT") return "Đang cập nhật giấy tờ";
  return states[status] ?? status;
}
export function verificationStatusColor(status: string | null | undefined): string {
  switch (status) {
    case "APPROVED":
      return "green";
    case "REJECTED":
    case "REVOKED":
      return "red";
    case "UNDER_REVIEW":
      return "blue";
    case "SUBMITTED":
    case "NEEDS_MORE_INFO":
      return "gold";
    default:
      return "default";
  }
}
export const captures: Record<string, string> = {
  cccd_front: "CCCD mặt trước", cccd_back: "CCCD mặt sau", gplx_front: "GPLX mặt trước",
  gplx_back: "GPLX mặt sau", selfie: "Selfie",
};
export const fields: Record<string, string> = {
  cccd_expiry_date: "Hạn CCCD",
  cccd_name: "Họ tên CCCD", cccd_id: "Số định danh", cccd_dob: "Ngày sinh CCCD",
  cccd_gender: "Giới tính", gplx_name: "Họ tên GPLX", gplx_number: "Số GPLX",
  gplx_dob: "Ngày sinh GPLX", gplx_classes: "Hạng GPLX", expiry_date: "Hạn GPLX",
};
const messages: Record<string, string> = {
  SMALL: "Ảnh có cạnh ngắn dưới 480 px.",
  LOW_RESOLUTION: "Độ phân giải thẻ thấp.",
  ORIENTATION_UNCERTAIN: "Chưa xác định chắc chiều thẻ.",
  RAW_FRAME_FALLBACK: "Đã thử đọc trên ảnh gốc vì không chuẩn bị được ảnh thẻ.",
  DOCUMENT_SLOT_MISMATCH: "Ảnh có thể sai loại giấy tờ hoặc sai mặt.",
  CARD_NOT_FOUND: "Không tìm thấy vùng thẻ đáng tin cậy.",
  CARD_CROPPED: "Ảnh có thể thiếu một phần thẻ.",
  LOW_KEYPOINT_CONFIDENCE: "Một hoặc nhiều góc thẻ chưa đủ tin cậy.",
  CARD_GEOMETRY_UNCERTAIN: "Hình học thẻ cần được xem lại.",
  IMAGE_TOO_SMALL: "Vùng thẻ quá nhỏ.",
  IMAGE_BLURRY: "Ảnh có dấu hiệu mờ.",
  IMAGE_GLARE: "Ảnh có vùng lóa.",
  IMAGE_TOO_DARK: "Ảnh quá tối.",
  QR_NOT_FOUND: "Không tìm thấy mã QR.",
  QR_DECODE_FAILED: "Không giải mã được QR.",
  QR_FOUND_SUPPORTED: "Đã đọc dữ liệu QR.",
  QR_FOUND_UNSUPPORTED: "Định dạng dữ liệu QR chưa được hỗ trợ.",
  OCR_READ: "OCR có đề xuất.",
  OCR_NO_TEXT: "OCR không tìm thấy chữ.",
  OCR_NO_FIELDS: "OCR không trích xuất được trường hợp lệ.",
  OCR_UNSUPPORTED: "Mặt giấy tờ chưa hỗ trợ OCR.",
  OCR_FAILED: "OCR không hoàn thành.",
  OCR_UNAVAILABLE: "Engine OCR không khả dụng.",
  QR_OCR_MISMATCH: "Hai nguồn cho giá trị khác nhau.",
  DIACRITIC_MISMATCH: "Họ tên hai giấy tờ khác dấu.",
  NAME_MISMATCH: "Họ tên hai giấy tờ khác nhau.",
  DOB_MISMATCH: "Ngày sinh hai giấy tờ khác nhau.",
  NAME_AND_DOB_MISMATCH: "Họ tên và ngày sinh hai giấy tờ khác nhau.",
  SKIPPED: "Bước này không chạy.",
  LOCKED_CCCD_ID_CHANGED: "Số định danh CCCD khác với danh tính đã xác minh.",
  LOCKED_IDENTITY_NAME_MISMATCH: "Họ tên CCCD không khớp với danh tính đã xác minh.",
  LOCKED_IDENTITY_DOB_MISMATCH: "Ngày sinh CCCD không khớp với danh tính đã xác minh.",
  GPLX_HOLDER_MISMATCH: "GPLX mang họ tên hoặc ngày sinh của người khác.",
  DUPLICATE_CCCD_ACROSS_ACCOUNTS: "Số CCCD đã được xác minh bởi một tài khoản khác.",
  DUPLICATE_GPLX_ACROSS_ACCOUNTS: "Số GPLX đã được xác minh bởi một tài khoản khác.",
  CCCD_RENEWAL_REQUIRES_REVIEW: "Cập nhật ngày hết hạn CCCD mới.",
  GPLX_UPDATED_REQUIRES_REVIEW: "Cập nhật số GPLX hoặc nâng hạng GPLX mới.",
};
export const warningText = (code: string) => messages[code] ?? "Cần xem lại (" + code + ").";

export type Candidate = {
  source: string; sourceDocument: string; sourceSide?: string; fieldKey: string; candidateValue?: unknown;
  parseStatus: string; validationStatus: string; conflict: boolean;
};
export type ReviewDocument = {
  confirmed: Record<string, unknown>;
  captures: Record<string, { quality?: { width: number; height: number; warnings: string[] } }>;
  proposals: Record<string, { result: {
    candidates: Candidate[]; warnings: string[]; qrStatus: string; ocrStatus: string;
    fieldStatuses?: Record<string, string>;
  } }>;
  warningCodes?: string[];
  warningAcknowledgement?: { revision: number; codes: string[] } | null;
  faceConsent?: { version: string };
  submittedAt: string;
  revision: number;
};
export type QueueItem = {
  id: string; status: string; revision: number; submissionRevision: number;
  submittedAt: string; warningCount: number; resubmissionCount: number;
  driverId?: number | null; driverName?: string | null; driverPhone?: string | null;
};
export type QueueResponse = {
  items: QueueItem[]; hasMore: boolean; totalElements: number;
};
export type VerificationWarning = {
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING';
  documentType: string | null;
  slot: string | null;
  fieldKey: string | null;
  humanReadableMessage: string;
  recommendedAction: string;
  evidenceSource: string;
  documentRevision: number;
  requiresReview: boolean;
  blocksSubmission: boolean;
  blocksActivation: boolean;
};

export type LockedIdentity = {
  cccdId?: string | null;
  maskedCccdId?: string | null;
  fullName?: string | null;
  dob?: string | null;
  verifiedGplxNumber?: string | null;
};

export type UnsubmittedApplication = Pick<QueueItem, "id" | "status" | "revision">;

export type ReviewDetail = QueueItem & {
  verificationWarnings?: VerificationWarning[];
  approvedRevision?: number | null;
  approvedSubmissionRevision?: number | null;
  identityLocked?: boolean;
  lockedIdentity?: LockedIdentity | null;
  identityHold?: boolean;
  identityHoldReason?: string | null;
  approvedDocument?: ReviewDocument | null;
  document: ReviewDocument;
  faceComparisonAvailable?: boolean;
  submissions: { revision: number; submittedAt: string }[];
  editedFields?: string[];
  requestedChanges?: { captures: string[]; fields: string[] };
  history: { revision: number; actor?: string; role: string; action: string; at: string;
    metadata?: { reason?: string; requestedChanges?: { captures: string[]; fields: string[] } } }[];
};

export function displayValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value) || "—";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (value && typeof value === "object" && "no_expiry" in value) {
    return value.no_expiry === true ? "Không thời hạn" :
      "expiry_date" in value ? displayValue(value.expiry_date) : "—";
  }
  return "—";
}

export function formatFieldText(key: string, formatted: string): string {
  if (key === "cccd_gender") {
    if (formatted === "MALE") return "Nam";
    if (formatted === "FEMALE") return "Nữ";
  }
  return formatted;
}

const mapping: Record<string, Record<string, string>> = {
  CCCD: { full_name: "cccd_name", id_number: "cccd_id", dob: "cccd_dob", gender: "cccd_gender", expiry: "cccd_expiry_date" },
  GPLX: { full_name: "gplx_name", id_number: "gplx_number", dob: "gplx_dob", vehicle_class: "gplx_classes", expiry: "expiry_date" },
};
export function fieldComparison(document: ReviewDocument, approvedDocument?: ReviewDocument | null) {
  const candidates = Object.values(document.proposals).flatMap(proposal => proposal.result.candidates);
  return Object.entries(fields).map(([key, label]) => {
    const options = candidates.filter(item => mapping[item.sourceDocument]?.[item.fieldKey] === key
      && item.parseStatus === "parsed" && item.validationStatus === "valid");
    const confirmed = displayValue(key === "expiry_date" ? document.confirmed : document.confirmed[key]);
    const approvedConfirmed = approvedDocument
      ? displayValue(key === "expiry_date" ? approvedDocument.confirmed : approvedDocument.confirmed[key])
      : undefined;
    const proposed = options.map(item => ({ ...item, value: displayValue(item.candidateValue) }));
    const identity = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
    const comparable = (value: string) => key === "gplx_classes"
      ? identity(value).split(/,\s*/).sort().join(",") : identity(value);
    return { key, label, confirmed, approvedConfirmed, proposed,
      changedFromApproved: approvedConfirmed !== undefined && comparable(approvedConfirmed) !== comparable(confirmed),
      conflicts: options.some(item => item.conflict)
        || new Set(proposed.map(item => comparable(item.value))).size > 1,
      differs: proposed.length > 0 && !proposed.some(item => comparable(item.value) === comparable(confirmed)),
    };
  });
}
