"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Scale,
  Star,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { BurstCamera } from "@/components/BurstCamera";
import { PageHero } from "@/components/PageHero";
import { RememberClassPanel } from "@/components/RememberClassPanel";
import { CLASS_ROSTER } from "@/lib/constants";
import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";
import {
  createLunchReport,
  subscribeLunchMenus,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureInspectionPhotoSize } from "@/lib/image/compress";
import { rememberClassFromReport } from "@/lib/class-pin/remember";
import {
  findTodayMenuIndex,
  formatRocDisplay,
  mergeLunchMenus,
  todayRocParts,
  weekdayFromRoc,
  weekdayLabel,
} from "@/lib/lunch/menus";
import { pushNotify } from "@/lib/notify/staff-push";
import { uploadFixPhoto } from "@/lib/r2/fix-upload";
import type { LunchMenuDoc, LunchReportKind } from "@/lib/types";

type Reaction = LunchReportKind;

const REPORT_KINDS: ReadonlyArray<{
  id: Reaction;
  label: string;
  hint: string;
  icon: typeof Star;
  tone: string;
  toneActive: string;
}> = [
  {
    id: "feedback",
    label: "口味",
    hint: "好不好吃",
    icon: Star,
    tone: "bg-amber-50 text-amber-900 ring-amber-200",
    toneActive: "bg-amber-500 text-white ring-amber-500",
  },
  {
    id: "portion",
    label: "份量",
    hint: "夠不夠吃",
    icon: Scale,
    tone: "bg-orange-50 text-orange-900 ring-orange-200",
    toneActive: "bg-orange-500 text-white ring-orange-500",
  },
  {
    id: "leftover",
    label: "剩食",
    hint: "剩哪一道",
    icon: Trash2,
    tone: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    toneActive: "bg-emerald-600 text-white ring-emerald-600",
  },
  {
    id: "safety",
    label: "食安",
    hint: "異物／不適",
    icon: AlertTriangle,
    tone: "bg-rose-50 text-rose-900 ring-rose-200",
    toneActive: "bg-rose-600 text-white ring-rose-600",
  },
];

function notifyLunch(row: {
  kind: LunchReportKind;
  class_id: string;
  class_name: string;
  dish?: string;
  comment?: string;
  leftover?: string;
  portion?: string;
  rating?: number;
  photo_urls?: string[];
}) {
  const summaryParts = [
    row.dish ? `菜色：${row.dish}` : null,
    row.rating != null ? `${row.rating} 星` : null,
    row.portion
      ? row.portion === "too_little"
        ? "份量不足"
        : row.portion === "too_much"
          ? "份量過多"
          : "份量剛好"
      : null,
    row.leftover && row.leftover !== "none" ? `剩食 ${row.leftover}` : null,
    row.comment,
  ].filter(Boolean);
  pushNotify({
    type: "lunch",
    classId: row.class_id || "j101",
    className: row.class_name,
    kind: row.kind,
    dish: row.dish || "",
    note: summaryParts.join(" · ").slice(0, 200) || "導師午餐回報",
    photoUrls: row.photo_urls || [],
  });
}

