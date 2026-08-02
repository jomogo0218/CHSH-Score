import { NextRequest, NextResponse } from "next/server";
import { buildObjectKey } from "@/lib/r2/upload";
import { hasR2Credentials, putR2Object } from "@/lib/r2/server";

/**
 * 上傳照片至 Cloudflare R2（有憑證時真實寫入；否則回傳 placeholder stub）。
 */
export async function POST(request: NextRequest) {
  try {
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
    const bytes = file.size;
    const contentType = file.type || "image/jpeg";
    const buffer = Buffer.from(await file.arrayBuffer());

    if (hasR2Credentials()) {
      await putR2Object({ key, body: buffer, contentType });
      return NextResponse.json({
        photoUrl: `${publicBase}/${key}`,
        key,
        stub: false,
        bytes,
        message: "已上傳至 Cloudflare R2",
      });
    }

    // 無憑證：以 data URL 回傳，方便本機預覽（勿用於正式環境大量上傳）
    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    return NextResponse.json({
      photoUrl: dataUrl,
      key,
      stub: true,
      bytes,
      message:
        "未設定 R2 憑證：回傳 data URL 供本機預覽。請依 docs/cloud-setup.md 設定後即可寫入 R2。",
    });
  } catch (err) {
    console.error("[upload-r2]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上傳失敗" },
      { status: 500 },
    );
  }
}
