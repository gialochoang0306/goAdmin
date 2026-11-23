import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { beforeEach, expect, it, vi } from "vitest";
import VerificationReview from "../pages/VerificationReview";
import { fieldComparison, queueStatusLabel, verificationStatusColor, type ReviewDetail } from "../pages/verificationReviewModel";
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
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
    return detail;
  });
});

function mount(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
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
  expect(await screen.findByText("Xác nhận đã đối chiếu ảnh và thông tin của bản nộp.")).toBeVisible();
  await user.click(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ }));
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
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
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
  // Face comparison runs automatically once detail loads with faceConsent + faceComparisonAvailable.
  expect(await screen.findByText("Ảnh selfie có nhiều khuôn mặt.")).toBeVisible();
  const hideResult = await screen.findByRole("button", { name: "Ẩn kết quả đối chiếu" });
  const panel = screen.getByRole("region", { name: "Đối chiếu khuôn mặt" });
  expect(panel).toHaveTextContent(/Chưa đủ căn cứ kết luận\s*·\s*Cosine 0\.890/);
  expect(screen.getByText(/Có nhiều khuôn mặt/)).toBeInTheDocument();
  expect(screen.getByText("Kiểm tra người thật")).toBeInTheDocument();
  expect(verificationFetch).toHaveBeenCalledWith("applications/" + id + "/face-comparison",
    expect.objectContaining({ body: { revision: 5, submissionRevision: 4 } }));
  await user.click(hideResult);
  expect(panel).not.toHaveTextContent("Cosine 0.890");
  // Manual re-run remains available after hiding results.
  await user.click(screen.getByRole("button", { name: "Chạy đối chiếu thử nghiệm" }));
  expect(await screen.findByText(/Cosine 0\.890/)).toBeVisible();
});


