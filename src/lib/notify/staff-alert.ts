import { displayClassName } from "@/lib/classes/resolve-id";
import { ensureNotifyPermission } from "@/lib/notify/class-alert";
import type { SupplyRequestDoc } from "@/lib/types";

export const STAFF_NOTIFY_KEY = "chsh-staff-notify";
const LAST_KEY = "chsh-last-notified-supply";

export function readStaffNotifyEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STAFF_NOTIFY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStaffNotifyEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) localStorage.setItem(STAFF_NOTIFY_KEY, "1");
    else localStorage.removeItem(STAFF_NOTIFY_KEY);
  } catch {
    // ignore
  }
}

export async function enableStaffNotify(): Promise<boolean> {
  const ok = await ensureNotifyPermission();
  setStaffNotifyEnabled(ok);
  return ok;
}

export function notifyStaffSupply(row: SupplyRequestDoc) {
  if (typeof window === "undefined") return;
  if (!readStaffNotifyEnabled()) return;
  if (row.status !== "pending") return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    if (localStorage.getItem(LAST_KEY) === row.request_id) return;
    localStorage.setItem(LAST_KEY, row.request_id);
  } catch {
    // ignore
  }

  const title = "學務處領用申請";
  const body = `${displayClassName(row.class_id)}申請${row.item_label} ×${row.quantity}`;
  const url = "/supply";
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

export function notifyTeacherSupplyReady(row: SupplyRequestDoc) {
  if (typeof window === "undefined") return;
  if (row.status !== "ready") return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return;
  }
  const title = "學務處用品可領取";
  const body = `${row.item_label} ×${row.quantity} 已可至學務處領取`;
  const url = "/supply";
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
