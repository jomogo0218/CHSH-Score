/**
 * Cloudflare R2 上傳抽象。
 */

import { getFirebaseAuth } from "@/lib/firebase/client";
import { taiwanDateString } from "@/lib/time/taiwan";

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

  const headers: HeadersInit = {};
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const res = await fetch("/api/upload-r2", {
    method: "POST",
    body: formData,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text || "上傳失敗";
    try {
      const json = JSON.parse(text) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // keep text
    }
    throw new Error(message);
  }

  return (await res.json()) as UploadResult;
}

export function buildObjectKey(classId: string, filename = "photo.jpg") {
  const date = taiwanDateString().replace(/-/g, "");
  const safe = filename.replace(/[^\w.\-]+/g, "_");
  return `inspections/${date}/${classId}/${Date.now()}_${safe}`;
}
