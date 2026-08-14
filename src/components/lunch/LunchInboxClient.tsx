"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  subscribeLunchReports,
  updateLunchReportStatus,
  upsertLunchMenu,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { emitLunchPendingCount } from "@/lib/live/lunch-events";
import {
  LUNCH_KIND_LABEL,
  parseDishesText,
  todayRocString,
} from "@/lib/lunch/menus";
import type { LunchReportDoc, LunchReportStatus } from "@/lib/types";

export function LunchInboxClient() {
  const [rows, setRows] = useState<LunchReportDoc[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuDate, setMenuDate] = useState(todayRocString);
  const [menuText, setMenuText] = useState("");
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuMsg, setMenuMsg] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribeLunchReports(setRows);
  }, []);

  const pending = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );

  useEffect(() => {
    emitLunchPendingCount(pending);
  }, [pending]);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === "pending");
  }, [rows, filter]);

  async function setStatus(id: string, status: LunchReportStatus) {
    setBusyId(id);
    try {
      await updateLunchReportStatus(id, status);
    } catch {
      alert("更新失敗，請確認已登入組長帳號");
    } finally {
      setBusyId(null);
    }
  }

  async function saveMenu(e: React.FormEvent) {
    e.preventDefault();
    const dishes = parseDishesText(menuText);
    if (!menuDate.trim() || dishes.length === 0) {
      alert("請填日期與至少一道菜");
      return;
    }
    setMenuBusy(true);
    setMenuMsg("");
    try {
      await upsertLunchMenu({ date: menuDate.trim(), dishes });
      setMenuMsg(`已更新 ${menuDate.trim()}（${dishes.length} 道）`);
      setMenuText("");
    } catch {
      setMenuMsg("儲存失敗：需登入組長帳號，並已發布最新 firestore.rules");
    } finally {
      setMenuBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-bold tracking-wide text-muted">組長工具</p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
          午餐收件
        </h1>
        <p className="text-sm text-muted">
          待處理 {pending} 筆 ·{" "}
          <Link href="/lunch" className="text-mint underline">
            回佈告欄
          </Link>
        </p>
      </header>

      <section className="panel space-y-3 p-4">
        <h2 className="text-sm font-bold text-ink">更新菜單（覆蓋當日）</h2>
        <p className="text-xs text-muted">
          日期用民國年，例如 {todayRocString()}。菜名用換行或頓號分隔。
        </p>
        <form className="space-y-2" onSubmit={saveMenu}>
          <input
            value={menuDate}
            onChange={(e) => setMenuDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm font-bold text-ink"
            placeholder="115/8/14"
          />
          <textarea
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
            placeholder={"紅燒牛肉\n炒青菜\n番茄蛋花湯"}
          />
          <button
            type="submit"
            disabled={menuBusy}
            className="btn-block btn-primary px-4 py-2.5 disabled:opacity-50"
          >
            {menuBusy ? "儲存中…" : "寫入菜單"}
          </button>
          {menuMsg ? <p className="text-xs text-muted">{menuMsg}</p> : null}
        </form>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`btn-block px-3 py-1.5 text-sm ${filter === "pending" ? "btn-primary" : ""}`}
        >
          待處理
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`btn-block px-3 py-1.5 text-sm ${filter === "all" ? "btn-primary" : ""}`}
        >
          全部
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-muted">目前沒有回報。</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.report_id} className="panel space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink">
                    {LUNCH_KIND_LABEL[row.kind] || row.kind} · {row.class_name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {new Date(row.created_at).toLocaleString("zh-TW")}
                    {row.menu_date ? ` · 菜單 ${row.menu_date}` : ""}
                    {row.status !== "pending" ? ` · ${row.status}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] font-bold text-muted ring-1 ring-line">
                  {row.status}
                </span>
              </div>
              {row.dish ? (
                <p className="text-xs font-bold text-ink">菜色：{row.dish}</p>
              ) : null}
              {row.dishes && row.dishes.length > 0 ? (
                <p className="text-xs text-muted">{row.dishes.join("、")}</p>
              ) : null}
              {row.rating != null ? (
                <p className="text-xs text-muted">{row.rating} 星</p>
              ) : null}
              {row.portion ? (
                <p className="text-xs text-muted">份量：{row.portion}</p>
              ) : null}
              {row.leftover ? (
                <p className="text-xs text-muted">剩食：{row.leftover}</p>
              ) : null}
              {row.comment || row.reason ? (
                <p className="text-sm text-ink">{row.comment || row.reason}</p>
              ) : null}
              {row.photo_urls && row.photo_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {row.photo_urls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block h-16 w-16 overflow-hidden rounded-lg ring-1 ring-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              {row.status === "pending" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === row.report_id}
                    onClick={() => void setStatus(row.report_id, "acked")}
                    className="btn-block px-3 py-1.5 text-sm"
                  >
                    已讀
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.report_id}
                    onClick={() => void setStatus(row.report_id, "closed")}
                    className="btn-block btn-primary px-3 py-1.5 text-sm"
                  >
                    結案
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
