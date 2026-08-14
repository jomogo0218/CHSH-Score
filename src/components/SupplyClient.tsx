"use client";

import { useEffect, useMemo, useState } from "react";
import { CLASS_ROSTER } from "@/lib/constants";
import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";
import { displayClassName, resolveClassId } from "@/lib/classes/resolve-id";
import { sameClass } from "@/lib/class-pin/storage";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import {
  createSupplyRequest,
  fetchSupplyRequests,
  fetchUserProfile,
  subscribeSupplyRequests,
  updateSupplyRequestStatus,
} from "@/lib/firebase/firestore";
import {
  getLocalSupplyRequests,
  saveLocalSupplyRequest,
  updateLocalSupplyStatus,
} from "@/lib/local/store";
import { emitSupplyUpdate, onSupplyUpdate } from "@/lib/live/supply-events";
import { rememberClassFromReport } from "@/lib/class-pin/remember";
import {
  enableStaffNotify,
  notifyTeacherSupplyReady,
  readStaffNotifyEnabled,
  setStaffNotifyEnabled,
} from "@/lib/notify/staff-alert";
import { telegramStaffBindHref } from "@/lib/notify/telegram-links";
import {
  SUPPLY_ITEMS,
  SUPPLY_STATUS_LABELS,
  supplyItemById,
} from "@/lib/supply/catalog";
import type { SupplyRequestDoc, SupplyStatus } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { RememberClassPanel } from "@/components/RememberClassPanel";

