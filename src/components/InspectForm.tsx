"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASS_ROSTER, INSPECTION_CATEGORIES } from "@/lib/constants";
import { invalidateCache } from "@/lib/cache/ttl";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import {
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
import type { InspectionDoc, InspectionStatus, UserDoc } from "@/lib/types";
import type { User } from "firebase/auth";

type CategoryState = {
  category: string;
  flagged: boolean;
  deduction: number;
  note: string;
  photoUrl?: string;
  previewUrl?: string;
  originalBytes?: number;
  compressedBytes?: number;
};

const DEFAULT_DEDUCTION = 5;

function todayId(classId: string) {
  return `${new Date().toISOString().slice(0, 10)}_${classId}`;
}

export function InspectForm({ classId }: { classId?: string }) {
  const selected = CLASS_ROSTER.find((c) => c.class_id === classId);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const photoCount = categories.filter((c) => c.photoUrl).length;

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

  async function onPickPhoto(file: File | undefined) {
    if (!file || !activeCategory || !classId) return;
    setBusy(true);
    setMessage(null);
    try {
      const originalBytes = file.size;
      const compressed = await compressInspectionPhoto(file);
      const uploaded = await uploadInspectionPhoto(compressed, { classId });
      updateCategory(activeCategory, {
        flagged: true,
        photoUrl: uploaded.photoUrl,
        previewUrl: uploaded.photoUrl,
        note:
          categories.find((c) => c.category === activeCategory)?.note ||
          `${activeCategory}巡察佐證`,
        originalBytes,
        compressedBytes: compressed.size,
      });
      setMessage(
        `${activeCategory} 照片已就緒（${formatBytes(originalBytes)} → ${formatBytes(compressed.size)}${uploaded.stub ? "，stub" : "，已上 R2"}）。請再按下方「發布到班級相簿」。`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
      setActiveCategory(null);
      if (fileRef.current) fileRef.current.value = "";
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

    setBusy(true);
    setMessage("正在寫入班級相簿…");
    try {
      const flagged = categories.filter((c) => c.flagged);
      const withPhotos = categories.filter((c) => c.photoUrl);
      const cover =
        withPhotos[0]?.photoUrl ??
        flagged.find((c) => c.photoUrl)?.photoUrl;
      const summaryBlog =
        summary.trim() ||
        (flagged.length || withPhotos.length
          ? [...flagged, ...withPhotos]
              .filter(
                (c, i, arr) =>
                  arr.findIndex((x) => x.category === c.category) === i,
              )
              .map((c) => `${c.category}${c.note ? `：${c.note}` : ""}`)
              .join("；")
          : "各區整潔，維持良好。");

      const inspectorId = auth?.currentUser?.uid ?? "local_inspector";
      const payloadCats = categories.map((c) => ({
        category: c.category,
        score_deduction: c.flagged ? -Math.abs(c.deduction) : 0,
        note: c.note,
        photo_url: c.photoUrl,
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
          date: new Date().toISOString().slice(0, 10),
          class_id: classId,
          inspector_id: inspectorId,
          total_score: Math.max(0, 100 - deduction),
          summary_blog: summaryBlog,
          status,
          cover_photo_url: cover,
          created_at: new Date().toISOString(),
        };
        saveLocalInspection(
          inspection,
          payloadCats
            .filter((c) => c.score_deduction < 0 || c.photo_url || c.note)
            .map((c) => ({
              inspection_id: inspection.inspection_id,
              category: c.category,
              score_deduction: c.score_deduction,
              note: c.note,
              photo_url: c.photo_url ?? "",
              photo_timestamp: new Date().toTimeString().slice(0, 8),
            })),
        );
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

      setMessage(
        wroteCloud
          ? `已發布到雲端：${selected.class_name} ${inspection.total_score} 分。請打開班級相簿查看（可強制重整）。`
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
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-mint">
          巡察拍照與評分
        </h1>
        <p className="mt-2 text-muted">
          流程：選班 → 拍照 → 按「發布到班級相簿」。只拍照不發布，班級頁不會出現。
        </p>
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            user && isAdmin
              ? "bg-leaf/15 text-mint"
              : user
                ? "bg-coral/10 text-coral"
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-leaf/15 px-4 py-3">
            <p className="font-semibold text-ink">
              目前班級：{selected.class_name}（{selected.class_id}）
            </p>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-mint">
              {totalScore}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">請先選擇班級再評分。</p>
        )}
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="mb-3 font-semibold text-ink">選擇班級</h2>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
          {CLASS_ROSTER.map((c) => (
            <Link
              key={c.class_id}
              href={`/inspect/${c.class_id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                c.class_id === classId
                  ? "border-mint bg-mint text-white"
                  : "border-line bg-paper hover:bg-leaf/15"
              }`}
            >
              {c.class_name}
            </Link>
          ))}
        </div>
      </section>

      {classId ? (
        <>
          <section className="panel p-5 sm:p-6">
            <h2 className="mb-3 font-semibold text-ink">評分細項</h2>
            <ul className="grid gap-3">
              {categories.map((cat) => (
                <li
                  key={cat.category}
                  className={`rounded-xl border p-4 ${
                    cat.flagged
                      ? "border-coral/40 bg-coral/5"
                      : "border-line bg-paper/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.category)}
                      className="font-semibold text-ink"
                    >
                      {cat.category}{" "}
                      <span className="text-sm font-normal text-muted">
                        {cat.flagged ? `扣 ${cat.deduction} 分` : "滿分"}
                      </span>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setActiveCategory(cat.category);
                          fileRef.current?.click();
                        }}
                        className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm hover:border-mint"
                      >
                        拍照
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.category)}
                        className={`rounded-lg px-3 py-1.5 text-sm ${
                          cat.flagged
                            ? "bg-coral text-white"
                            : "bg-mint/10 text-mint"
                        }`}
                      >
                        {cat.flagged ? "已標記缺失" : "標記缺失"}
                      </button>
                    </div>
                  </div>
                  {cat.flagged ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
                      <label className="text-sm text-muted">
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
                          className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                        />
                      </label>
                      <label className="text-sm text-muted">
                        備註
                        <input
                          type="text"
                          value={cat.note}
                          onChange={(e) =>
                            updateCategory(cat.category, {
                              note: e.target.value,
                            })
                          }
                          placeholder="例如：排水孔有落葉積水"
                          className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                        />
                      </label>
                    </div>
                  ) : null}
                  {cat.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.previewUrl}
                      alt={cat.category}
                      className="mt-3 max-h-40 rounded-lg object-cover"
                    />
                  ) : null}
                  {cat.compressedBytes != null && cat.originalBytes != null ? (
                    <p className="mt-2 text-xs text-muted">
                      壓縮：{formatBytes(cat.originalBytes)} →{" "}
                      {formatBytes(cat.compressedBytes)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPickPhoto(e.target.files?.[0])}
            />
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="mb-3 font-semibold text-ink">環境網誌</h2>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="走廊整體整潔，但洗手台有積水…"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none ring-mint focus:ring-2"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={onPublish}
                className="rounded-xl bg-mint px-5 py-2.5 font-semibold text-white transition hover:bg-leaf disabled:opacity-50"
              >
                {busy ? "處理中…" : "發布到班級相簿"}
              </button>
              <Link
                href={`/classes/${classId}`}
                className="rounded-xl border border-line px-5 py-2.5 font-semibold text-ink hover:bg-leaf/10"
              >
                查看班級相簿
              </Link>
            </div>
            {message ? (
              <p
                className={`mt-4 rounded-lg px-3 py-2 text-sm ${
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
