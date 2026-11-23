import { useEffect, useRef, useState } from "react";
import { Alert, Button, Descriptions, Space, Tag, Typography } from "antd";
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

type FacePanelState = {
  key: string;
  status: "loading" | "done" | "error" | "hidden";
  result?: FaceResult;
  error?: string;
};

export function FaceComparisonPanel({ detail, onWarnings }: {
  detail: ReviewDetail;
  onWarnings: (warnings: VerificationWarning[]) => void;
}) {
  const [panelState, setPanelState] = useState<FacePanelState | null>(null);
  const active = useRef<AbortController | null>(null);
  const onWarningsRef = useRef(onWarnings);
  useEffect(() => {
    onWarningsRef.current = onWarnings;
  }, [onWarnings]);

  const current = detail.submissionRevision === detail.document.revision
    && ["SUBMITTED", "UNDER_REVIEW"].includes(detail.status);
  const consent = detail.document.faceConsent?.version === "face-comparison-v1";
  const available = detail.faceComparisonAvailable && consent && current;
  const evaluationKey = available ? `${detail.id}:${detail.revision}:${detail.document.revision}` : "";

  const currentState = evaluationKey && panelState?.key === evaluationKey ? panelState : null;
  const busy = Boolean(evaluationKey) && (!currentState || currentState.status === "loading");
  const result = currentState?.status === "done" ? currentState.result : undefined;
  const error = currentState?.status === "error" ? (currentState.error ?? "") : "";

  async function evaluate() {
    if (!available || !evaluationKey || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPanelState({ key: evaluationKey, status: "loading" });
    try {
      const value = await verificationFetch<FaceResult>("applications/" + detail.id + "/face-comparison", {
        body: { revision: detail.revision, submissionRevision: detail.document.revision },
        signal: controller.signal, timeoutMs: 35_000,
      });
      if (!controller.signal.aborted) {
        setPanelState({ key: evaluationKey, status: "done", result: value });
        if (value.verificationWarnings) onWarningsRef.current(value.verificationWarnings);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setPanelState({ key: evaluationKey, status: "error", error: errorMessage(err) });
      }
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  useEffect(() => {
    if (!evaluationKey) return;
    const controller = new AbortController();
    active.current = controller;
    verificationFetch<FaceResult>("applications/" + detail.id + "/face-comparison", {
      body: { revision: detail.revision, submissionRevision: detail.document.revision },
      signal: controller.signal, timeoutMs: 35_000,
    })
      .then(value => {
        if (controller.signal.aborted) return;
        setPanelState({ key: evaluationKey, status: "done", result: value });
        if (value.verificationWarnings) onWarningsRef.current(value.verificationWarnings);
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setPanelState({ key: evaluationKey, status: "error", error: errorMessage(err) });
        }
      })
      .finally(() => {
        if (active.current === controller) active.current = null;
      });
    return () => {
      controller.abort();
      if (active.current === controller) active.current = null;
    };
  }, [evaluationKey, detail.id, detail.revision, detail.document.revision]);

  return <section aria-label="Đối chiếu khuôn mặt" className="verification-decision-box">
    <h4>Đối chiếu khuôn mặt</h4>
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Descriptions size="small" bordered column={{ xs: 1, sm: 2 }} items={[
        {
          key: "face",
          label: "Đối chiếu khuôn mặt",
          children: busy
            ? <Tag color="processing">Đang tự động đối chiếu…</Tag>
            : result?.mode === "EXPERIMENTAL"
              ? <Tag color="blue">Đã đối chiếu · Hỗ trợ xem xét</Tag>
              : <Tag>Chưa đánh giá</Tag>,
        },
        { key: "liveness", label: "Kiểm tra người thật", children: <Tag>Chưa đánh giá</Tag> },
      ]} />
      {available ? (
        <Space wrap>
          <Button loading={busy} onClick={() => void evaluate()}>
            {result ? "Chạy lại đối chiếu" : "Chạy đối chiếu thử nghiệm"}
          </Button>
          {result?.mode === "EXPERIMENTAL" && (
            <Button onClick={() => setPanelState({ key: evaluationKey, status: "hidden" })}>
              Ẩn kết quả đối chiếu
            </Button>
          )}
        </Space>
      ) : !detail.faceComparisonAvailable ? (
        <Typography.Text type="secondary">
          Tính năng đối chiếu khuôn mặt đang tắt trên máy chủ (cần bật DATXE_EKYC_FACE_COMPARISON_ENABLED=true).
        </Typography.Text>
      ) : current && !consent ? (
        <Typography.Text type="secondary">
          Bản nộp này chưa có đồng ý đối chiếu khuôn mặt từ tài xế.
        </Typography.Text>
      ) : null}
      {error && <Alert type="warning" showIcon title={error} />}
      {result?.mode === "NOT_EVALUATED" && <Alert type="info" showIcon title="Chưa thể thực hiện đối chiếu cho bản nộp này." />}
      {result?.mode === "EXPERIMENTAL" && <>
        <Alert type="info" showIcon title="Điểm cosine chỉ hỗ trợ xem xét. Hãy đối chiếu trực tiếp ảnh trước khi quyết định." />
        <div className="verification-face-group">
          <Typography.Text strong>Chất lượng khuôn mặt theo ảnh</Typography.Text>
          <ul className="verification-face-list">{Object.entries(result.quality).map(([slot, status]) =>
            <li key={slot} className="verification-face-item">
              <span>{captures[slot]} · {quality[status] ?? states.NOT_EVALUATED}</span>
              <Tag color={status === "READY" ? "green" : "gold"}>{status === "READY" ? "Đạt" : "Lưu ý"}</Tag>
            </li>)}</ul>
        </div>
        <div className="verification-face-group">
          <Typography.Text strong>Kết quả so khớp từng cặp</Typography.Text>
          <ul className="verification-face-list">{result.pairs.map(pair =>
            <li key={pair.left + pair.right} className="verification-face-item">
              <span>{captures[pair.left]} – {captures[pair.right]}</span>
              <Tag color={pair.status === "SIMILARITY_SUPPORTED" ? "green" : pair.status === "POSSIBLE_MISMATCH" ? "red" : "gold"}>
                {states[pair.status] ?? states.NOT_EVALUATED}
                {typeof pair.score === "number" ? " · Cosine " + pair.score.toFixed(3) : ""}
              </Tag>
            </li>)}</ul>
        </div>
        <Typography.Text type="secondary" className="verification-meta-note">
          Model {result.modelVersion} · Chất lượng {result.qualityVersion} · Ngưỡng chưa đánh giá
        </Typography.Text>
      </>}
    </Space>
  </section>;
}
