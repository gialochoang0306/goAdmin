import { api } from "./api";

/** Upload ảnh hỗ trợ qua signature có sẵn của backend, trả về secure URL để gắn vào message. */
export async function uploadSupportImage(file: File): Promise<string> {
  const signature = await api.uploadSupportSignature();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  if (signature.allowedFormats?.length) {
    form.append("allowed_formats", signature.allowedFormats.join(","));
  }
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: "POST", body: form },
  );
  const data = (await response.json()) as { secure_url?: string; error?: { message?: string } };
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Tải ảnh lên thất bại.");
  }
  return data.secure_url;
}
