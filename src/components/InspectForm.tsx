"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CLASS_ROSTER, INSPECTION_CATEGORIES } from "@/lib/constants";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { publishInspection } from "@/lib/firebase/firestore";
import {
  compressInspectionPhoto,
  formatBytes,
} from "@/lib/image/compress";
import { saveLocalInspection } from "@/lib/local/store";
import {
  createMqttClientStub,
  getSchoolClientConfig,
  MQTT_TOPICS,
} from "@/lib/mqtt/client";
import { uploadInspectionPhoto } from "@/lib/r2/upload";
import type { InspectionDoc, InspectionStatus } from "@/lib/types";

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
  const [categories, setCategories] = useState<CategoryState[]>(() =>
    INSPECTION_CATEGORIES.map((category) => ({
      category,
      flagged: false,
      deduction: DEFAULT_DEDUCTION,
      note: "",
    })),
  );

  const totalScore = useMemo(() => {
    const deduction = categories
      .filter((c) => c.flagged)
      .reduce((sum, c) => sum + Math.abs(c.deduction), 0);
    return Math.max(0, 100 - deduction);
  }, [categories]);

  function toggleCategory(category: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.category === category ? { ...c, flagged: !c.flagged } : c,
      ),
    );
  }

  function updateCategory(
    category: string,
    patch: Partial<CategoryState>,
  ) {
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
          `${activeCategory}缺失`,
        originalBytes,
        compressedBytes: compressed.size,
      });
      setMessage(
        `${activeCategory} 已壓縮 ${formatBytes(originalBytes)} → ${formatBytes(compressed.size)}${uploaded.stub ? "（stub／本機預覽）" : " 並上傳 R2"}`,
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
    setBusy(true);
    setMessage(null);
    try {
      const flagged = categories.filter((c) => c.flagged);
      const cover =
        flagged.find((c) => c.photoUrl)?.photoUrl ??
        categories.find((c) => c.photoUrl)?.photoUrl;
      const summaryBlog =
        summary.trim() ||
        (flagged.length
          ? flagged.map((c) => `${c.category}${c.note ? `：${c.note}` : ""}`).join("；")
          : "各區整潔，維持良好。");

      const auth = getFirebaseAuth();
      const inspectorId = auth?.currentUser?.uid ?? "local_inspector";
      const payloadCats = categories.map((c) => ({
        category: c.category,
        score_deduction: c.flagged ? -Math.abs(c.deduction) : 0,
        note: c.note,
        photo_url: c.photoUrl,
      }));

      let inspection: InspectionDoc;

      if (isFirebaseConfigured() && auth?.currentUser) {
        inspection = await publishInspection({
          classId,
          inspectorId,
          summaryBlog,
          categories: payloadCats,
          coverPhotoUrl: cover,
        });
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

      const mqtt = createMqttClientStub(getSchoolClientConfig());
      await mqtt.connect();
      const livePayload = JSON.stringify({
        class_id: classId,
        score: inspection.total_score,
        note: inspection.summary_blog,
        photo_url: inspection.cover_photo_url ?? "",
        created_at: inspection.created_at,
        status: inspection.status,
      });
      await mqtt.publish(MQTT_TOPICS.liveFeed, livePayload);
      await mqtt.publish(MQTT_TOPICS.classChannel(classId), livePayload);
      await mqtt.disconnect();

      setMessage(
        `已發布 ${selected.class_name}：${inspection.total_score} 分（${inspection.status}）。${
          isFirebaseConfigured() && auth?.currentUser
            ? "已寫入 Firestore"
            : "已存本機預覽（設定 Firebase 並登入後可寫雲端）"
        }。MQTT 廣播於第 3 週接真實 broker。`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "發布失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-mint">
          組長快速評分
        </h1>
        <p className="mt-2 text-muted">
          點選缺失區域自動扣分，拍照會先壓縮至約 300KB 再上傳。
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
                {busy ? "處理中…" : "發布"}
              </button>
              <Link
                href={`/classes/${classId}`}
                className="rounded-xl border border-line px-5 py-2.5 font-semibold text-ink hover:bg-leaf/10"
              >
                查看班級小站
              </Link>
            </div>
            {message ? (
              <p className="mt-4 rounded-lg bg-leaf/10 px-3 py-2 text-sm text-ink">
                {message}
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
