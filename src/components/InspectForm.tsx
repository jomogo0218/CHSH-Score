"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASS_ROSTER, INSPECTION_CATEGORIES, SUMMARY_PRESETS } from "@/lib/constants";
import { ClassRosterPicker } from "@/components/ClassRosterPicker";
import { invalidateCache } from "@/lib/cache/ttl";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import {
  fetchInspection,
  fetchUserProfile,
  publishInspection,
} from "@/lib/firebase/firestore";
import {
  compressInspectionPhoto,
  formatBytes,
} from "@/lib/image/compress";
import { saveLocalInspection } from "@/lib/local/store";
import { publishLiveUpdate } from "@/lib/mqtt/publish";
import { uploadInspectionPhoto } from "@/lib/r2/upload";
import { taiwanDateString } from "@/lib/time/taiwan";
import type { InspectionDoc, InspectionStatus, UserDoc } from "@/lib/types";
import type { User } from "firebase/auth";

type PhotoEntry = {
  id: string;
  url: string;
  originalBytes: number;
  compressedBytes: number;
};

type CategoryState = {
  category: string;
  flagged: boolean;
  deduction: number;
  note: string;
  photos: PhotoEntry[];
};

const DEFAULT_DEDUCTION = 5;
const MAX_PHOTOS_PER_CATEGORY = 15;

function todayId(classId: string) {
  return `${taiwanDateString()}_${classId}`;
}

