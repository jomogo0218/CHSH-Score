"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASS_ROSTER, SUMMARY_PRESETS } from "@/lib/constants";
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
import {
  REPEAT_UNFIXED_PENALTY,
  SCORING_RUBRIC,
  SCORING_RUBRIC_META,
  SCORE_BASE,
  computeInspectionTotal,
  formatRubricScore,
} from "@/lib/constants/scoring-rubric";
import { taiwanDateString } from "@/lib/time/taiwan";
import type { InspectionDoc, InspectionStatus, UserDoc } from "@/lib/types";
import type { User } from "firebase/auth";

type PhotoEntry = {
  id: string;
  url: string;
  originalBytes: number;
  compressedBytes: number;
};

type ItemState = {
  itemId: string;
  sectionId: string;
  category: string;
  score: number | null;
  levelLabel: string | null;
  repeatUnfixed: boolean;
  note: string;
  photos: PhotoEntry[];
};

const MAX_PHOTOS_PER_ITEM = 8;

function todayId(classId: string) {
  return `${taiwanDateString()}_${classId}`;
}

function newPhotoId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildInitialItems(): ItemState[] {
  return SCORING_RUBRIC.flatMap((section) =>
    section.items.map((item) => ({
      itemId: item.id,
      sectionId: section.id,
      category: item.title,
      score: null,
      levelLabel: null,
      repeatUnfixed: false,
      note: "",
      photos: [],
    })),
  );
}

function effectiveScore(item: ItemState): number | null {
  if (item.repeatUnfixed) return REPEAT_UNFIXED_PENALTY;
  return item.score;
}