export function LunchBoard() {
  const { classId: pinnedId } = usePinnedClass();
  const pinned = CLASS_ROSTER.find((c) => c.class_id === pinnedId) ?? null;
  const classId = pinned?.class_id ?? "";
  const className = pinned?.class_name ?? "";

  const initial = useMemo(() => mergeLunchMenus([]), []);
  const [menus, setMenus] = useState<LunchMenuDoc[]>(initial);
  const [dayIndex, setDayIndex] = useState(() => findTodayMenuIndex(initial));
  const [weekOpen, setWeekOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const touchStartX = useRef(0);
  const viewingDateRef = useRef<string | null>(null);

  useEffect(() => {
    viewingDateRef.current = menus[dayIndex]?.date ?? null;
  }, [menus, dayIndex]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    setSyncing(true);
    try {
      return subscribeLunchMenus((live) => {
        const merged = mergeLunchMenus(live);
        setMenus(merged);
        const keep = viewingDateRef.current;
        const keepIdx = keep
          ? merged.findIndex((m) => m.date === keep)
          : -1;
        setDayIndex(keepIdx >= 0 ? keepIdx : findTodayMenuIndex(merged));
        setSyncing(false);
      });
    } catch {
      setSyncing(false);
      return;
    }
  }, []);

  const menu = menus[dayIndex] ?? null;
  const todayParts = todayRocParts();
  const isToday = menu
    ? (() => {
        const p = menu.date.match(/^(\d+)\/(\d+)\/(\d+)$/);
        if (!p) return false;
        return (
          Number(p[1]) === todayParts.y &&
          Number(p[2]) === todayParts.m &&
          Number(p[3]) === todayParts.d
        );
      })()
    : false;
  const viewingWeekday = menu ? weekdayFromRoc(menu.date) : weekdayLabel();
  const canPrev = dayIndex > 0;
  const canNext = dayIndex < menus.length - 1;

  function goPrev() {
    if (canPrev) {
      setDayIndex((i) => i - 1);
      setSelectedDish(null);
    }
  }
  function goNext() {
    if (canNext) {
      setDayIndex((i) => i + 1);
      setSelectedDish(null);
    }
  }

  function onPickDish(dish: string) {
    setSelectedDish(dish);
    setReaction("portion");
    setReportOpen(true);
  }

  function openReport(kind?: Reaction) {
    setReaction(kind ?? null);
    setReportOpen(true);
  }

  function closeReport() {
    setReportOpen(false);
    setReaction(null);
    setSelectedDish(null);
  }

  function onTouchStart(e: TouchEvent) {
    if (weekOpen || reportOpen) return;
    touchStartX.current = e.changedTouches[0]?.clientX ?? 0;
  }
  function onTouchEnd(e: TouchEvent) {
    if (weekOpen || reportOpen) return;
    const end = e.changedTouches[0]?.clientX ?? 0;
    const delta = end - touchStartX.current;
    if (Math.abs(delta) < 48) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  const activeKind = REPORT_KINDS.find((k) => k.id === reaction) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-28 sm:space-y-4">
      <PageHero src="/themes/atelier/lunch.jpg" label="午餐佈告" />
      {!pinned ? <RememberClassPanel compact /> : null}
      <header className="px-1 text-center">
        <p className="text-[10px] font-bold tracking-[0.18em] text-muted sm:text-[11px]">
          體衛組 · 午餐佈告欄
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-ink sm:text-3xl">
          {weekOpen ? "一周菜單" : isToday ? "今日菜單" : "菜單佈告"}
        </h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">
          {weekOpen
            ? "點選某一天即可查看當日菜色"
            : menu
              ? `星期${viewingWeekday} · ${menu.date}`
              : `星期${weekdayLabel()} · ${formatRocDisplay(todayParts)}`}
          {className ? ` · ${className}` : ""}
          {syncing ? " · 同步中…" : ""}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev || weekOpen}
          className="btn-block inline-flex min-h-11 items-center justify-center gap-0.5 disabled:opacity-40"
        >
          <ChevronLeft size={16} /> 昨天
        </button>
        <button
          type="button"
          onClick={() => {
            setWeekOpen((open) => {
              if (open) {
                // 再次點「一周」：關閉並回到今日
                setDayIndex(findTodayMenuIndex(menus));
                setSelectedDish(null);
                return false;
              }
              return true;
            });
          }}
          className={`btn-block inline-flex min-h-11 items-center justify-center gap-1 ${
            weekOpen ? "btn-primary" : ""
          }`}
        >
          <Calendar size={16} /> 一周
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext || weekOpen}
          className="btn-block inline-flex min-h-11 items-center justify-center gap-0.5 disabled:opacity-40"
        >
          明天 <ChevronRight size={16} />
        </button>
      </div>

      {weekOpen ? (
        <div className="panel space-y-2 p-3">
          {menus.map((item, idx) => (
            <button
              key={item.menu_id}
              type="button"
              onClick={() => {
                setDayIndex(idx);
                setWeekOpen(false);
                setSelectedDish(null);
              }}
              className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                menu?.date === item.date
                  ? "bg-[var(--accent-soft)] ring-mint"
                  : "bg-paper ring-line"
              }`}
            >
              <div>
                <div className="text-sm font-bold text-ink">
                  {item.date} · 星期{weekdayFromRoc(item.date)}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {item.dishes.slice(0, 4).join(" · ")}
                  {item.dishes.length > 4 ? " …" : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <article
          className="panel overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="border-b border-line/70 px-4 py-3 text-center">
            <p className="text-[11px] font-bold text-muted">
              {menu?.date ? `菜單日期 ${menu.date}` : "尚未張貼"}
            </p>
          </div>
          <div className="p-3 sm:p-4">
            {!menu || menu.dishes.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                今日尚無菜單，請稍後再看或請組長更新。
              </p>
            ) : (
              <>
                <p className="mb-2 text-center text-[10px] font-bold text-muted sm:text-[11px]">
                  點某一道可直接回報份量；或用下方四個按鈕回報
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
                  {menu.dishes.map((dish, idx) => {
                    const active = selectedDish === dish && reportOpen;
                    const isMain = idx === 0;
                    return (
                      <button
                        key={`${menu.date}-${dish}-${idx}`}
                        type="button"
                        onClick={() => onPickDish(dish)}
                        className={`flex min-h-[4.75rem] flex-col items-start justify-between rounded-xl border px-2.5 py-2.5 text-left transition active:scale-[0.98] ${
                          active
                            ? "border-mint bg-[var(--accent-soft)] ring-2 ring-mint/40"
                            : isMain
                              ? "border-line bg-paper"
                              : "border-line/80 bg-panel"
                        }`}
                      >
                        <span className="text-[10px] font-bold text-muted">
                          {String(idx + 1).padStart(2, "0")}
                          {isMain ? " · 主菜" : ""}
                        </span>
                        <span
                          className={`mt-1.5 w-full break-words font-bold leading-snug text-ink ${
                            isMain ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                          }`}
                        >
                          {dish}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <p className="border-t border-line/70 px-4 py-2 text-center text-[11px] text-muted">
            左：昨天 · 右：明天
            {menus.length > 0 ? ` · ${dayIndex + 1}/${menus.length}` : ""}
            {" · "}也可左右滑動
          </p>
        </article>
      )}

      {!weekOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-paper/95 px-3 py-2 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">回報本班</p>
                <p className="truncate text-[11px] text-muted">
                  {className
                    ? `${className} · 選一項開始`
                    : "選一項開始（可先釘選本班）"}
                </p>
              </div>
              <Utensils size={18} className="shrink-0 text-muted" />
            </div>
            <div className="grid grid-cols-4 gap-1 p-1.5">
              {REPORT_KINDS.map((kind) => {
                const Icon = kind.icon;
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => openReport(kind.id)}
                    className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 ring-1 transition active:scale-[0.97] ${kind.tone}`}
                  >
                    <Icon size={18} strokeWidth={2.4} />
                    <span className="text-xs font-bold leading-none">
                      {kind.label}
                    </span>
                    <span className="text-[9px] font-medium leading-tight opacity-70">
                      {kind.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="關閉回報"
            onClick={closeReport}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-paper shadow-2xl sm:mx-4 sm:rounded-3xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0">
                <p className="text-base font-bold text-ink">
                  {activeKind ? `回報｜${activeKind.label}` : "要回報什麼？"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {activeKind
                    ? activeKind.hint
                    : "請選一項；有指定菜色會一併帶入"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReport}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel text-ink ring-1 ring-line"
                aria-label="關閉"
              >
                <X size={18} />
              </button>
            </div>

            {selectedDish ? (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 ring-1 ring-line">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-muted">針對菜色</p>
                  <p className="truncate text-sm font-bold text-ink">
                    {selectedDish}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDish(null)}
                  className="shrink-0 rounded-lg bg-paper px-2 py-1 text-[11px] font-bold text-ink ring-1 ring-line"
                >
                  清除
                </button>
              </div>
            ) : null}

            {!reaction ? (
              <div className="grid grid-cols-2 gap-2 px-4 pb-5 pt-1">
                {REPORT_KINDS.map((kind) => {
                  const Icon = kind.icon;
                  return (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() => setReaction(kind.id)}
                      className={`flex min-h-[6.5rem] flex-col items-start justify-between rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.98] ${kind.tone}`}
                    >
                      <Icon size={22} strokeWidth={2.3} />
                      <div>
                        <div className="text-base font-bold">{kind.label}</div>
                        <div className="mt-0.5 text-xs font-medium opacity-75">
                          {kind.hint}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto border-t border-line/70 px-4 py-3">
                  {reaction === "feedback" && (
                    <FeedbackForm
                      key={`fb-${selectedDish || "all"}`}
                      className={className}
                      classId={classId}
                      dishHint={selectedDish}
                      menuDate={menu?.date}
                      onDone={closeReport}
                    />
                  )}
                  {reaction === "portion" && (
                    <PortionForm
                      key={`pt-${selectedDish || "all"}`}
                      className={className}
                      classId={classId}
                      dishHint={selectedDish}
                      menuDate={menu?.date}
                      onDone={closeReport}
                    />
                  )}
                  {reaction === "leftover" && (
                    <LeftoverForm
                      key={`lf-${selectedDish || "all"}-${menu?.date || ""}`}
                      className={className}
                      classId={classId}
                      dishHint={selectedDish}
                      dishes={menu?.dishes ?? []}
                      menuDate={menu?.date}
                      onDone={closeReport}
                    />
                  )}
                  {reaction === "safety" && (
                    <SafetyForm
                      key={`sf-${selectedDish || "all"}`}
                      className={className}
                      classId={classId}
                      dishHint={selectedDish}
                      menuDate={menu?.date}
                      onDone={closeReport}
                    />
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SuccessBlock({
  title,
  children,
  onAgain,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onAgain: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-8 text-center ring-1 ring-line">
      <CheckCircle2 className="mx-auto mb-3 text-mint" size={40} />
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <div className="mt-1 text-sm text-muted">{children}</div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onAgain} className="btn-block btn-primary px-5 py-2.5">
          再回報一筆
        </button>
        {onClose ? (
          <button type="button" onClick={onClose} className="btn-block px-5 py-2.5">
            完成並關閉
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-xs font-bold tracking-wide text-muted">
      {children}
    </label>
  );
}

function fieldClass(locked?: boolean) {
  return `w-full rounded-xl border border-line px-3 py-2.5 text-sm font-bold text-ink outline-none focus:border-mint ${
    locked ? "bg-panel text-ink" : "bg-paper"
  }`;
}

function ClassField({
  className,
  classId,
}: {
  className: string;
  classId: string;
}) {
  const locked = Boolean(className);
  return (
    <div>
      <FieldLabel>班級{locked ? "（已帶入本班）" : ""}</FieldLabel>
      <input
        name="class"
        required
        readOnly={locked}
        defaultValue={className}
        className={fieldClass(locked)}
        placeholder="例如：高一忠、國二3班"
      />
      {classId ? <input type="hidden" name="classId" value={classId} /> : null}
    </div>
  );
}

function FeedbackForm({
  className,
  classId,
  dishHint,
  menuDate,
  onDone,
}: {
  className: string;
  classId: string;
  dishHint?: string | null;
  menuDate?: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(4);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("class") || className).trim();
    const cid = String(formData.get("classId") || classId).trim();
    try {
      const row = await createLunchReport({
        kind: "feedback",
        classId: cid,
        className: name,
        dish: dishHint,
        rating,
        comment: String(formData.get("comment") || ""),
        menuDate,
      });
      rememberClassFromReport({ classId: cid, className: name });
      notifyLunch(row);
      setDone(true);
    } catch {
      alert("提交失敗，請稍後再試（若持續失敗請確認網路或請組長檢查權限）");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SuccessBlock title="評價已送出" onAgain={() => setDone(false)} onClose={onDone}>
        體衛組已收到通知。
      </SuccessBlock>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ClassField className={className} classId={classId} />
      <div>
        <FieldLabel>這餐整體（{rating} 星）</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-bold ring-1 ${
                rating >= n
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-paper text-muted ring-line"
              }`}
            >
              <Star size={14} fill={rating >= n ? "currentColor" : "none"} />
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>留言（選填）</FieldLabel>
        <textarea name="comment" rows={2} className={fieldClass()} placeholder="口味、溫度…" />
      </div>
      <button type="submit" disabled={loading} className="btn-block btn-primary w-full py-3 disabled:opacity-50">
        {loading ? <Loader2 className="mx-auto animate-spin" size={18} /> : "送出評價"}
      </button>
    </form>
  );
}

function PortionForm({
  className,
  classId,
  dishHint,
  menuDate,
  onDone,
}: {
  className: string;
  classId: string;
  dishHint?: string | null;
  menuDate?: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [portion, setPortion] = useState<"too_little" | "ok" | "too_much">(
    "too_little",
  );
  const [targets, setTargets] = useState<string[]>(() =>
    dishHint ? [dishHint] : ["飯", "主菜"],
  );

  const targetOptions = dishHint
    ? [dishHint, "飯", "主菜", "配菜", "湯"].filter(
        (v, i, arr) => arr.indexOf(v) === i,
      )
    : ["飯", "主菜", "配菜", "湯"];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (targets.length === 0) {
      alert("請至少勾選一項");
      return;
    }
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("class") || className).trim();
    const cid = String(formData.get("classId") || classId).trim();
    const comment = String(formData.get("comment") || "");
    try {
      const row = await createLunchReport({
        kind: "portion",
        classId: cid,
        className: name,
        dish: dishHint,
        dishes: targets,
        portion,
        comment,
        menuDate,
      });
      rememberClassFromReport({ classId: cid, className: name });
      notifyLunch(row);
      setDone(true);
    } catch {
      alert("提交失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SuccessBlock title="份量回報已送出" onAgain={() => setDone(false)} onClose={onDone}>
        {portion === "too_little"
          ? "已通知體衛組：本班飯菜量不足。"
          : "謝謝回報，體衛組會參考調整。"}
      </SuccessBlock>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ClassField className={className} classId={classId} />
      <div>
        <FieldLabel>飯菜量如何？</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "too_little" as const, label: "不足" },
              { id: "ok" as const, label: "剛好" },
              { id: "too_much" as const, label: "過多" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPortion(opt.id)}
              className={`rounded-xl px-2 py-3 text-center text-sm font-bold ring-1 ${
                portion === opt.id
                  ? "bg-orange-50 text-orange-900 ring-orange-300"
                  : "bg-paper text-muted ring-line"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>哪些不足／過多？（可複選）</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {targetOptions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                setTargets((prev) =>
                  prev.includes(name)
                    ? prev.filter((x) => x !== name)
                    : [...prev, name],
                )
              }
              className={`rounded-xl px-3 py-2 text-sm font-bold ring-1 ${
                targets.includes(name)
                  ? "bg-ink text-paper ring-ink"
                  : "bg-paper text-muted ring-line"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>補充說明（選填）</FieldLabel>
        <textarea name="comment" rows={2} className={fieldClass()} />
      </div>
      <button type="submit" disabled={loading} className="btn-block btn-primary w-full py-3 disabled:opacity-50">
        {loading ? <Loader2 className="mx-auto animate-spin" size={18} /> : "送出份量回報"}
      </button>
    </form>
  );
}

function LeftoverForm({
  className,
  classId,
  dishHint,
  dishes,
  menuDate,
  onDone,
}: {
  className: string;
  classId: string;
  dishHint?: string | null;
  dishes: string[];
  menuDate?: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const dishOptions = useMemo(() => {
    const fromMenu = dishes.map((d) => d.trim()).filter(Boolean);
    const extras = ["飯", "主菜", "配菜", "湯", "整餐"];
    return [...fromMenu, ...extras].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [dishes]);
  const [targets, setTargets] = useState<string[]>(() =>
    dishHint ? [dishHint] : [],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const leftover = String(
      (e.currentTarget.elements.namedItem("leftover") as HTMLSelectElement)
        ?.value || "none",
    );
    if (leftover !== "none" && targets.length === 0) {
      alert("請勾選剩下的是哪一道（或整餐）");
      return;
    }
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("class") || className).trim();
    const cid = String(formData.get("classId") || classId).trim();
    try {
      const row = await createLunchReport({
        kind: "leftover",
        classId: cid,
        className: name,
        dish: dishHint || (targets.length === 1 ? targets[0] : null),
        dishes: leftover === "none" ? [] : targets,
        leftover,
        reason: String(formData.get("reason") || ""),
        cleaning: formData.get("cleaning") === "on",
        menuDate,
      });
      rememberClassFromReport({ classId: cid, className: name });
      notifyLunch(row);
      setDone(true);
    } catch {
      alert("儲存失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SuccessBlock title="剩食回報已送出" onAgain={() => setDone(false)} onClose={onDone}>
        {targets.length > 0 ? `已記錄：${targets.join("、")}` : "本班今日狀況已記錄。"}
      </SuccessBlock>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ClassField className={className} classId={classId} />
      <div>
        <FieldLabel>剩食程度</FieldLabel>
        <select name="leftover" className={fieldClass()} defaultValue="none">
          <option value="none">全數完食</option>
          <option value="1/4">剩下約 1/4</option>
          <option value="1/2">剩下約一半</option>
          <option value="more">剩下超過一半</option>
        </select>
      </div>
      <div>
        <FieldLabel>剩下的是哪一道？（可複選）</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {dishOptions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() =>
                setTargets((prev) =>
                  prev.includes(name)
                    ? prev.filter((x) => x !== name)
                    : [...prev, name],
                )
              }
              className={`rounded-xl px-3 py-2 text-sm font-bold ring-1 ${
                targets.includes(name)
                  ? "bg-ink text-paper ring-ink"
                  : "bg-paper text-muted ring-line"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>原因（選填）</FieldLabel>
        <input name="reason" className={fieldClass()} placeholder="太辣、公假多…" />
      </div>
      <label className="flex items-center gap-3 rounded-xl bg-panel px-3 py-3 text-sm font-bold text-ink ring-1 ring-line">
        <input type="checkbox" name="cleaning" className="h-4 w-4" />
        已完成用餐區／回收區清潔
      </label>
      <button type="submit" disabled={loading} className="btn-block btn-primary w-full py-3 disabled:opacity-50">
        {loading ? <Loader2 className="mx-auto animate-spin" size={18} /> : "送出剩食回報"}
      </button>
    </form>
  );
}

function SafetyForm({
  className,
  classId,
  dishHint,
  menuDate,
  onDone,
}: {
  className: string;
  classId: string;
  dishHint?: string | null;
  menuDate?: string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; file: File; preview: string }[]>(
    [],
  );
  const albumRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 4 - photos.length);
    for (const raw of list) {
      const file = await ensureInspectionPhotoSize(raw);
      setPhotos((prev) => [
        ...prev,
        { id: `${Date.now()}_${Math.random()}`, file, preview: URL.createObjectURL(file) },
      ]);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("class") || className).trim();
    const cid = String(formData.get("classId") || classId).trim();
    const issueType = String(formData.get("type") || "其他");
    const description = String(formData.get("description") || "");
    try {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const url = await uploadFixPhoto(photo.file, cid || "lunch");
        photoUrls.push(url);
      }
      const row = await createLunchReport({
        kind: "safety",
        classId: cid,
        className: name,
        dish: dishHint,
        comment: `${issueType}：${description}`.slice(0, 400),
        photoUrls,
        menuDate,
      });
      rememberClassFromReport({ classId: cid, className: name });
      notifyLunch(row);
      setDone(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "提交失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SuccessBlock title="食安通報已送出" onAgain={() => setDone(false)} onClose={onDone}>
        已通知體衛組，請必要時同步校護／學務。
      </SuccessBlock>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ClassField className={className} classId={classId} />
      <div>
        <FieldLabel>異常類型</FieldLabel>
        <select name="type" className={fieldClass()} defaultValue="異物">
          <option value="異物">異物</option>
          <option value="異味">異味／變質</option>
          <option value="身體不適">身體不適</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div>
        <FieldLabel>說明</FieldLabel>
        <textarea name="description" required rows={3} className={fieldClass()} placeholder="請簡述狀況…" />
      </div>
      <div>
        <FieldLabel>佐證照片（選填，最多 4 張）</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="btn-block px-3 py-2 text-sm"
          >
            連拍
          </button>
          <button
            type="button"
            onClick={() => albumRef.current?.click()}
            className="btn-block px-3 py-2 text-sm"
          >
            相簿
          </button>
          <input
            ref={albumRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {photos.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-line"
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  setPhotos((prev) => prev.filter((x) => x.id !== p.id));
                }}
                title="點擊移除"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="submit" disabled={loading} className="btn-block btn-primary w-full py-3 disabled:opacity-50">
        {loading ? <Loader2 className="mx-auto animate-spin" size={18} /> : "送出食安通報"}
      </button>
      <BurstCamera
        open={cameraOpen}
        title="食安佐證"
        remaining={4 - photos.length}
        onClose={() => setCameraOpen(false)}
        onCapture={async (file) => {
          await addFiles([file]);
        }}
        onFallback={() => {
          setCameraOpen(false);
          albumRef.current?.click();
        }}
      />
    </form>
  );
}
