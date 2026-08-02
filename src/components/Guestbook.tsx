"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { invalidateCache } from "@/lib/cache/ttl";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import {
  fetchUserProfile,
  postComment,
} from "@/lib/firebase/firestore";
import {
  compressInspectionPhoto,
  formatBytes,
} from "@/lib/image/compress";
import {
  getLocalCommentsByClass,
  saveLocalComment,
} from "@/lib/local/store";
import { uploadInspectionPhoto } from "@/lib/r2/upload";
import type { CommentDoc, InspectionDoc, UserRole } from "@/lib/types";

const ROLE_OPTIONS: UserRole[] = [
  "class_health_officer",
  "teacher",
  "admin",
];

export function Guestbook({
  comments: initialComments,
  classId,
  inspections,
}: {
  comments: CommentDoc[];
  classId: string;
  inspections: InspectionDoc[];
}) {
  const [comments, setComments] = useState<CommentDoc[]>(() => {
    const local = getLocalCommentsByClass(classId);
    const map = new Map<string, CommentDoc>();
    for (const c of [...initialComments, ...local]) {
      map.set(c.comment_id, c);
    }
    return [...map.values()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  });

  const pending = useMemo(
    () =>
      inspections.filter((i) => i.status === "pending_fix"),
    [inspections],
  );
  const selectable = pending.length ? pending : inspections.slice(0, 5);

  const [inspectionId, setInspectionId] = useState(
    () => selectable[0]?.inspection_id ?? "",
  );
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] =
    useState<UserRole>("class_health_officer");
  const [content, setContent] = useState("");
  const [markFixed, setMarkFixed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  async function onPickPhoto(file: File | null) {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const compressed = await compressInspectionPhoto(file);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setMessage(
        `改善照片已壓縮 ${formatBytes(file.size)} → ${formatBytes(compressed.size)}`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "壓縮失敗");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inspectionId) {
      setMessage("請選擇要回覆的巡檢紀錄");
      return;
    }
    if (!content.trim()) {
      setMessage("請填寫改善說明");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const auth = getFirebaseAuth();
      if (isFirebaseConfigured() && !auth?.currentUser) {
        setMessage("請先登入（導師／衛生股長帳號）再送出改善回報與照片。");
        return;
      }

      let replyPhotoUrl: string | undefined;
      if (photoFile) {
        const uploaded = await uploadInspectionPhoto(photoFile, {
          classId,
          prefix: "fixes",
        });
        replyPhotoUrl = uploaded.photoUrl;
      }

      let role = authorRole;
      let name = authorName.trim();

      if (isFirebaseConfigured() && auth?.currentUser) {
        const profile = await fetchUserProfile(auth.currentUser.uid);
        if (!profile) {
          setMessage(
            "找不到 users 權限文件。請請組長在 Firestore 建立對應帳號（role、class_id）。",
          );
          return;
        }
        role = profile.role;
        name = name || profile.display_name;
        name = name || auth.currentUser.email || "已登入使用者";

        const saved = await postComment({
          inspectionId,
          classId,
          authorName: name,
          authorRole: role,
          content: content.trim(),
          replyPhotoUrl,
          markFixed,
        });
        setComments((prev) => [saved, ...prev]);
        setMessage(
          markFixed
            ? "已送出留言並將巡檢標為已銷案"
            : "已送出留言",
        );
      } else {
        const local: CommentDoc = {
          comment_id: `local_${Date.now()}`,
          inspection_id: inspectionId,
          class_id: classId,
          author_role: role,
          author_name: name || "本機測試",
          content: content.trim(),
          reply_photo_url: replyPhotoUrl,
          created_at: new Date().toISOString(),
          marks_fixed: markFixed,
        };
        saveLocalComment(local, markFixed);
        invalidateCache(`class:${classId}`);
        setComments((prev) => [local, ...prev]);
        setMessage(
          markFixed
            ? "已存本機留言並標為銷案（登入 Firebase 後可寫雲端）"
            : "已存本機留言",
        );
      }

      setContent("");
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--accent-soft)]/20 p-4"
      >
        <h3 className="font-semibold text-ink">清掃完成回報</h3>
        <p className="text-xs text-muted">
          請先登入對應班級的導師／衛生股長帳號，再上傳改善照並銷案。身分與班級由組長在 Firestore 設定，不可自填竄改。
        </p>

        <label className="block space-y-1 text-sm">
          <span>對應巡檢</span>
          <select
            value={inspectionId}
            onChange={(e) => setInspectionId(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2"
            required
          >
            {selectable.length === 0 ? (
              <option value="">尚無可回覆巡檢</option>
            ) : (
              selectable.map((i) => (
                <option key={i.inspection_id} value={i.inspection_id}>
                  {i.date} · {STATUS_LABELS[i.status]} · {i.total_score} 分
                </option>
              ))
            )}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>顯示名稱</span>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="例如：衛生股長小明"
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>身分（本機預覽用）</span>
            <select
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span>改善說明</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            placeholder="已清掃完成，請複查…"
            className="w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>改善後照片（選填）</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy}
            onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </label>
        {photoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoPreview}
            alt="改善預覽"
            className="max-h-40 rounded-lg object-cover"
          />
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markFixed}
            onChange={(e) => setMarkFixed(e.target.checked)}
          />
          確認已清掃完成，標為「已銷案」
        </label>

        <button
          type="submit"
          disabled={busy || !inspectionId}
          className="rounded-xl bg-mint px-4 py-2.5 font-semibold text-white hover:bg-leaf disabled:opacity-60"
        >
          {busy ? "處理中…" : "回報已清掃"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </form>

      {comments.map((c) => (
        <article
          key={c.comment_id}
          className="rounded-xl border border-dashed border-[color:var(--border)] bg-white/60 p-4"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{c.author_name}</p>
            <p className="text-xs text-[color:var(--ink-muted)]">
              {ROLE_LABELS[c.author_role as keyof typeof ROLE_LABELS] ??
                c.author_role}{" "}
              · {new Date(c.created_at).toLocaleString("zh-TW")}
              {c.marks_fixed ? " · 銷案" : ""}
            </p>
          </div>
          <p className="leading-relaxed">{c.content}</p>
          {c.reply_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.reply_photo_url}
              alt="改善後照片"
              className="mt-3 max-h-48 rounded-lg object-cover"
            />
          ) : null}
        </article>
      ))}
      {comments.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-muted)]">
          尚無回報。若有待改善項目，清掃後請在此上傳照片並回報完成。
        </p>
      ) : null}
    </div>
  );
}