it("displays the backend warning and leaves supplementation available when approval is blocked", async () => {
  vi.mocked(verificationFetch).mockImplementation(async path => {
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
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
  await user.click(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ }));
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
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
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
    if (path.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
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


it("revokes an approved verification with a reason and the displayed revision", async () => {
  const approved = { ...detail, status: "APPROVED", verificationWarnings: [] };
  vi.mocked(request).mockResolvedValue({ enabled: false, groups: [] });
  vi.mocked(verificationFetch).mockImplementation(async path =>
    path.startsWith("review-queue") ? { items: [approved], hasMore: false, totalElements: 1 } : approved);
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  await user.click(await screen.findByRole("combobox", { name: "Quyết định" }));
  await user.click(await screen.findByText("Thu hồi xác minh", { selector: ".ant-select-item-option-content" }));
  await user.type(await screen.findByRole("textbox", { name: "Lý do" }), "Giấy phép bị thu hồi");
  await user.click(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ }));
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  await waitFor(() => expect(verificationFetch).toHaveBeenCalledWith(
    "applications/" + id + "/decision", { body: { revision: 5, status: "REVOKED", reason: "Giấy phép bị thu hồi", captures: [], fields: [] } },
  ));
});

it("loads a private image only when opened and revokes its blob URL on unmount", async () => {
  const createObjectURL = vi.fn(() => "blob:review-test");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
  try {
    const withCapture = { ...detail, document: { ...detail.document, captures: { cccd_front: {} } } };
    vi.mocked(verificationFetch).mockImplementation(async path => {
      if (path.startsWith("review-queue")) return { items: [withCapture], hasMore: false, totalElements: 1 };
      if (path.includes("/captures/")) return new Blob(["synthetic image"], { type: "image/png" });
      return withCapture;
    });
    const user = mount();
    await user.click(await screen.findByRole("button", { name: id }));
    expect(await screen.findByRole("button", { name: "Mở ảnh" })).toBeVisible();
    expect(vi.mocked(verificationFetch).mock.calls.some(([path]) => path.includes("/captures/"))).toBe(false);
    await user.click(screen.getByRole("button", { name: "Mở ảnh" }));
    expect(await screen.findByAltText("CCCD mặt trước")).toHaveAttribute("src", "blob:review-test");
    expect(verificationFetch).toHaveBeenCalledWith("applications/" + id + "/captures/cccd_front?snapshot=4",
      expect.objectContaining({ binary: true, signal: expect.any(AbortSignal) }));
    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:review-test");
  } finally {
    vi.unstubAllGlobals();
  }
});


it("keeps the eKYC drawer open and sends one decision while a review is pending", async () => {
  const path = "applications/" + id + "/decision";
  let resolveDecision!: (value: ReviewDetail) => void;
  const response = new Promise<ReviewDetail>(resolve => { resolveDecision = resolve; });
  const pendingDecision = vi.fn(() => response);
  vi.mocked(verificationFetch).mockImplementation(async requestPath => {
    if (requestPath === path) return pendingDecision();
    if (requestPath.startsWith("review-queue")) return { items: [detail], hasMore: false, totalElements: 1 };
    return detail;
  });

  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  const drawer = (await screen.findByText("Chi tiết xác minh tài xế")).closest("[role=dialog]")!;
  expect(drawer.querySelector(".ant-drawer-close")).toBeInTheDocument();
  await user.click(await screen.findByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Từ chối", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ }));
  await user.type(screen.getByRole("textbox", { name: "Lý do" }), "Synthetic");
  const submit = screen.getByRole("button", { name: "Lưu quyết định" });
  const form = submit.closest("form")!;
  try {
    await user.click(submit);
    await waitFor(() => expect(drawer.querySelector(".ant-drawer-close")).not.toBeInTheDocument());
    fireEvent.submit(form);
    await user.keyboard("{Escape}");
    expect(drawer).toBeVisible();
    expect(pendingDecision).toHaveBeenCalledTimes(1);
  } finally {
    resolveDecision({ ...detail, status: "REJECTED", revision: 6 });
  }
  expect(await screen.findByText("Đã lưu quyết định.")).toBeVisible();
});

it("retains license evidence and selected groups when starting review, but resets for a new submission", async () => {
  let current: ReviewDetail = { ...detail, status: "SUBMITTED" };
  let finishReload: (() => void) | undefined;
  let waitForReload = false;
  vi.mocked(verificationFetch).mockImplementation(async path => {
    if (path.startsWith("review-queue")) return { items: [current], hasMore: false, totalElements: 1 };
    if (path.endsWith("/decision")) {
      current = { ...current, status: "UNDER_REVIEW", revision: current.revision + 1 };
      waitForReload = current.revision === 6;
      return current;
    }
    if (waitForReload) {
      waitForReload = false;
      await new Promise<void>(resolve => { finishReload = resolve; });
    }
    return current;
  });
  vi.mocked(request).mockResolvedValue([{
    groupId: "moto-small", label: "Xe máy", result: {
      status: "ELIGIBLE", reasonCodes: [], policyVersion: "SYNTHETIC_V1",
    },
  }]);
  const user = mount();
  await user.click(await screen.findByRole("button", { name: id }));
  fireEvent.change(screen.getByLabelText("Ngày cấp GPLX"), { target: { value: "2025-05-01" } });
  await user.click(screen.getByLabelText("Hạn chế GPLX"));
  await user.click(screen.getByText("Đã đối chiếu, không có hạn chế", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("button", { name: "Xem nhóm xe" }));
  await user.click(await screen.findByRole("checkbox", { name: "Duyệt Xe máy" }));
  await user.click(screen.getByRole("button", { name: "Bắt đầu xét duyệt ngay" }));
  await waitFor(() => expect(finishReload).toBeTypeOf("function"));
  expect(screen.getByLabelText("Ngày cấp GPLX")).toHaveValue("2025-05-01");
  expect(screen.getByLabelText("Ngày cấp GPLX")).toBeDisabled();
  finishReload!();
  await waitFor(() => expect(screen.getByLabelText("Ngày cấp GPLX")).toBeEnabled());
  expect(screen.getByLabelText("Ngày cấp GPLX")).toHaveValue("2025-05-01");
  expect(screen.getByRole("checkbox", { name: "Duyệt Xe máy" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ })).not.toBeChecked();
  await user.click(screen.getByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Phê duyệt", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("checkbox", { name: /Tôi đã đối chiếu/ }));
  await user.click(screen.getByRole("button", { name: "Lưu quyết định" }));
  await waitFor(() => expect(verificationFetch).toHaveBeenCalledWith("applications/" + id + "/decision", {
    body: expect.objectContaining({
      revision: 6, status: "APPROVED", capabilityReview: {
        policyVersion: "SYNTHETIC_V1", issuedOn: "2025-05-01", restriction: "VERIFIED_NONE",
        restrictionCode: null, selectedGroupIds: ["moto-small"],
      },
    }),
  }));
  // A different submitted document must require a fresh license review.
  current = {
    ...current, revision: 8, submissionRevision: 7,
    document: { ...current.document, revision: 7 },
    submissions: [...current.submissions, { revision: 7, submittedAt: "2026-01-03T03:00:00Z" }],
  };
  await user.click(screen.getByRole("button", { name: "Làm mới" }));
  await waitFor(() => expect(screen.getByLabelText("Ngày cấp GPLX")).toHaveValue(""));
  expect(screen.queryByRole("checkbox", { name: "Duyệt Xe máy" })).not.toBeInTheDocument();
});

it("restores the review draft after leaving the page and refocusing, and clears it with the admin session", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(request).mockResolvedValue([{
    groupId: "moto-small", label: "Xe máy", result: {
      status: "ELIGIBLE", reasonCodes: [], policyVersion: "SYNTHETIC_V1",
    },
  }]);
  let user = mount(client);
  await user.click(await screen.findByRole("button", { name: id }));
  fireEvent.change(screen.getByLabelText("Ngày cấp GPLX"), { target: { value: "2025-05-01" } });
  await user.click(screen.getByLabelText("Hạn chế GPLX"));
  await user.click(screen.getByText("Đã đối chiếu, không có hạn chế", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("button", { name: "Xem nhóm xe" }));
  await user.click(await screen.findByRole("checkbox", { name: "Duyệt Xe máy" }));
  await user.click(screen.getByRole("combobox", { name: "Quyết định" }));
  await user.click(screen.getByText("Từ chối", { selector: ".ant-select-item-option-content" }));
  await user.type(screen.getByRole("textbox", { name: "Lý do" }), "Cần đối chiếu thêm");

  cleanup();
  user = mount(client);
  await user.click(await screen.findByRole("button", { name: id }));
  await waitFor(() => expect(screen.getByLabelText("Ngày cấp GPLX")).toHaveValue("2025-05-01"));
  expect(screen.getByRole("checkbox", { name: "Duyệt Xe máy" })).toBeChecked();
  expect(screen.getByRole("textbox", { name: "Lý do" })).toHaveValue("Cần đối chiếu thêm");
  expect(request).toHaveBeenCalledTimes(1);

  const callsBeforeFocus = vi.mocked(verificationFetch).mock.calls.length;
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  await waitFor(() => expect(vi.mocked(verificationFetch).mock.calls.length).toBeGreaterThan(callsBeforeFocus));
  await waitFor(() => expect(screen.getByLabelText("Ngày cấp GPLX")).toBeEnabled());
  expect(screen.getByLabelText("Ngày cấp GPLX")).toHaveValue("2025-05-01");
  expect(screen.getByRole("checkbox", { name: "Duyệt Xe máy" })).toBeChecked();
  expect(screen.getByRole("textbox", { name: "Lý do" })).toHaveValue("Cần đối chiếu thêm");
  focusManager.setFocused(undefined);

  cleanup();
  client.clear();
  user = mount(client);
  await user.click(await screen.findByRole("button", { name: id }));
  expect(await screen.findByLabelText("Ngày cấp GPLX")).toHaveValue("");
  expect(screen.queryByRole("checkbox", { name: "Duyệt Xe máy" })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "Lý do" })).not.toBeInTheDocument();
});

it("recovers when a private image fails to load and opens all images on explicit action", async () => {
  const createObjectURL = vi.fn(() => "blob:retry-ok");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
  try {
    let attempts = 0;
    const withCaptures = {
      ...detail,
      document: {
        ...detail.document,
        captures: { cccd_front: {}, selfie: {} },
      },
    };
    vi.mocked(verificationFetch).mockImplementation(async path => {
      if (path.startsWith("review-queue")) return { items: [withCaptures], hasMore: false, totalElements: 1 };
      if (path.includes("/captures/cccd_front")) {
        attempts += 1;
        if (attempts === 1) throw new ApiError("Mạng chập chờn", "NETWORK", 503);
        return new Blob(["front"], { type: "image/png" });
      }
      if (path.includes("/captures/selfie")) return new Blob(["selfie"], { type: "image/png" });
      return withCaptures;
    });

    const user = mount();
    await user.click(await screen.findByRole("button", { name: id }));
    expect(await screen.findByRole("button", { name: "Mở tất cả ảnh" })).toBeVisible();
    expect(vi.mocked(verificationFetch).mock.calls.some(([path]) => path.includes("/captures/"))).toBe(false);

    const openButtons = screen.getAllByRole("button", { name: "Mở ảnh" });
    await user.click(openButtons[0]);
    expect(await screen.findByText("Mạng chập chờn")).toBeVisible();
    const retryBtn = await screen.findByRole("button", { name: "Thử lại" });
    await user.click(retryBtn);
    expect(await screen.findByAltText("CCCD mặt trước")).toHaveAttribute("src", "blob:retry-ok");

    await user.click(screen.getByRole("button", { name: "Mở tất cả ảnh" }));
    expect(await screen.findByAltText("Selfie")).toHaveAttribute("src", "blob:retry-ok");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("labels a re-verification draft as updating and explains the empty queue detail", async () => {
  const draft = { ...detail, status: "DRAFT", verificationWarnings: [] };
  vi.mocked(verificationFetch).mockImplementation(async (path) => {
    if (path.startsWith("review-queue")) return { items: [draft], hasMore: false, totalElements: 1 };
    return { id, status: "DRAFT", revision: 3 };
  });
  const user = mount();
  expect(await screen.findByText("Đang cập nhật giấy tờ")).toBeVisible();
  await user.click(screen.getByRole("button", { name: id }));
  expect(await screen.findByText("Chưa có bản nộp đang chờ duyệt")).toBeVisible();
});

it("maps verification statuses to semantic tag colors", () => {
  expect(verificationStatusColor("APPROVED")).toBe("green");
  expect(verificationStatusColor("REJECTED")).toBe("red");
  expect(verificationStatusColor("REVOKED")).toBe("red");
  expect(verificationStatusColor("UNDER_REVIEW")).toBe("blue");
  expect(verificationStatusColor("SUBMITTED")).toBe("gold");
  expect(verificationStatusColor("NEEDS_MORE_INFO")).toBe("gold");
  expect(verificationStatusColor("DRAFT")).toBe("default");
  expect(queueStatusLabel("DRAFT")).toBe("Đang cập nhật giấy tờ");
  expect(queueStatusLabel("APPROVED")).toBe("Đã duyệt");
});
