import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { beforeEach, expect, it, vi } from "vitest";
import VerificationReview from "../pages/VerificationReview";
import { fieldComparison, type ReviewDetail } from "../pages/verificationReviewModel";
import { ApiError, request, verificationFetch } from "../lib/api";

vi.mock("../lib/api", async load => ({
  ...await load<typeof import("../lib/api")>(), verificationEnabled: true, verificationFetch: vi.fn(), request: vi.fn(),
}));

const id = "00000000-0000-4000-8000-000000000001";
const detail: ReviewDetail = {
  id, status: "UNDER_REVIEW", revision: 5, submissionRevision: 4,
  warningCount: 1, resubmissionCount: 0, submittedAt: "2026-01-02T03:00:00Z",
  submissions: [{ revision: 4, submittedAt: "2026-01-02T03:00:00Z" }],
  history: [],
  document: {
    revision: 4, submittedAt: "2026-01-02T03:00:00Z",
    confirmed: { cccd_name: "Đỗ Mẫu", no_expiry: true, expiry_date: null },
    captures: {}, proposals: {},
  },
};

beforeEach(() => {
  vi.mocked(verificationFetch).mockImplementation(async (path) => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false };
    return detail;
  });
});

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ConfigProvider theme={{ token: { motion: false } }}><MemoryRouter>
    <QueryClientProvider client={client}><VerificationReview /></QueryClientProvider>
  </MemoryRouter></ConfigProvider>);
  return userEvent.setup({ pointerEventsCheck: 0 });
}

it("requires reason and review acknowledgment then submits the displayed revision", async () => {
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  await user.click(await screen.findByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Từ chối", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  expect(await screen.findByText("Xác nhận đã xem bản nộp hiện tại.")).toBeVisible();
  await user.click(screen.getByRole("checkbox", { name: "Tôi đã xem bản nộp hiện tại" }));
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  expect(await screen.findByText("Nhập lý do cụ thể.")).toBeVisible();
  await user.type(screen.getByRole("textbox", { name: "Lý do" }), "Synthetic");
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  await waitFor(() => expect(verificationFetch).toHaveBeenCalledWith("applications/" + id + "/decision", {
    body: { revision: 5, status: "REJECTED", reason: "Synthetic", captures: [], fields: [] },
  }));
});

it("surfaces denied access and renders no record", async () => {
  vi.mocked(verificationFetch).mockRejectedValue(new ApiError("Không có quyền eKYC.", "FORBIDDEN", 403));
  mount();
  expect(await screen.findByText("Không có quyền eKYC.")).toBeVisible();
  expect(screen.queryByRole("button", { name: id })).not.toBeInTheDocument();
});

it("distinguishes a source conflict from a confirmed value that differs from every proposal", () => {
  const base = { sourceDocument: "CCCD", fieldKey: "full_name", parseStatus: "parsed", validationStatus: "valid", conflict: true };
  const document = {
    ...detail.document, proposals: { cccd_front: { result: {
      candidates: [
        { ...base, source: "QR", candidateValue: "Do Mau" },
        { ...base, source: "OCR", candidateValue: "Đỗ Mầu" },
      ], qrStatus: "QR_FOUND_SUPPORTED", ocrStatus: "OCR_READ", warnings: [],
    } } },
  };
  const row = fieldComparison(document).find(item => item.key === "cccd_name");
  expect(row).toMatchObject({ confirmed: "Đỗ Mẫu", conflicts: true, differs: true });
  expect(fieldComparison(document).find(item => item.key === "expiry_date")?.confirmed).toBe("Không thời hạn");
});

it("runs optional face comparison only for the consented current submission", async () => {
  vi.mocked(verificationFetch).mockImplementation(async (path) => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false };
    if (path.endsWith("/face-comparison")) return {
      mode: "EXPERIMENTAL", modelVersion: "fake", qualityVersion: "fake-quality",
      liveness: "NOT_EVALUATED", quality: { selfie: "MULTIPLE_FACES" },
      verificationWarnings: [{
        code: "FACE_INSUFFICIENT_QUALITY", severity: "WARNING", documentType: "SELFIE",
        slot: "selfie", fieldKey: null, humanReadableMessage: "Ảnh selfie có nhiều khuôn mặt.",
        recommendedAction: "Chụp lại selfie.", evidenceSource: "FACE_COMPARISON", documentRevision: 4,
        requiresReview: true, blocksSubmission: false, blocksActivation: false,
      }],
      pairs: [{ left: "cccd_front", right: "gplx_front", status: "INCONCLUSIVE", score: 0.89 }],
    };
    return {
      ...detail, faceComparisonAvailable: true,
      document: { ...detail.document, captures: { selfie: {} }, faceConsent: { version: "face-comparison-v1" } },
    };
  });
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  await user.click(await screen.findByRole("button", { name: "Chạy đối chiếu thử nghiệm" }));
  expect(await screen.findByText("Ảnh selfie có nhiều khuôn mặt.")).toBeVisible();
  const hideResult = await screen.findByRole("button", { name: "Ẩn kết quả đối chiếu" });
  const panel = screen.getByRole("region", { name: "Đối chiếu khuôn mặt" });
  expect(panel).toHaveTextContent(/Chưa đủ căn cứ kết luận\s*·\s*Cosine 0\.890/);
  expect(screen.getByText(/Có nhiều khuôn mặt/)).toBeInTheDocument();
  expect(screen.getByText("Kiểm tra người thật")).toBeInTheDocument();
  expect(verificationFetch).toHaveBeenLastCalledWith("applications/" + id + "/face-comparison",
    expect.objectContaining({ body: { revision: 5, submissionRevision: 4 } }));
  await user.click(hideResult);
  expect(panel).not.toHaveTextContent("Cosine 0.890");
});


