import { NextRequest, NextResponse } from "next/server";
import { buildObjectKey } from "@/lib/r2/upload";
import { hasR2Credentials, putR2Object } from "@/lib/r2/server";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * 導師免登入改善照上傳（只寫 R2，不覆寫舊檔；每次新 key 累積）。
 * Firestore 留言由前端直接新增，不會刪除既有回報。
 */
export async function POST(request: NextRequest) {
  try {
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
      file instanceof File && file.name ? file.name : "fix.jpg";
    const key = buildObjectKey(classId, `fix_${filename}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicBase =
      process.env.NEXT_PUBLIC_CF_R2_PUBLIC_URL?.replace(/\/$/, "") ??
      "https://placeholder.r2.dev";

    if (hasR2Credentials()) {
      await putR2Object({ key, body: buffer, contentType });
      return NextResponse.json({
        photoUrl: `${publicBase}/${key}`,
        key,
        stub: false,
      });
    }

    const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
    return NextResponse.json({
      photoUrl: dataUrl,
      key,
      stub: true,
    });
  } catch (err) {
    console.error("[fix-report]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "上傳失敗" },
      { status: 500 },
    );
  }
}
