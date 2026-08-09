import imageCompression from "browser-image-compression";

/** 連拍預覽／截圖：先把鏡頭解析度壓低，不必拍完再縮 */
export const CAPTURE_MAX_EDGE = 1280;
export const CAPTURE_JPEG_QUALITY = 0.72;
export const TARGET_PHOTO_BYTES = 300 * 1024;

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

/** 從預覽畫面直接截 JPEG（已縮邊、降畫質），適合連續拍照。 */
export async function captureJpegFromVideo(
  video: HTMLVideoElement,
  maxEdge = CAPTURE_MAX_EDGE,
  quality = CAPTURE_JPEG_QUALITY,
): Promise<File> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error("相機畫面尚未就緒");

  const scale = Math.min(1, maxEdge / Math.max(vw, vh));
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法壓縮畫面");
  ctx.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("壓縮失敗"))),
      "image/jpeg",
      quality,
    );
  });

  return new File([blob], `shot_${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/** 已夠小就略過二次壓縮，連拍才跟得上。 */
export async function ensureInspectionPhotoSize(file: File): Promise<File> {
  if (file.type === "image/jpeg" && file.size <= TARGET_PHOTO_BYTES) {
    return file;
  }
  return compressInspectionPhoto(file);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
