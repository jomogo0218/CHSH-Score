"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { BurstCamera } from "@/components/BurstCamera";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { invalidateCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { postComment } from "@/lib/firebase/firestore";
import {
  ensureInspectionPhotoSize,
  formatBytes,
} from "@/lib/image/compress";
import {
  getLocalCommentsByClass,
  saveLocalComment,
} from "@/lib/local/store";
import type { CommentDoc, InspectionDoc } from "@/lib/types";

const DEFAULT_FIX_NOTE = "已打掃完成，請複查。";

type PendingPhoto = {
  id: string;
  file: File;
  preview: string;
  label: string;
};

async function uploadFixPhoto(
  file: File,
  classId: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file, "fix.jpg");
  form.append("classId", classId);
  const res = await fetch("/api/fix-report", { method: "POST", body: form });
  const data = (await res.json()) as { photoUrl?: string; error?: string };
  if (!res.ok || !data.photoUrl) {
    throw new Error(data.error || "照片上傳失敗");
  }
  return data.photoUrl;
}

export function Guestbook({
  comments: initialComments,
  classId,
  inspections,
  compact = false,
}: {
  comments: CommentDoc[];
  classId: string;
  inspections: InspectionDoc[];
  /** 導師精簡：只留拍照＋送出 */
  compact?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

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
  const [authorName, setAuthorName] = useState("導師");
  const [content, setContent] = useState(DEFAULT_FIX_NOTE);
  const [markFixed, setMarkFixed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const photosRef = useRef<PendingPhoto[]>([]);

  function setPhotoQueue(next: PendingPhoto[]) {
    photosRef.current = next;
    setPhotos(next);
  }

  async function onPickPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setMessage(null);
    try {
      const added: PendingPhoto[] = [];
      for (const raw of [...fileList].slice(0, 10)) {
        const compressed = await ensureInspectionPhotoSize(raw);
        added.push({
          id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          file: compressed,
          preview: URL.createObjectURL(compressed),
          label: `${formatBytes(raw.size)}→${formatBytes(compressed.size)}`,
        });
      }
      setPhotoQueue([...photosRef.current, ...added]);
      setMessage(`已加入 ${added.length} 張佐證（可再拍，不會覆蓋舊回報）`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "壓縮失敗");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (albumRef.current) albumRef.current.value = "";
    }
  }

  async function submitReport(queue?: PendingPhoto[]) {
    const list = queue ?? photosRef.current;
    if (!inspectionId) {
      setMessage("請選擇要回覆的巡檢紀錄");
      return;
    }
    if (list.length === 0) {
      setMessage("請先拍照或從相簿選佐證照片。");
      return;
    }

    setBusy(true);
    setMessage("正在上傳佐證…");
    try {
      const note = content.trim() || DEFAULT_FIX_NOTE;
      const name = authorName.trim() || "導師";
      const savedList: CommentDoc[] = [];

      for (let i = 0; i < list.length; i++) {
        const photo = list[i];
        const photoUrl = await uploadFixPhoto(photo.file, classId);
        const noteForPhoto =
          list.length > 1 ? `${note}（${i + 1}/${list.length}）` : note;
        const shouldMarkFixed = markFixed && i === list.length - 1;

        if (isFirebaseConfigured()) {
          const saved = await postComment({
            inspectionId,
            classId,
            authorName: name,
            authorRole: "teacher",
            content: noteForPhoto,
            replyPhotoUrl: photoUrl,
            markFixed: shouldMarkFixed,
          });
          savedList.push(saved);
        } else {
          const local: CommentDoc = {
            comment_id: `local_${Date.now()}_${i}`,
            inspection_id: inspectionId,
            class_id: classId,
            author_role: "teacher",
            author_name: name,
            content: noteForPhoto,
            reply_photo_url: photoUrl,
            created_at: new Date().toISOString(),
            marks_fixed: shouldMarkFixed,
          };
          saveLocalComment(local, shouldMarkFixed);
          savedList.push(local);
        }
      }

      setComments((prev) => [...savedList, ...prev]);
      invalidateCache(`class:${classId}`);
      setMessage(
        markFixed
          ? `已送出 ${savedList.length} 張佐證，並標為已銷案`
          : `已送出 ${savedList.length} 張佐證（累積保留）`,
      );
      setPhotoQueue([]);
      setContent(DEFAULT_FIX_NOTE);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "送出失敗";
      const denied =
        /permission|insufficient|PERMISSION_DENIED/i.test(raw) ||
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          String((err as { code?: string }).code).includes("permission"));
      setMessage(
        denied
          ? "無權限寫入留言：請在 Firebase Console 發布最新 firestore.rules。"
          : raw,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitReport();
  }

  const showInspectionSelect = !compact && selectable.length > 1;
  const showCommentList = !compact;

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-line bg-leaf/10 p-4"
      >
        <h3 className="font-semibold text-ink">拍照回報</h3>
        {compact ? (
          <p className="text-sm text-muted">
            不必登入。連拍按「完成並送出」就會上傳；相簿選完再按送出。
          </p>
        ) : (
          <p className="text-sm text-muted">
            看到缺失後直接拍照上傳即可，
            <strong className="text-ink">不必登入</strong>
            。每次回報都會
            <strong className="text-ink">累積新增</strong>
            ，不會蓋掉舊照片。
          </p>
        )}

        {showInspectionSelect ? (
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
                    {i.date} · {STATUS_LABELS[i.status]}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setCameraOpen(true)}
            className="rounded-lg bg-mint px-4 py-3 text-sm font-semibold text-white hover:bg-leaf disabled:opacity-50"
          >
            連拍
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => albumRef.current?.click()}
            className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-leaf/10 disabled:opacity-50"
          >
            相簿（可多選）
          </button>
        </div>
        {cameraOpen ? (
          <BurstCamera
            open
            title="改善連拍"
            remaining={Math.max(0, 10 - photosRef.current.length)}
            doneLabel={compact ? "完成並送出" : "完成"}
            onClose={() => {
              setCameraOpen(false);
              if (compact && photosRef.current.length > 0) {
                void submitReport(photosRef.current);
              }
            }}
            onCapture={async (file) => {
              const compressed = await ensureInspectionPhotoSize(file);
              setPhotoQueue([
                ...photosRef.current,
                {
                  id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  file: compressed,
                  preview: URL.createObjectURL(compressed),
                  label: formatBytes(compressed.size),
                },
              ]);
            }}
            onFallback={() => {
              setCameraOpen(false);
              cameraRef.current?.click();
            }}
          />
        ) : null}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void onPickPhotos(e.target.files)}
        />
        <input
          ref={albumRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onPickPhotos(e.target.files)}
        />

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.preview}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setPhotoQueue(photosRef.current.filter((x) => x.id !== p.id))
                  }
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white"
                >
                  ×
                </button>
                <p className="mt-0.5 truncate text-[10px] text-muted">
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-line bg-white/70 px-3 py-6 text-center text-sm text-muted">
            尚未拍照 — 請按「連拍」或「相簿」
          </p>
        )}

        {compact ? null : (
          <>
            <label className="block space-y-1 text-sm">
              <span>顯示名稱</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="例如：導師／衛生股長"
                className="w-full rounded-lg border border-line bg-white px-3 py-2"
              />
            </label>

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
          </>
        )}

        <button
          type="submit"
          disabled={busy || !inspectionId || photos.length === 0}
          className="w-full rounded-xl bg-mint px-4 py-3 font-semibold text-white hover:bg-leaf disabled:opacity-60"
        >
          {busy ? "處理中…" : `送出（${photos.length} 張）`}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </form>

      {showCommentList ? (
        <>
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
            <p className="text-sm text-muted">尚無回報。</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
