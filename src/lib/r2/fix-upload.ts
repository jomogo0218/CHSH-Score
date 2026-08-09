export async function uploadFixPhoto(file: File, classId: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name || "fix.jpg");
  form.append("classId", classId);
  const res = await fetch("/api/fix-report", { method: "POST", body: form });
  const data = (await res.json()) as { photoUrl?: string; error?: string };
  if (!res.ok || !data.photoUrl) {
    throw new Error(data.error || "照片上傳失敗");
  }
  return data.photoUrl;
}

export function isNetworkError(err: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|network|offline|load failed|fetch/i.test(msg);
}
