import demoMenusJson from "@/data/menus_115_08_fake.json";
import type { LunchMealType, LunchMenuDoc } from "@/lib/types";

type DemoMenu = {
  date: string;
  type?: string;
  dishes: string[];
  nutrition?: LunchMenuDoc["nutrition"];
};

const DEMO_MENUS: LunchMenuDoc[] = (demoMenusJson as DemoMenu[]).map((m, i) => ({
  menu_id: `demo_${i}_${m.date}`,
  date: m.date,
  type: (m.type === "Dinner" ? "Dinner" : "Lunch") as LunchMealType,
  dishes: m.dishes,
  nutrition: m.nutrition,
}));

export function todayRocParts() {
  const now = new Date();
  return {
    y: now.getFullYear() - 1911,
    m: now.getMonth() + 1,
    d: now.getDate(),
  };
}

export function parseRocDate(
  raw: string,
): { y: number; m: number; d: number } | null {
  const m = raw
    .trim()
    .match(/^(\d{2,3})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function formatRocDisplay(p: { y: number; m: number; d: number }) {
  return `${p.y}/${p.m}/${p.d}`;
}

export function todayRocString() {
  return formatRocDisplay(todayRocParts());
}

export function weekdayFromRoc(raw: string): string {
  const p = parseRocDate(raw);
  if (!p) return "";
  const g = new Date(p.y + 1911, p.m - 1, p.d);
  return ["日", "一", "二", "三", "四", "五", "六"][g.getDay()];
}

export function weekdayLabel() {
  return ["日", "一", "二", "三", "四", "五", "六"][new Date().getDay()];
}

export function rocSortKey(raw: string): number {
  const p = parseRocDate(raw);
  if (!p) return 0;
  return p.y * 10000 + p.m * 100 + p.d;
}

export function isSameRocDay(
  a: { y: number; m: number; d: number },
  b: { y: number; m: number; d: number },
) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

export function mergeLunchMenus(live: LunchMenuDoc[]): LunchMenuDoc[] {
  const byDate = new Map<string, LunchMenuDoc>();
  for (const m of DEMO_MENUS) {
    if (m.type === "Dinner") continue;
    byDate.set(m.date, m);
  }
  for (const m of live) {
    if (m.type === "Dinner") continue;
    byDate.set(m.date, m);
  }
  return Array.from(byDate.values()).sort(
    (a, b) => rocSortKey(a.date) - rocSortKey(b.date),
  );
}

export function findTodayMenuIndex(menus: LunchMenuDoc[]): number {
  const today = todayRocParts();
  const idx = menus.findIndex((m) => {
    const p = parseRocDate(m.date);
    return p ? isSameRocDay(p, today) : false;
  });
  if (idx >= 0) return idx;
  if (menus.length === 0) return 0;
  const todayKey = today.y * 10000 + today.m * 100 + today.d;
  let best = 0;
  for (let i = 0; i < menus.length; i++) {
    if (rocSortKey(menus[i].date) <= todayKey) best = i;
  }
  return best;
}

export function parseDishesText(raw: string): string[] {
  return raw
    .split(/[\n,，、;；]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export const LUNCH_KIND_LABEL: Record<string, string> = {
  feedback: "口味",
  portion: "份量",
  leftover: "剩食",
  safety: "食安",
};
