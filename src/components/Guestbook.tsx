"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
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

const DEFAULT_FIX_NOTE = "已打掃完成，請複查。";

export function Guestbook({
  comments: initialComments,
  classId,
  inspections,
}: {
  comments: CommentDoc[];
  classId: string;
  inspections: InspectionDoc[];
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

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
    () => inspections.filter((i) => i.status === "pending_fix"),
    [inspections],
  );
  const selectable = pending.length ? pending : inspections.slice(0, 5);

  const [inspectionId, setInspectionId] = useState(
    () => selectable[0]?.inspection_id ?? "",
  );
  const [content, setContent] = useState(DEFAULT_FIX_NOTE);
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
        `佐證照片已就緒 ${formatBytes(file.size)} → ${formatBytes(compressed.size)}`,
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
    if (!photoFile) {
      setMessage("請先拍照或從相簿選一張打掃後的佐證照片。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const auth = getFirebaseAuth();
      if (isFirebaseConfigured() && !auth?.currentUser) {
        setMessage("請先登入（導師／衛生股長帳號）再拍照回報。");
        return;
      }

      const uploaded = await uploadInspectionPhoto(photoFile, {
        classId,
        prefix: "fixes",
      });
      const replyPhotoUrl = uploaded.photoUrl;
      const note = content.trim() || DEFAULT_FIX_NOTE;

      let role: UserRole = "teacher";
      let name = "導師";

      if (isFirebaseConfigured() && auth?.currentUser) {
        const profile = await fetchUserProfile(auth.currentUser.uid);
        if (!profile) {
          setMessage(
            "找不到 users 權限文件。請請組長在 Firestore 建立對應帳號（role、class_id）。",
          );
          return;
        }
        role = profile.role;
        name =
          profile.display_name ||
          auth.currentUser.email ||
          "已登入使用者";

        const saved = await postComment({
          inspectionId,
          classId,
          authorName: name,
          authorRole: role,
          content: note,
          replyPhotoUrl,
          markFixed,
        });
        setComments((prev) => [saved, ...prev]);
        setMessage(
          markFixed
            ? "已送出佐證照片並標為已銷案"
            : "已送出佐證照片",
        );
      } else {
        const local: CommentDoc = {
          comment_id: `local_${Date.now()}`,
          inspection_id: inspectionId,
          class_id: classId,
          author_role: role,
          author_name: name,
          content: note,
          reply_photo_url: replyPhotoUrl,
          created_at: new Date().toISOString(),
          marks_fixed: markFixed,
        };
        saveLocalComment(local, markFixed);
        invalidateCache(`class:${classId}`);
        setComments((prev) => [local, ...prev]);
        setMessage(
          markFixed
            ? "已存本機佐證並標為銷案（登入後可寫雲端）"
            : "已存本機佐證",
        );
      }

      setContent(DEFAULT_FIX_NOTE);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (cameraRef.current) cameraRef.current.value = "";
      if (albumRef.current) albumRef.current.value = "";
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
        className="space-y-3 rounded-xl border border-line bg-leaf/10 p-4"
      >
        <h3 className="font-semibold text-ink">打掃完成・拍照回報</h3>
        <p className="text-sm text-muted">
          請導師／衛生股長<strong className="text-ink">打掃完直接拍照</strong>
          上傳佐證，送出後即可銷案。請先登入對應班級帳號。
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

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
            className="rounded-lg bg-mint px-4 py-3 text-sm font-semibold text-white hover:bg-leaf disabled:opacity-50"
          >
            拍照佐證
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => albumRef.current?.click()}
            className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-leaf/10 disabled:opacity-50"
          >
            從相簿選
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
        />

        {photoPreview ? (
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="打掃後佐證預覽"
              className="max-h-52 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              className="text-xs text-muted underline"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
            >
              清除照片重拍
            </button>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-white/70 px-3 py-6 text-center text-sm text-muted">
            尚未拍照 — 請按上方「拍照佐證」
          </p>
        )}

        <label className="block space-y-1 text-sm">
          <span>簡短說明（可改）</span>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={DEFAULT_FIX_NOTE}
            className="w-full rounded-lg border border-line bg-white px-3 py-2"
          />
        </label>

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
          disabled={busy || !inspectionId || !photoFile}
          className="w-full rounded-xl bg-mint px-4 py-3 font-semibold text-white hover:bg-leaf disabled:opacity-60 sm:w-auto"
        >
          {busy ? "處理中…" : "送出佐證並回報"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </form>

      {comments.map((c) => (
        <article
          key={c.comment_id}
          className="rounded-xl border border-dashed border-line bg-white/60 p-4"
        >
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{c.author_name}</p>
            <p className="text-xs text-muted">
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
              alt="打掃後佐證"
              className="mt-3 max-h-48 rounded-lg object-cover"
            />
          ) : null}
        </article>
      ))}
      {comments.length === 0 ? (
        <p className="text-sm text-muted">
          尚無回報。有待改善時，請打掃後拍照上傳佐證。
        </p>
      ) : null}
    </div>
  );
}