it("displays the backend warning and leaves supplementation available when approval is blocked", async () => {
  vi.mocked(verificationFetch).mockImplementation(async path => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false };
    return {
      ...detail,
      verificationWarnings: [{
        code: "GPLX_EXPIRED", severity: "CRITICAL", documentType: "GPLX",
        slot: "gplx_front", fieldKey: "expiry_date",
        humanReadableMessage: "Ngày hết hạn GPLX đã qua.",
        recommendedAction: "Bổ sung giấy tờ còn hiệu lực.",
        evidenceSource: "CONFIRMED_FIELDS", documentRevision: 4,
        requiresReview: true, blocksSubmission: false, blocksActivation: true,
      }],
    };
  });
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  expect(await screen.findByText("Ngày hết hạn GPLX đã qua.")).toBeVisible();
  await user.click(screen.getByRole("combobox", { name: "Quyết định" }));
  expect(screen.queryByText("Phê duyệt", { selector: ".ant-select-item-option-content" })).toBeNull();
  await user.click(screen.getByText("Yêu cầu bổ sung", { selector: ".ant-select-item-option-content" }));
  expect(screen.getByRole("textbox", { name: "Lý do" })).toBeVisible();
});


it("previews license scope without including identity fields or changing the review state", async () => {
  vi.mocked(request).mockResolvedValueOnce([{
    groupId: "car-auto", label: "Ô tô cá nhân số tự động", result: {
      status: "REQUIRES_MANUAL_REVIEW", reasonCodes: ["ISSUE_DATE_MISSING"], policyVersion: "test",
    },
  }]);
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  await user.click(await screen.findByRole("button", { name: "Xem nhóm xe" }));
  expect(await screen.findByText("Cần đối chiếu")).toBeVisible();
  expect(request).toHaveBeenCalledWith("/api/admin/vehicle-catalog/license-preview", {
    method: "POST",
    body: { licenseClasses: [], issuedOn: null, expiresOn: null, noExpiry: true,
      restriction: "UNKNOWN", restrictionCode: null },
  });
  expect(verificationFetch).not.toHaveBeenCalledWith(expect.stringContaining("/decision"), expect.anything());
});