export function InspectForm({ classId }: { classId?: string }) {
  const selected = CLASS_ROSTER.find((c) => c.class_id === classId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null | undefined>(undefined);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [items, setItems] = useState<ItemState[]>(buildInitialItems);

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
          setProfileError(
            err instanceof Error ? err.message : "讀取 profile 失敗",
          );
        });
    });
  }, []);

  const isAdmin = profile?.role === "admin";

  const scoredItems = useMemo(
    () => items.filter((i) => effectiveScore(i) !== null),
    [items],
  );

  const totalScore = useMemo(
    () =>
      computeInspectionTotal(
        scoredItems.map((i) => effectiveScore(i) as number),
      ),
    [scoredItems],
  );

  const scoreDelta = totalScore - SCORE_BASE;
  const photoCount = items.reduce((sum, i) => sum + i.photos.length, 0);

  function updateItem(itemId: string, patch: Partial<ItemState>) {
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, ...patch } : i)),
    );
  }

  function selectLevel(itemId: string, score: number, label: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.itemId !== itemId) return i;
        const same = i.score === score && i.levelLabel === label && !i.repeatUnfixed;
        if (same) {
          return { ...i, score: null, levelLabel: null };
        }
        return {
          ...i,
          score,
          levelLabel: label,
          repeatUnfixed: false,
        };
      }),
    );
  }

  function removePhoto(itemId: string, photoId: string) {
    setItems((prev) =>
      prev.map((i) =>
        i.itemId === itemId
          ? { ...i, photos: i.photos.filter((p) => p.id !== photoId) }
          : i,
      ),
    );
  }

  function clearPhotoInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (albumRef.current) albumRef.current.value = "";
  }

  async function onPickPhotos(fileList: FileList | null) {
    if (!fileList?.length || !activeItemId || !classId) return;
    const item = items.find((i) => i.itemId === activeItemId);
    if (!item) return;

    const room = MAX_PHOTOS_PER_ITEM - item.photos.length;
    if (room <= 0) {
      setMessage(`${item.category} 最多 ${MAX_PHOTOS_PER_ITEM} 張。`);
      setActiveItemId(null);
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
      setItems((prev) =>
        prev.map((i) => {
          if (i.itemId !== activeItemId) return i;
          return {
            ...i,
            photos: [...i.photos, ...added],
            note: i.note || (added.length ? `${i.category}巡察佐證` : i.note),
          };
        }),
      );
      setMessage(
        `${item.category} 已加 ${added.length} 張（共 ${item.photos.length + added.length} 張）。請再點選加減分標準。`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setBusy(false);
      setActiveItemId(null);
      clearPhotoInputs();
    }
  }

  async function onPublish() {
    if (!classId || !selected) {
      setMessage("請先選擇班級");
      return;
    }
    if (scoredItems.length === 0 && photoCount === 0) {
      setMessage("請先至少點選一項評分標準，或拍一張照片後再發布。");
      return;
    }

    const auth = getFirebaseAuth();
    if (isFirebaseConfigured() && !auth?.currentUser) {
      setMessage(
        "尚未登入組長帳號：現在發布只會留在這支手機，導師看不到。請先到「登入」後再發布。",
      );
      return;
    }
    if (
      isFirebaseConfigured() &&
      auth?.currentUser &&
      profile?.role !== "admin"
    ) {
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
        // ignore
      }
    }

    setBusy(true);
    setMessage("正在寫入班級相簿…");
    try {
      const withPhotos = items.filter((i) => i.photos.length > 0);
      const cover = withPhotos[0]?.photos[0]?.url;
      const summaryBlog =
        summary.trim() ||
        (scoredItems.length || withPhotos.length
          ? [...scoredItems, ...withPhotos]
              .filter(
                (c, i, arr) =>
                  arr.findIndex((x) => x.itemId === c.itemId) === i,
              )
              .map((c) => {
                const sc = effectiveScore(c);
                const tag =
                  sc === null
                    ? "佐證"
                    : sc < 0
                      ? `待改善 ${formatRubricScore(sc)}`
                      : sc > 0
                        ? `加分 ${formatRubricScore(sc)}`
                        : "持平";
                return `${c.category}（${tag}${c.levelLabel ? `：${c.levelLabel}` : ""}${c.photos.length ? ` ${c.photos.length} 張` : ""}）`;
              })
              .join("；")
          : "各區整潔，維持良好。");

      const inspectorId = auth?.currentUser?.uid ?? "local_inspector";
      const payloadCats = items.map((c) => {
        const sc = effectiveScore(c);
        const scored = sc !== null;
        const noteParts = [
          c.repeatUnfixed ? "重複未改善" : "",
          c.levelLabel && !c.repeatUnfixed ? c.levelLabel : "",
          c.note,
        ].filter(Boolean);
        return {
          category: c.category,
          score_deduction: scored ? (sc as number) : 0,
          scored,
          note: noteParts.join("｜"),
          photo_urls: c.photos.map((p) => p.url),
        };
      });

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
        const scores = payloadCats
          .filter((c) => c.scored)
          .map((c) => c.score_deduction);
        const hasPenalty = scores.some((s) => s < 0);
        const status: InspectionStatus = hasPenalty
          ? "pending_fix"
          : "pass";
        inspection = {
          inspection_id: todayId(classId),
          date: taiwanDateString(),
          class_id: classId,
          inspector_id: inspectorId,
          total_score: computeInspectionTotal(scores),
          summary_blog: summaryBlog,
          status,
          cover_photo_url: cover,
          created_at: new Date().toISOString(),
        };
        const stamp = new Date().toTimeString().slice(0, 8);
        const localItems = payloadCats.flatMap((c) => {
          const urls = c.photo_urls ?? [];
          if (!c.scored && urls.length === 0 && !c.note) return [];
          if (urls.length === 0) {
            return [
              {
                inspection_id: inspection.inspection_id,
                category: c.category,
                score_deduction: c.scored ? c.score_deduction : 0,
                note: c.note,
                photo_url: "",
                photo_timestamp: stamp,
              },
            ];
          }
          return urls.map((url, i) => ({
            inspection_id: inspection.inspection_id,
            category: c.category,
            score_deduction: i === 0 && c.scored ? c.score_deduction : 0,
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
          ? "狀態合格（無扣分項）。"
          : "狀態為待改善（含扣分項）。";
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
          依衛生組標準逐項點選加減分（基準 {SCORE_BASE}），可附照片佐證後發布。
        </p>
        <p className="mt-1.5 rounded-md bg-coral/10 px-2.5 py-1.5 text-xs text-coral">
          {SCORING_RUBRIC_META.globalNote}
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
              Firestore 應有文件{" "}
              <span className="font-mono">users/{user.uid}</span>，欄位{" "}
              <span className="font-mono">role = admin</span>
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
                已評 {scoredItems.length}/{items.length}｜照片 {photoCount}
              </span>
            </p>
            <div className="text-right">
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
                {totalScore}
              </p>
              <p className="text-[11px] text-muted">
                {SCORE_BASE}
                {scoreDelta === 0
                  ? ""
                  : scoreDelta > 0
                    ? ` ${formatRubricScore(scoreDelta)}`
                    : ` ${scoreDelta}`}
              </p>
            </div>
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
            <h2 className="mb-2 text-sm font-semibold text-ink">
              {SCORING_RUBRIC_META.title}
            </h2>
            <p className="mb-3 text-[11px] text-muted">
              {SCORING_RUBRIC_META.revision}｜點同一檔次可取消；「重複未改善」固定
              {formatRubricScore(REPEAT_UNFIXED_PENALTY)}。
            </p>

            <div className="space-y-3">
              {SCORING_RUBRIC.map((section, sectionIndex) => (
                <details
                  key={section.id}
                  open={sectionIndex === 0}
                  className="rounded-lg border border-line"
                >
                  <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-ink">
                    {section.title}
                    <span className="ml-2 text-xs font-normal text-muted">
                      已評{" "}
                      {
                        items.filter(
                          (i) =>
                            i.sectionId === section.id &&
                            effectiveScore(i) !== null,
                        ).length
                      }
                      /{section.items.length}
                    </span>
                  </summary>
                  <div className="space-y-2 border-t border-line p-2.5">
                    {section.intro ? (
                      <p className="text-[11px] text-muted">{section.intro}</p>
                    ) : null}
                    {section.items.map((rubricItem) => {
                      const state = items.find(
                        (i) => i.itemId === rubricItem.id,
                      )!;
                      const sc = effectiveScore(state);
                      return (
                        <div
                          key={rubricItem.id}
                          className={`rounded-lg border p-2.5 ${
                            sc !== null && sc < 0
                              ? "border-coral/40 bg-coral/5"
                              : sc !== null && sc > 0
                                ? "border-mint/40 bg-leaf/10"
                                : "border-line bg-paper/80"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {rubricItem.title}{" "}
                                <span className="text-xs font-normal text-muted">
                                  ({rubricItem.range})
                                </span>
                              </p>
                              {sc !== null ? (
                                <p
                                  className={`text-xs font-semibold ${
                                    sc > 0
                                      ? "text-mint"
                                      : sc < 0
                                        ? "text-coral"
                                        : "text-muted"
                                  }`}
                                >
                                  {formatRubricScore(sc)}
                                  {state.repeatUnfixed
                                    ? "（重複未改善）"
                                    : state.levelLabel
                                      ? `｜${state.levelLabel}`
                                      : ""}
                                </p>
                              ) : (
                                <p className="text-xs text-muted">尚未評分</p>
                              )}
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  state.photos.length >= MAX_PHOTOS_PER_ITEM
                                }
                                onClick={() => {
                                  setActiveItemId(rubricItem.id);
                                  cameraRef.current?.click();
                                }}
                                className="rounded-md border border-line bg-white px-2 py-1 text-xs hover:border-mint disabled:opacity-50"
                              >
                                拍照
                              </button>
                              <button
                                type="button"
                                disabled={
                                  busy ||
                                  state.photos.length >= MAX_PHOTOS_PER_ITEM
                                }
                                onClick={() => {
                                  setActiveItemId(rubricItem.id);
                                  albumRef.current?.click();
                                }}
                                className="rounded-md border border-line bg-white px-2 py-1 text-xs hover:border-mint disabled:opacity-50"
                              >
                                相簿
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {rubricItem.levels.map((level) => {
                              const active =
                                !state.repeatUnfixed &&
                                state.score === level.score &&
                                state.levelLabel === level.label;
                              return (
                                <button
                                  key={`${rubricItem.id}-${level.label}`}
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    selectLevel(
                                      rubricItem.id,
                                      level.score,
                                      level.label,
                                    )
                                  }
                                  className={`rounded-md border px-2 py-1 text-left text-[11px] leading-snug transition sm:text-xs ${
                                    active
                                      ? level.score < 0
                                        ? "border-coral bg-coral text-white"
                                        : level.score > 0
                                          ? "border-mint bg-mint text-white"
                                          : "border-ink bg-ink text-white"
                                      : "border-line bg-white text-ink hover:border-mint"
                                  }`}
                                >
                                  <span className="font-semibold tabular-nums">
                                    {formatRubricScore(level.score)}
                                  </span>{" "}
                                  {level.label}
                                </button>
                              );
                            })}
                          </div>

                          <label className="mt-2 flex items-center gap-2 text-xs text-coral">
                            <input
                              type="checkbox"
                              checked={state.repeatUnfixed}
                              disabled={busy}
                              onChange={(e) =>
                                updateItem(rubricItem.id, {
                                  repeatUnfixed: e.target.checked,
                                })
                              }
                            />
                            重複未改善（
                            {formatRubricScore(REPEAT_UNFIXED_PENALTY)}）
                          </label>

                          {rubricItem.note ? (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                              ※ {rubricItem.note}
                            </p>
                          ) : null}

                          <label className="mt-2 block text-xs text-muted">
                            備註（選填）
                            <input
                              type="text"
                              value={state.note}
                              disabled={busy}
                              onChange={(e) =>
                                updateItem(rubricItem.id, {
                                  note: e.target.value,
                                })
                              }
                              placeholder="補充說明"
                              className="mt-1 w-full rounded-md border border-line px-2 py-1 text-ink"
                            />
                          </label>

                          {state.photos.length > 0 ? (
                            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                              {state.photos.map((p) => (
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
                                    onClick={() =>
                                      removePhoto(rubricItem.id, p.id)
                                    }
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
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>

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
              placeholder="可自動帶入各項評分摘要，也可自行撰寫…"
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
                {busy ? "處理中…" : `發布（${totalScore} 分）`}
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
                className={`mt-2 text-sm ${
                  message.includes("失敗") ||
                  message.includes("沒有") ||
                  message.includes("尚未")
                    ? "text-coral"
                    : "text-mint"
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