function newPhotoId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function InspectForm({ classId }: { classId?: string }) {
  const selected = CLASS_ROSTER.find((c) => c.class_id === classId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null | undefined>(undefined);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryState[]>(() =>
    INSPECTION_CATEGORIES.map((category) => ({
      category,
      flagged: false,
      deduction: DEFAULT_DEDUCTION,
      note: "",
      photos: [],
    })),
  );

  useEffect(() => {
    return subscribeAuth((next) => {
      setUser(next);
      setProfile(undefined);
      setProfileError(null);
      if (!next) {
        setProfile(null);
        return;
      }
      void fetchUserProfile(next.uid)
        .then((p) => setProfile(p))
        .catch((err) => {
          setProfile(null);
          setProfileError(err instanceof Error ? err.message : "讀取 profile 失敗");
        });
    });
  }, []);

  const isAdmin = profile?.role === "admin";

  const totalScore = useMemo(() => {
    const deduction = categories
      .filter((c) => c.flagged)
      .reduce((sum, c) => sum + Math.abs(c.deduction), 0);
    return Math.max(0, 100 - deduction);
  }, [categories]);

  const photoCount = categories.reduce((sum, c) => sum + c.photos.length, 0);

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.category === category ? { ...c, flagged: !c.flagged } : c,
      ),
    );
  }

  function updateCategory(category: string, patch: Partial<CategoryState>) {
    setCategories((prev) =>
      prev.map((c) => (c.category === category ? { ...c, ...patch } : c)),
    );
  }

  function removePhoto(category: string, photoId: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.category === category
          ? { ...c, photos: c.photos.filter((p) => p.id !== photoId) }
          : c,
      ),
    );
  }

  function clearPhotoInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (albumRef.current) albumRef.current.value = "";
  }

  async function onPickPhotos(fileList: FileList | null) {
    if (!fileList?.length || !activeCategory || !classId) return;
    const cat = categories.find((c) => c.category === activeCategory);
    if (!cat) return;

    const room = MAX_PHOTOS_PER_CATEGORY - cat.photos.length;
    if (room <= 0) {
      setMessage(`${activeCategory} 最多 ${MAX_PHOTOS_PER_CATEGORY} 張。`);
      setActiveCategory(null);
      clearPhotoInputs();
      return;
    }

    const files = [...fileList].slice(0, room);
    setBusy(true);
    setMessage(null);
    const added: PhotoEntry[] = [];
    try {
      for (const file of files) {
        const originalBytes = file.size;
        const compressed = await compressInspectionPhoto(file);
        const uploaded = await uploadInspectionPhoto(compressed, { classId });
        added.push({
          id: newPhotoId(),
          url: uploaded.photoUrl,
          originalBytes,
          compressedBytes: compressed.size,
        });
      }
      setCategories((prev) =>
        prev.map((c) => {
          if (c.category !== activeCategory) return c;
          return {
            ...c,
            // 只加照片，不自動標記缺失／扣分
            photos: [...c.photos, ...added],
            note: c.note || (added.length ? `${c.category}巡察佐證` : c.note),
          };
        }),
      );
      setMessage(
        `${activeCategory} 已加 ${added.length} 張（共 ${(cat.photos.length + added.length)} 張）。需扣分時請再按「標記缺失」。`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
      setActiveCategory(null);
      clearPhotoInputs();
    }
  }

  async function onPublish() {
    if (!classId || !selected) {
      setMessage("請先選擇班級");
      return;
    }
    if (photoCount === 0 && !categories.some((c) => c.flagged)) {
      setMessage("請先至少拍一張照片或標記一個缺失項目，再發布。");
      return;
    }

    const auth = getFirebaseAuth();
    if (isFirebaseConfigured() && !auth?.currentUser) {
      setMessage(
        "尚未登入組長帳號：現在發布只會留在這支手機，導師看不到。請先到「登入」後再發布。",
      );
      return;
    }
    if (isFirebaseConfigured() && auth?.currentUser && profile?.role !== "admin") {
      setMessage(
        `已登入但不是 admin（目前 role=${profile?.role ?? "（沒有 users 文件）"}）。請在 Firestore 建立 users/${auth.currentUser.uid}，欄位 role=admin。`,
      );
      return;
    }

    if (isFirebaseConfigured() && auth?.currentUser) {
      try {
        const existing = await fetchInspection(todayId(classId));
        if (existing) {
          const ok = window.confirm(
            `今天「${selected.class_name}」已有巡察紀錄（分數 ${existing.total_score}）。\n\n再發布會覆蓋舊內容與照片細項，確定要覆寫嗎？`,
          );
          if (!ok) return;
        }
      } catch {
        // 查詢失敗仍允許發布；覆寫由後端 setDoc 處理
      }
    }

    setBusy(true);
    setMessage("正在寫入班級相簿…");
    try {
      const flagged = categories.filter((c) => c.flagged);
      const withPhotos = categories.filter((c) => c.photos.length > 0);
      const cover =
        withPhotos[0]?.photos[0]?.url ??
        flagged.find((c) => c.photos[0])?.photos[0]?.url;
      const summaryBlog =
        summary.trim() ||
        (flagged.length || withPhotos.length
          ? [...flagged, ...withPhotos]
              .filter(
                (c, i, arr) =>
                  arr.findIndex((x) => x.category === c.category) === i,
              )
              .map((c) => {
                const tag = c.flagged ? "待改善" : "佐證";
                return `${c.category}（${tag}${c.photos.length ? ` ${c.photos.length} 張` : ""}${c.note ? `：${c.note}` : ""}）`;
              })
              .join("；")
          : "各區整潔，維持良好。");

      const inspectorId = auth?.currentUser?.uid ?? "local_inspector";
      const payloadCats = categories.map((c) => ({
        category: c.category,
        score_deduction: c.flagged ? -Math.abs(c.deduction) : 0,
        note: c.note,
        photo_urls: c.photos.map((p) => p.url),
      }));

      let inspection: InspectionDoc;
      let wroteCloud = false;

      if (isFirebaseConfigured() && auth?.currentUser) {
        inspection = await publishInspection({
          classId,
          inspectorId,
          summaryBlog,
          categories: payloadCats,
          coverPhotoUrl: cover,
        });
        wroteCloud = true;
      } else {
        const deduction = flagged.reduce((s, c) => s + Math.abs(c.deduction), 0);
        const status: InspectionStatus =
          deduction > 0 ? "pending_fix" : "pass";
        inspection = {
          inspection_id: todayId(classId),
          date: taiwanDateString(),
          class_id: classId,
          inspector_id: inspectorId,
          total_score: Math.max(0, 100 - deduction),
          summary_blog: summaryBlog,
          status,
          cover_photo_url: cover,
          created_at: new Date().toISOString(),
        };
        const stamp = new Date().toTimeString().slice(0, 8);
        const localItems = payloadCats.flatMap((c) => {
          const urls = c.photo_urls ?? [];
          if (c.score_deduction === 0 && urls.length === 0 && !c.note) return [];
          if (urls.length === 0) {
            return [
              {
                inspection_id: inspection.inspection_id,
                category: c.category,
                score_deduction: c.score_deduction,
                note: c.note,
                photo_url: "",
                photo_timestamp: stamp,
              },
            ];
          }
          return urls.map((url, i) => ({
            inspection_id: inspection.inspection_id,
            category: c.category,
            score_deduction: i === 0 ? c.score_deduction : 0,
            note:
              urls.length > 1
                ? `${c.note || c.category}（${i + 1}/${urls.length}）`
                : c.note,
            photo_url: url,
            photo_timestamp: stamp,
          }));
        });
        saveLocalInspection(inspection, localItems);
      }

      invalidateCache(`class:${classId}`);
      invalidateCache("hall:");
      invalidateCache("board:");

      try {
        await publishLiveUpdate({
          class_id: classId,
          score: inspection.total_score,
          note: inspection.summary_blog,
          photo_url: inspection.cover_photo_url ?? "",
          created_at: inspection.created_at,
          status: inspection.status,
        });
      } catch {
        // MQTT optional
      }

      const statusHint =
        inspection.status === "pass"
          ? "狀態為合格（僅佐證、未扣分），班級可先改善。"
          : "狀態為待改善。";
      setMessage(
        wroteCloud
          ? `已發布到雲端：${selected.class_name} ${inspection.total_score} 分。${statusHint}`
          : `僅存本機：${selected.class_name}。導師在其他裝置看不到，請先登入再發布。`,
      );
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code.includes("permission-denied")) {
        setMessage(
          "沒有寫入權限。請確認 Firestore users/{你的UID} 有 role=admin，且已登入。",
        );
      } else {
        setMessage(err instanceof Error ? err.message : "發布失敗");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="panel p-3 sm:p-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          巡察拍照與評分
        </h1>
        <p className="mt-1 text-sm text-muted">
          選班 → 各項目可加多張照片（不扣分）→ 需要時再「標記缺失」→ 發布。
        </p>
        <p
          className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm ${
            user && isAdmin
              ? "bg-leaf/15 text-mint"
              : "bg-coral/10 text-coral"
          }`}
        >
          {!user ? (
            <>
              尚未登入：發布不會進全校相簿。{" "}
              <Link href="/login" className="underline">
                前往登入
              </Link>
            </>
          ) : profile === undefined ? (
            <>已登入：{user.email ?? user.uid}｜正在檢查 admin 權限…</>
          ) : isAdmin ? (
            <>
              已登入：{user.email}｜權限正常（admin）｜UID：
              {user.uid.slice(0, 8)}…
            </>
          ) : (
            <>
              已登入：{user.email}｜但沒有 admin 權限。
              <br />
              UID：<span className="font-mono">{user.uid}</span>
              <br />
              Firestore 應有文件 <span className="font-mono">users/{user.uid}</span>
              ，欄位 <span className="font-mono">role = admin</span>
              （目前：{profile?.role ?? "找不到文件"}）
              {profileError ? `｜${profileError}` : ""}
            </>
          )}
        </p>
        {selected ? (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-leaf/15 px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              {selected.class_name}（{selected.class_id}）
              <span className="ml-2 font-normal text-muted">
                照片 {photoCount} 張
              </span>
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
              {totalScore}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">請先選擇班級再評分。</p>
        )}
      </section>

      <section className="panel p-3 sm:p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">選擇班級</h2>
        <p className="mb-2 text-[11px] text-muted">
          國中為班號；高中為忠孝仁愛信。共 {CLASS_ROSTER.length} 班。
        </p>
        <ClassRosterPicker selectedId={classId} />
      </section>

      {classId ? (
        <>
          <section className="panel p-3 sm:p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">評分細項</h2>
            <ul className="grid gap-2">
              {categories.map((cat) => (
                <li
                  key={cat.category}
                  className={`rounded-lg border p-2.5 ${
                    cat.flagged
                      ? "border-coral/40 bg-coral/5"
                      : "border-line bg-paper/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">
                      {cat.category}{" "}
                      <span className="text-xs font-normal text-muted">
                        {cat.flagged
                          ? `扣 ${cat.deduction}`
                          : cat.photos.length
                            ? `佐證 ${cat.photos.length} 張`
                            : "滿分"}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy || cat.photos.length >= MAX_PHOTOS_PER_CATEGORY}
                        onClick={() => {
                          setActiveCategory(cat.category);
                          cameraRef.current?.click();
                        }}
                        className="rounded-md border border-line bg-white px-2.5 py-1 text-xs hover:border-mint disabled:opacity-50 sm:text-sm"
                      >
                        拍照
                      </button>
                      <button
                        type="button"
                        disabled={busy || cat.photos.length >= MAX_PHOTOS_PER_CATEGORY}
                        onClick={() => {
                          setActiveCategory(cat.category);
                          albumRef.current?.click();
                        }}
                        className="rounded-md border border-line bg-white px-2.5 py-1 text-xs hover:border-mint disabled:opacity-50 sm:text-sm"
                      >
                        相簿
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.category)}
                        className={`rounded-md px-2.5 py-1 text-xs sm:text-sm ${
                          cat.flagged
                            ? "bg-coral text-white"
                            : "bg-mint/10 text-mint"
                        }`}
                      >
                        {cat.flagged ? "已標記扣分" : "標記缺失"}
                      </button>
                    </div>
                  </div>
                  {cat.flagged ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr]">
                      <label className="text-xs text-muted">
                        扣分
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={cat.deduction}
                          onChange={(e) =>
                            updateCategory(cat.category, {
                              deduction: Number(e.target.value) || 1,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-line px-2 py-1"
                        />
                      </label>
                      <label className="text-xs text-muted">
                        備註
                        <input
                          type="text"
                          value={cat.note}
                          onChange={(e) =>
                            updateCategory(cat.category, {
                              note: e.target.value,
                            })
                          }
                          placeholder="例如：教室掃具未歸位"
                          className="mt-1 w-full rounded-md border border-line px-2 py-1"
                        />
                      </label>
                    </div>
                  ) : cat.photos.length > 0 ? (
                    <label className="mt-2 block text-xs text-muted">
                      備註（選填）
                      <input
                        type="text"
                        value={cat.note}
                        onChange={(e) =>
                          updateCategory(cat.category, {
                            note: e.target.value,
                          })
                        }
                        placeholder="給班級看的說明，不會扣分"
                        className="mt-1 w-full rounded-md border border-line px-2 py-1"
                      />
                    </label>
                  ) : null}
                  {cat.photos.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {cat.photos.map((p) => (
                        <div key={p.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt=""
                            className="aspect-square w-full rounded-md object-cover"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => removePhoto(cat.category, p.id)}
                            className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-[10px] text-white"
                            aria-label="移除照片"
                          >
                            ×
                          </button>
                          <p className="mt-0.5 truncate text-[10px] text-muted">
                            {formatBytes(p.originalBytes)}→
                            {formatBytes(p.compressedBytes)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
            <input
              ref={albumRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onPickPhotos(e.target.files)}
            />
          </section>

          <section className="panel p-3 sm:p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">環境說明</h2>
            <p className="mb-1.5 text-[11px] text-muted">
              點選罐頭文字帶入（可再改字）；也可直接打字。
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUMMARY_PRESETS.map((preset) => {
                const active = summary === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={busy}
                    onClick={() => setSummary(preset)}
                    className={`max-w-full rounded-md border px-2 py-1 text-left text-[11px] leading-snug transition sm:text-xs ${
                      active
                        ? "border-mint bg-mint text-white"
                        : "border-line bg-white text-ink hover:border-mint hover:bg-leaf/15"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="可先只放照片給班級改善，稍後再標記扣分…"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none ring-mint focus:ring-2"
            />
            {summary ? (
              <button
                type="button"
                className="mt-1.5 text-[11px] text-muted underline"
                onClick={() => setSummary("")}
              >
                清除說明
              </button>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onPublish}
                className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white transition hover:bg-leaf disabled:opacity-50"
              >
                {busy ? "處理中…" : "發布到班級相簿"}
              </button>
              <Link
                href={`/classes/${classId}`}
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-leaf/10"
              >
                查看班級相簿
              </Link>
            </div>
            {message ? (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  message.includes("雲端") || message.includes("已發布到")
                    ? "bg-leaf/15 text-mint"
                    : message.includes("尚未登入") || message.includes("權限")
                      ? "bg-coral/10 text-coral"
                      : "bg-leaf/10 text-ink"
                }`}
              >
                {message}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
