import { readNotifyEnabled, readPinnedClassId, sameClass } from "@/lib/class-pin/storage";
import { displayClassName } from "@/lib/classes/resolve-id";
import { classPageUrl } from "@/lib/share/line-text";
import { deficiencyCountOf } from "@/lib/scoring/deficiency";
import type { InspectionDoc, LiveFeedPayload } from "@/lib/types";

const LAST_KEY = "chsh-last-notified-insp";

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function fingerprint(inspectionId: string, status: string, count: number) {
  return `${inspectionId}:${status}:${count}`;
}

function shouldAlert(classId: string, status?: string, count = 0) {
  if (!readNotifyEnabled()) return false;
  const pinned = readPinnedClassId();
  if (!sameClass(classId, pinned)) return false;
  if (status === "fixed" || status === "pass") return false;
  return status === "pending_fix" || count > 0;
}

export function notifyClassDeficiency(input: {
  classId: string;
  inspectionId: string;
  status?: string;
  deficiencyCount?: number;
  className?: string;
}) {
  if (typeof window === "undefined") return;
  const count = input.deficiencyCount ?? 0;
  if (!shouldAlert(input.classId, input.status, count)) return;

  const fp = fingerprint(input.inspectionId, input.status ?? "", count);
  try {
    if (localStorage.getItem(LAST_KEY) === fp) return;
    localStorage.setItem(LAST_KEY, fp);
  } catch {
    // ignore
  }

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  const name = input.className ?? displayClassName(input.classId);
  const title = `${name} 有缺失`;
  const body =
    count > 0
      ? `缺失 ${count} 次，請點進去回報改善`
      : "待改善，請點進去回報";
  const url = classPageUrl(input.classId);

  const sw = navigator.serviceWorker?.controller;
  if (sw) {
    sw.postMessage({ type: "notify", title, body, url });
    return;
  }
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    // ignore
  }
}

export function notifyFromInspection(insp: InspectionDoc) {
  notifyClassDeficiency({
    classId: insp.class_id,
    inspectionId: insp.inspection_id,
    status: insp.status,
    deficiencyCount: deficiencyCountOf(insp),
  });
}

export function notifyFromLive(payload: LiveFeedPayload) {
  notifyClassDeficiency({
    classId: payload.class_id,
    inspectionId:
      payload.inspection_id ?? `${payload.created_at.slice(0, 10)}_${payload.class_id}`,
    status: payload.status,
    deficiencyCount: payload.deficiency_count ?? 0,
  });
}
