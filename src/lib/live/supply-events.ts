import type { SupplyRequestDoc } from "@/lib/types";

const EVENT = "chsh-supply-update";
export const SUPPLY_COUNT_EVENT = "chsh-supply-pending-count";

export function emitSupplyUpdate(row: SupplyRequestDoc) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: row }));
  try {
    localStorage.setItem(EVENT, JSON.stringify({ ...row, _ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function onSupplyUpdate(handler: (row: SupplyRequestDoc) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<SupplyRequestDoc>).detail;
    if (detail?.request_id) handler(detail);
  };
  const storageListener = (event: StorageEvent) => {
    if (event.key !== EVENT || !event.newValue) return;
    try {
      const detail = JSON.parse(event.newValue) as SupplyRequestDoc;
      if (detail?.request_id) handler(detail);
    } catch {
      // ignore
    }
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}

export function emitSupplyPendingCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUPPLY_COUNT_EVENT, { detail: count }));
}

export function onSupplyPendingCount(handler: (count: number) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    handler(Number((event as CustomEvent<number>).detail) || 0);
  };
  window.addEventListener(SUPPLY_COUNT_EVENT, listener);
  return () => window.removeEventListener(SUPPLY_COUNT_EVENT, listener);
}
