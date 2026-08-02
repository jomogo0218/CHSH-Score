import { NextRequest, NextResponse } from "next/server";
import { buildObjectKey } from "@/lib/r2/upload";

/**
 * R2 上傳 stub（Week 1）。
 * Week 2：以 S3 相容 SDK 寫入 Cloudflare R2，並回傳公開 URL。
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const classId = String(form.get("classId") ?? "unknown");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少 file" }, { status: 400 });
  }

  const filename =
    file instanceof File && file.name ? file.name : "photo.jpg";
  const key = buildObjectKey(classId, filename);
  const publicBase =
    process.env.NEXT_PUBLIC_CF_R2_PUBLIC_URL?.replace(/\/$/, "") ??
    "https://placeholder.r2.dev";

  const hasR2Creds = Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );

  return NextResponse.json({
    photoUrl: `${publicBase}/${key}`,
    key,
    stub: true,
    message: hasR2Creds
      ? "已偵測 R2 憑證，但本週 API 仍為 stub，第 2 週才寫入物件儲存。"
      : "未設定 R2 憑證：回傳 placeholder URL 供流程串接測試。",
    bytes: file.size,
  });
}