it("submits only eligible capability groups that the reviewer selected", async () => {
  vi.mocked(request).mockResolvedValueOnce([
    { groupId: "car-auto", label: "Ô tô số tự động",
      result: { status: "ELIGIBLE", reasonCodes: [], policyVersion: "SYNTHETIC_V1" } },
    { groupId: "car-manual", label: "Ô tô số sàn",
      result: { status: "INELIGIBLE", reasonCodes: ["AUTOMATIC_ONLY"], policyVersion: "SYNTHETIC_V1" } },
  ]);
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  fireEvent.change(screen.getByLabelText("Ngày cấp GPLX"), { target: { value: "2025-05-01" } });
  await user.click(screen.getByRole("button", { name: "Xem nhóm xe" }));
  expect(screen.queryByRole("checkbox", { name: "Duyệt Ô tô số sàn" })).toBeNull();
  await user.click(await screen.findByRole("checkbox", { name: "Duyệt Ô tô số tự động" }));
  await user.click(screen.getByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Phê duyệt", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("checkbox", { name: "Tôi đã xem bản nộp hiện tại" }));
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  await waitFor(() => expect(verificationFetch).toHaveBeenCalledWith("applications/" + id + "/decision", {
    body: expect.objectContaining({ revision: 5, status: "APPROVED", capabilityReview: {
      policyVersion: "SYNTHETIC_V1", issuedOn: "2025-05-01", restriction: "UNKNOWN",
      restrictionCode: null, selectedGroupIds: ["car-auto"],
    } }),
  }));
});

it("renders locked identity and side-by-side approved baseline for re-verification updates", async () => {
  vi.mocked(verificationFetch).mockImplementation(async path => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false };
    return {
      ...detail,
      approvedRevision: 2,
      approvedSubmissionRevision: 1,
      identityLocked: true,
      lockedIdentity: { cccdId: "999206000001", fullName: "Đỗ Mẫu", dob: "1990-01-01" },
      approvedDocument: {
        revision: 1,
        submittedAt: "2026-01-01T00:00:00Z",
        confirmed: { cccd_name: "Đỗ Mẫu", gplx_classes: ["A1"], no_expiry: true, expiry_date: null },
        captures: {},
        proposals: {},
      },
      document: {
        ...detail.document,
        confirmed: { cccd_name: "Đỗ Mẫu", gplx_classes: ["A1", "B"], no_expiry: false, expiry_date: "2036-01-01" },
      },
    };
  });
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  expect(await screen.findByText("Danh tính đã khóa (CCCD)")).toBeVisible();
  expect(screen.getByText("999206000001")).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "Đã duyệt trước đó" })).toBeVisible();
  expect(screen.getByText("A1")).toBeVisible();
  expect(screen.getByText("A1, B")).toBeVisible();
});

it("shows old-snapshot warning when viewing prior submission and styles reject as danger", async () => {
  vi.mocked(verificationFetch).mockImplementation(async (path) => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false };
    if (path.includes("?snapshot=3")) {
      return {
        ...detail,
        submissions: [
          { revision: 4, submittedAt: "2026-01-02T03:00:00Z" },
          { revision: 3, submittedAt: "2026-01-01T03:00:00Z" },
        ],
        document: { ...detail.document, revision: 3, submittedAt: "2026-01-01T03:00:00Z" },
      };
    }
    return {
      ...detail,
      submissions: [
        { revision: 4, submittedAt: "2026-01-02T03:00:00Z" },
        { revision: 3, submittedAt: "2026-01-01T03:00:00Z" },
      ],
    };
  });
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  await user.click(await screen.findByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Từ chối", { selector: ".ant-select-item-option-content" }));
  expect(screen.getByRole("button", { name: "Lưu quyết định" })).toHaveClass("ant-btn-dangerous");

  await user.click(screen.getByRole("combobox", { name: "Bản nộp" }));
  await user.click(screen.getByText(/Bản 3 ·/, { selector: ".ant-select-item-option-content" }));
  expect(await screen.findByText(/Đang xem bản nộp cũ \(Bản 3\)/)).toBeVisible();
  expect(screen.queryByRole("button", { name: "Lưu quyết định" })).not.toBeInTheDocument();
});
