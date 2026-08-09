import type { InspectionDoc } from "@/lib/types";

const EVENT = "chsh-inspection-update";

/** 同裝置立刻更新大廳／看板（不依賴 MQTT）；跨分頁走 localStorage */
export function emitInspectionUpdate(insp: InspectionDoc) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: insp }));
  try {
    localStorage.setItem(
      EVENT,
      JSON.stringify({ ...insp, _ts: Date.now() }),
    );
  } catch {
    // quota / private mode
  }
}

export function onInspectionUpdate(
  handler: (insp: InspectionDoc) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<InspectionDoc>).detail;
    if (detail?.inspection_id) handler(detail);
  };
  const storageListener = (event: StorageEvent) => {
    if (event.key !== EVENT || !event.newValue) return;
    try {
      const detail = JSON.parse(event.newValue) as InspectionDoc;
      if (detail?.inspection_id) handler(detail);
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
