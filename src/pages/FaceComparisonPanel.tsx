import { useEffect, useRef, useState } from "react";
import { Alert, Button, Descriptions, Space } from "antd";
import { errorMessage, verificationFetch } from "../lib/api";
import { captures, type ReviewDetail, type VerificationWarning } from "./verificationReviewModel";

type FaceResult = {
  mode: "NOT_EVALUATED" | "EXPERIMENTAL";
  reason?: string;
  modelVersion?: string;
  qualityVersion?: string;
  thresholdVersion?: string;
  scoreMetric?: "COSINE_SIMILARITY";
  liveness: "NOT_EVALUATED";
  quality: Record<string, string>;
  verificationWarnings?: VerificationWarning[];
  pairs: { left: string; right: string; status: string; score?: number }[];
};
const states: Record<string, string> = {
  NOT_EVALUATED: "Chưa đánh giá",
  INSUFFICIENT_QUALITY: "Chất lượng chưa đủ",
  INCONCLUSIVE: "Chưa đủ căn cứ kết luận",
  POSSIBLE_MISMATCH: "Cần đối chiếu lại",
  SIMILARITY_SUPPORTED: "Có tín hiệu tương đồng",
};
const quality: Record<string, string> = {
  NO_FACE: "Không tìm thấy khuôn mặt. Kiểm tra lại ảnh.",
  MULTIPLE_FACES: "Có nhiều khuôn mặt. Cần chọn ảnh chỉ có một khuôn mặt.",
  FACE_TOO_SMALL: "Vùng mặt quá nhỏ. Chụp gần hơn.",
  FACE_CROPPED: "Khuôn mặt bị cắt. Chụp lại đủ khuôn mặt.",
  FACE_LANDMARKS_UNRELIABLE: "Các điểm trên khuôn mặt chưa rõ. Kiểm tra xem mặt có bị che.",
  FACE_ALIGNMENT_FAILED: "Chưa căn chỉnh được khuôn mặt.",
  FACE_BLURRY: "Vùng mặt bị mờ.",
  FACE_GLARE: "Vùng mặt có thể bị lóa.",
  FACE_TOO_DARK: "Vùng mặt quá tối.",
  CARD_PREPARATION_FAILED: "Không chuẩn bị được vùng thẻ để tìm ảnh chân dung.",
  INVALID_IMAGE: "Không đọc được ảnh.",
  MISSING_IMAGE: "Ảnh không còn khả dụng.",
  READY: "Đủ điều kiện kỹ thuật trong lượt thử nghiệm.",
};

export function FaceComparisonPanel({ detail, onWarnings }: {
  detail: ReviewDetail;
  onWarnings: (warnings: VerificationWarning[]) => void;
}) {
  const [result, setResult] = useState<FaceResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const current = detail.submissionRevision === detail.document.revision
    && ["SUBMITTED", "UNDER_REVIEW"].includes(detail.status);
  const consent = detail.document.faceConsent?.version === "face-comparison-v1";
  const available = detail.faceComparisonAvailable && consent && current;

  useEffect(() => () => active.current?.abort(), []);

  async function evaluate() {
    if (!available || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setResult(undefined);
    try {
      const value = await verificationFetch<FaceResult>("applications/" + detail.id + "/face-comparison", {
        body: { revision: detail.revision, submissionRevision: detail.document.revision },
        signal: controller.signal, timeoutMs: 35_000,
      });
      if (!controller.signal.aborted) {
        setResult(value);
        if (value.verificationWarnings) onWarnings(value.verificationWarnings);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      if (active.current === controller) active.current = null;
    }
  }

  return <section aria-label="Đối chiếu khuôn mặt" className="verification-decision-box">
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Descriptions size="small" column={1} items={[
        { key: "face", label: "Đối chiếu khuôn mặt", children: result?.mode === "EXPERIMENTAL"
          ? "Thử nghiệm · Chưa có ngưỡng kết luận" : "Chưa đánh giá" },
        { key: "liveness", label: "Kiểm tra người thật", children: "Chưa đánh giá" },
      ]} />
      {available ? <Button loading={busy} onClick={() => void evaluate()}>Chạy đối chiếu thử nghiệm</Button>
        : detail.faceComparisonAvailable && current && !consent
          ? <div>Bản nộp này chưa có đồng ý đối chiếu khuôn mặt.</div> : null}
      {error && <Alert type="warning" title={error} />}
      {result?.mode === "NOT_EVALUATED" && <Alert type="info" title="Chưa thể thực hiện đối chiếu cho bản nộp này." />}
      {result?.mode === "EXPERIMENTAL" && <>
        <Alert type="info" title="Điểm cosine chỉ hỗ trợ xem xét. Hãy đối chiếu trực tiếp ảnh trước khi quyết định." />
        <ul>{Object.entries(result.quality).map(([slot, status]) =>
          <li key={slot}>{captures[slot]} · {quality[status] ?? states.NOT_EVALUATED}</li>)}</ul>
        <ul>{result.pairs.map(pair =>
          <li key={pair.left + pair.right}>
            {captures[pair.left]} – {captures[pair.right]} · {states[pair.status] ?? states.NOT_EVALUATED}
            {typeof pair.score === "number" ? " · Cosine " + pair.score.toFixed(3) : ""}
          </li>)}</ul>
        <div>Model {result.modelVersion} · Chất lượng {result.qualityVersion} · Ngưỡng chưa đánh giá</div>
        <Button onClick={() => setResult(undefined)}>Ẩn kết quả đối chiếu</Button>
      </>}
    </Space>
  </section>;
}
