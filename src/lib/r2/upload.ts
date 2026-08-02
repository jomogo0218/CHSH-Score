/**
 * Cloudflare R2 上傳抽象。
 * 本週為 stub；第 2 週接 S3 相容 API + 前端壓縮。
 */

export interface UploadResult {
  photoUrl: string;
  key: string;
  stub: boolean;
}

export async function uploadInspectionPhoto(
  file: File | Blob,
  options?: { classId?: string; prefix?: string },
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.classId) formData.append("classId", options.classId);
  if (options?.prefix) formData.append("prefix", options.prefix);

  const res = await fetch("/api/upload-r2", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "上傳失敗");
  }

  return (await res.json()) as UploadResult;
}

export function buildObjectKey(classId: string, filename = "photo.jpg") {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return `inspections/${date}/${classId}/${Date.now()}_${safe}`;
}
