import imageCompression from "browser-image-compression";

/** 前端強效壓縮：目標 ≤ 300KB、最長邊 1920 */
export async function compressInspectionPhoto(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.75,
  });

  const name = file.name.replace(/\.\w+$/, "") || "photo";
  return new File([compressed], `${name}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
