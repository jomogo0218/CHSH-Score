import { resolveClassId } from "@/lib/classes/ids";
import { displayClassName } from "@/lib/classes/resolve-id";
import { SITE_ORIGIN } from "@/lib/constants";
import {
  fetchInspectionsSince,
  fetchSupplyRequests,
} from "@/lib/firebase/firestore";
import { deficiencyCountOf } from "@/lib/scoring/deficiency";
import {
  formatFixDeadlineLabel,
  isFixOverdue,
  taiwanAddDays,
  taiwanDateString,
} from "@/lib/time/taiwan";

export async function buildTelegramDigest(now = new Date()) {
  const today = taiwanDateString(now);
  const since = taiwanAddDays(today, -45);
  const [inspections, supplies] = await Promise.all([
    fetchInspectionsSince(since, 300),
    fetchSupplyRequests(80),
  ]);

  const pendingMap = new Map<string, (typeof inspections)[number]>();
  for (const row of inspections.filter((i) => i.status === "pending_fix")) {
    const id = resolveClassId(row.class_id) ?? row.class_id;
    const prev = pendingMap.get(id);
    if (
      !prev ||
      row.date > prev.date ||
      (row.date === prev.date && row.created_at > prev.created_at)
    ) {
      pendingMap.set(id, row);
    }
  }
  const pending = [...pendingMap.values()];
  const overdue = pending.filter((i) => isFixOverdue(i.date, i.status, now.getTime()));
  const waitingSupply = supplies.filter((s) => s.status === "pending");

  const lines = [`【嘉華早報】${today.replaceAll("-", "/")}`];

  if (pending.length === 0) {
    lines.push("待改善：無");
  } else {
    lines.push(`待改善 ${pending.length} 班${overdue.length ? `（逾時 ${overdue.length}）` : ""}`);
    for (const row of pending.slice(0, 20)) {
      const count = deficiencyCountOf(row);
      const tag = isFixOverdue(row.date, row.status, now.getTime())
        ? "已逾時"
        : `期限 ${formatFixDeadlineLabel(row.date)}`;
      lines.push(
        `• ${displayClassName(row.class_id)} 缺失 ${count}（${tag}）`,
      );
    }
    if (pending.length > 20) lines.push(`…還有 ${pending.length - 20} 班`);
  }

  if (waitingSupply.length === 0) {
    lines.push("領用待處理：無");
  } else {
    lines.push(`領用待處理 ${waitingSupply.length} 筆`);
    for (const row of waitingSupply.slice(0, 15)) {
      lines.push(
        `• ${displayClassName(row.class_id)} ${row.item_label} ×${row.quantity}`,
      );
    }
  }

  lines.push(SITE_ORIGIN);
  if (waitingSupply.length) lines.push(`${SITE_ORIGIN}/supply`);

  return {
    text: lines.join("\n"),
    pendingCount: pending.length,
    overdueCount: overdue.length,
    supplyCount: waitingSupply.length,
  };
}