function mergeRows(remote: SupplyRequestDoc[], local: SupplyRequestDoc[]) {
  const map = new Map<string, SupplyRequestDoc>();
  for (const row of [...local, ...remote]) map.set(row.request_id, row);
  return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function SupplyClient() {
  const { classId: pinnedClassId } = usePinnedClass();
  const [classId, setClassId] = useState(pinnedClassId ?? CLASS_ROSTER[0]?.class_id ?? "");
  const [itemIds, setItemIds] = useState<string[]>([SUPPLY_ITEMS[0].id]);
  const [quantity, setQuantity] = useState(1);
  const [applicantName, setApplicantName] = useState("導師");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffNotify, setStaffNotify] = useState(false);
  const [rows, setRows] = useState<SupplyRequestDoc[]>(() => getLocalSupplyRequests());

  useEffect(() => {
    if (pinnedClassId) setClassId(pinnedClassId);
  }, [pinnedClassId]);

  useEffect(() => {
    setStaffNotify(readStaffNotifyEnabled());
    return subscribeAuth((user) => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      void fetchUserProfile(user.uid)
        .then((profile) => setIsAdmin(profile?.role === "admin"))
        .catch(() => setIsAdmin(false));
    });
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (isFirebaseConfigured()) {
      try {
        unsub = subscribeSupplyRequests((remote) => {
          setRows(mergeRows(remote, getLocalSupplyRequests()));
        });
      } catch {
        void fetchSupplyRequests()
          .then((remote) => setRows(mergeRows(remote, getLocalSupplyRequests())))
          .catch(() => setRows(getLocalSupplyRequests()));
      }
    }
    const stop = onSupplyUpdate((row) => {
      setRows((prev) => mergeRows([row], prev));
    });
    return () => {
      unsub?.();
      stop();
    };
  }, []);

  const mine = useMemo(
    () => rows.filter((row) => sameClass(row.class_id, classId || pinnedClassId)),
    [rows, classId, pinnedClassId],
  );
  const pending = rows.filter((row) => row.status === "pending");

  function toggleItem(id: string) {
    setItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit() {
    const resolved = resolveClassId(classId) ?? classId;
    if (!resolved) {
      setMessage("請先選擇班級");
      return;
    }
    if (itemIds.length === 0) {
      setMessage("請至少勾選一項用品");
      return;
    }
    const name = applicantName.trim() || "導師";
    setBusy(true);
    setMessage("正在送出申請…");
    try {
      const saved: SupplyRequestDoc[] = [];
      for (const itemId of itemIds) {
        const item = supplyItemById(itemId);
        if (!item) continue;
        let row: SupplyRequestDoc;
        if (isFirebaseConfigured()) {
          row = await createSupplyRequest({
            classId: resolved,
            itemId: item.id,
            itemLabel: item.label,
            quantity,
            note,
            applicantName: name,
          });
        } else {
          row = {
            request_id: `local_${Date.now()}_${item.id}`,
            class_id: resolved,
            item_id: item.id,
            item_label: item.label,
            quantity,
            note: note.trim(),
            applicant_name: name,
            status: "pending",
            created_at: new Date().toISOString(),
          };
          saveLocalSupplyRequest(row);
        }
        saved.push(row);
        emitSupplyUpdate(row);
        rememberClassFromReport({ classId: resolved });
        void fetch("/api/notify-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: resolved,
            itemId: item.id,
            itemLabel: item.label,
            quantity,
            applicantName: name,
          }),
        }).catch(() => undefined);
      }
      setRows((prev) => mergeRows(saved, prev));
      setMessage(
        `已送出 ${saved.length} 筆申請。組長處理後請至學務處領取。`,
      );
      setNote("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "送出失敗");
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(row: SupplyRequestDoc, status: SupplyStatus) {
    setBusy(true);
    try {
      if (isFirebaseConfigured()) {
        await updateSupplyRequestStatus(row.request_id, status);
      } else {
        updateLocalSupplyStatus(row.request_id, status);
      }
      const next = { ...row, status, updated_at: new Date().toISOString() };
      emitSupplyUpdate(next);
      setRows((prev) => mergeRows([next], prev));
      if (status === "ready") notifyTeacherSupplyReady(next);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新失敗");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStaffNotify() {
    if (staffNotify) {
      setStaffNotifyEnabled(false);
      setStaffNotify(false);
      return;
    }
    const ok = await enableStaffNotify();
    setStaffNotify(ok);
  }

  async function testTelegram() {
    setBusy(true);
    setMessage("正在測試 Telegram…");
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const user = getFirebaseAuth()?.currentUser;
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const res = await fetch("/api/notify-staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ test: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        telegram?: { ok?: boolean; skipped?: boolean; error?: string };
      };
      if (!res.ok) {
        setMessage(data.error || "測試失敗，請先登入組長");
        return;
      }
      if (data.telegram?.error) {
        setMessage(data.telegram.error);
        return;
      }
      if (data.telegram?.skipped) {
        setMessage("尚未設定 Telegram 金鑰。");
        return;
      }
      setMessage("已發測試訊息到 Telegram，請到 @terry_stock_bot 查看。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "測試失敗");
    } finally {
      setBusy(false);
    }
  }

  async function testInspectReminder() {
    setBusy(true);
    setMessage("正在送巡察提醒…");
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const user = getFirebaseAuth()?.currentUser;
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const res = await fetch("/api/notify-staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "inspect_reminder" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        telegram?: { ok?: boolean; skipped?: boolean; error?: string };
      };
      if (!res.ok) {
        setMessage(data.error || "提醒失敗，請先登入組長");
        return;
      }
      if (data.telegram?.error) {
        setMessage(data.telegram.error);
        return;
      }
      setMessage("已送巡察提醒到 Telegram。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "提醒失敗");
    } finally {
      setBusy(false);
    }
  }

  async function testDigest() {
    setBusy(true);
    setMessage("正在送早報…");
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const user = getFirebaseAuth()?.currentUser;
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const res = await fetch("/api/notify-staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ type: "digest" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        telegram?: { ok?: boolean; skipped?: boolean; error?: string };
      };
      if (!res.ok) {
        setMessage(data.error || "早報失敗，請先登入組長");
        return;
      }
      if (data.telegram?.error) {
        setMessage(data.telegram.error);
        return;
      }
      setMessage("已送每日早報到 Telegram。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "早報失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <PageHero src="/themes/atelier/supply.jpg" label="學務處領用" />
      {!pinnedClassId ? <RememberClassPanel compact /> : null}
      <header className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          學務處領用申請
        </h1>
        <p className="text-sm text-muted">
          刷洗廁所清潔劑、小垃圾桶塑膠袋、洗手台肥皂請先在此申請，再到學務處領取。不必登入。
        </p>
      </header>

      <section className="panel space-y-3 p-3 sm:p-4">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
          申請用品
        </h2>
        <label className="block space-y-1 text-sm">
          <span>班級</span>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2"
          >
            {CLASS_ROSTER.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.class_name}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5">
          <p className="text-sm">用品（可複選）</p>
          {SUPPLY_ITEMS.map((item) => (
            <label key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={itemIds.includes(item.id)}
                onChange={() => toggleItem(item.id)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold text-ink">{item.label}</span>
                <span className="ml-1 text-xs text-muted">{item.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="block space-y-1 text-sm">
          <span>數量（每項）</span>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>申請人</span>
          <input
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>備註（選填）</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例如：廁所垃圾袋用完"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit()}
          className="btn-block btn-primary btn-wide"
        >
          {busy ? "處理中…" : "送出申請"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </section>

      {isAdmin ? (
        <section className="panel space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
              組長收件箱
              {pending.length ? `（${pending.length}）` : ""}
            </h2>
            <button
              type="button"
              onClick={() => void toggleStaffNotify()}
              className={`btn-block px-3 py-2 text-sm ${staffNotify ? "btn-primary" : ""}`}
            >
              {staffNotify ? "領用通知已開" : "開啟領用通知"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void testTelegram()}
              className="btn-block px-3 py-2 text-sm"
            >
              測試 Telegram
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void testDigest()}
              className="btn-block px-3 py-2 text-sm"
            >
              測試早報
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void testInspectReminder()}
              className="btn-block px-3 py-2 text-sm"
            >
              測試巡察提醒
            </button>
            <a
              href={telegramStaffBindHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-block px-3 py-2 text-sm"
            >
              綁定組長 Telegram
            </a>
          </div>
          <p className="text-xs text-muted">
            先按「綁定組長 Telegram」再按「測試」。導師不必綁定，用網頁看「環境」即可。
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">尚無申請。</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.request_id}
                  className={`rounded-lg border bg-paper/80 px-3 py-2.5 ${
                    row.status === "pending" ? "alert-box" : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">
                      {displayClassName(row.class_id)} · {row.item_label} ×
                      {row.quantity}
                    </p>
                    <span className="text-xs text-muted">
                      {SUPPLY_STATUS_LABELS[row.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {row.applicant_name}
                    {row.note ? ` · ${row.note}` : ""} ·{" "}
                    {row.created_at.slice(0, 16).replace("T", " ")}
                  </p>
                  {row.status === "pending" || row.status === "ready" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onStatus(row, "ready")}
                            className="btn-block btn-primary px-3 py-1.5 text-xs"
                          >
                            可領取
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void onStatus(row, "rejected")}
                            className="btn-block btn-coral px-3 py-1.5 text-xs"
                          >
                            未通過
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onStatus(row, "done")}
                          className="btn-block btn-primary px-3 py-1.5 text-xs"
                        >
                          已領取
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="panel space-y-2 p-3 sm:p-4">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-mint">
            本班申請紀錄
          </h2>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">本班尚無申請。</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((row) => (
                <li
                  key={row.request_id}
                  className={`rounded-lg border px-3 py-2 ${
                    row.status === "ready" ? "alert-box" : "border-line"
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">
                    {row.item_label} ×{row.quantity} · {SUPPLY_STATUS_LABELS[row.status]}
                  </p>
                  <p className="text-xs text-muted">
                    {row.created_at.slice(0, 16).replace("T", " ")}
                    {row.status === "ready" ? " · 請至學務處領取" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="panel p-3 text-xs leading-relaxed text-muted sm:p-4">
        <p className="font-semibold text-ink">即時通知可以接到哪裡？</p>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>
            Telegram（@terry_stock_bot）：只有組長要綁定。會收到領用、打掃回報、巡察缺失、每天 07:30／12:30 巡察提醒、早上 8 點早報。導師用網頁即可。
          </li>
          <li>網頁／PWA：組長開啟「領用通知」後，網頁開著也會跳出。</li>
          <li>LINE 官方帳號仍可另接；簡訊／iMessage 無法免費直連。</li>
        </ul>
      </section>
    </div>
  );
}
