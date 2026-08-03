import { NextRequest, NextResponse } from "next/server";
import {
  AuthRequiredError,
  ForbiddenError,
  requireUploadRoleIfConfigured,
} from "@/lib/firebase/verify-id-token";
import { buildObjectKey } from "@/lib/r2/upload";
import { hasR2Credentials, putR2Object } from "@/lib/r2/server";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 前端已壓到約 300KB；API 硬上限 2MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * 上傳照片至 Cloudflare R2。
 * Firebase 已設定時須登入，且 users.role 為 admin／導師／衛生股長。
 */
export async function POST(request: NextRequest) {
  try {
    await requireUploadRoleIfConfigured(request);

    const form = await request.formData();
    const file = form.get("file");
    const classId = String(form.get("classId") ?? "unknown").slice(0, 32);

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "缺少 file" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `檔案過大（上限 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB）` },
        { status: 400 },
      );
    }

    const contentType = file.type || "image/jpeg";
    if (
      contentType &&
      !ALLOWED_TYPES.has(contentType) &&
      !contentType.startsWith("image/")
    ) {
      return NextResponse.json({ error: "僅允許圖片檔" }, { status: 400 });
    }

    const filename =
      file instanceof File && file.name ? file.name : "photo.jpg";
    const key = buildObjectKey(classId, filename);
    const publicBase =
      process.env.NEXT_PUBLIC_CF_R2_PUBLIC_URL?.replace(/\/$/, "") ??
      "https://placeholder.r2.dev";
    const bytes = file.size;
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
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[upload-r2]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上傳失敗" },
      { status: 500 },
    );
  }
}
