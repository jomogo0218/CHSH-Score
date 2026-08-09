import { classIdAliases, resolveClassId } from "@/lib/classes/ids";

export const PINNED_CLASS_KEY = "chsh-my-class";
export const PINNED_NOTIFY_KEY = "chsh-my-class-notify";
const PIN_EVENT = "chsh-my-class-change";

export type PinState = {
  classId: string | null;
  notify: boolean;
};

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // private mode
  }
}

export function readPinnedClassId(): string | null {
  const raw = readRaw(PINNED_CLASS_KEY);
  if (!raw) return null;
  return resolveClassId(raw) ?? raw;
}

export function readNotifyEnabled(): boolean {
  return readRaw(PINNED_NOTIFY_KEY) === "1";
}

export function readPinState(): PinState {
  return { classId: readPinnedClassId(), notify: readNotifyEnabled() };
}

function emitPinChange() {
  if (typeof window === "undefined") return;
  const state = readPinState();
  window.dispatchEvent(new CustomEvent(PIN_EVENT, { detail: state }));
}

export function setPinnedClassId(classId: string | null) {
  const resolved = classId ? (resolveClassId(classId) ?? classId) : null;
  writeRaw(PINNED_CLASS_KEY, resolved);
  if (!resolved) writeRaw(PINNED_NOTIFY_KEY, null);
  emitPinChange();
}

export function setNotifyEnabled(enabled: boolean) {
  writeRaw(PINNED_NOTIFY_KEY, enabled ? "1" : null);
  emitPinChange();
}

export function sameClass(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const ra = resolveClassId(a) ?? a;
  const rb = resolveClassId(b) ?? b;
  if (ra === rb) return true;
  return classIdAliases(a).some((id) => classIdAliases(b).includes(id));
}

export function isPinnedClass(classId: string | null | undefined) {
  return sameClass(classId, readPinnedClassId());
}

export function onPinChange(handler: (state: PinState) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<PinState>).detail;
    handler(detail ?? readPinState());
  };
  const storageListener = (event: StorageEvent) => {
    if (event.key !== PINNED_CLASS_KEY && event.key !== PINNED_NOTIFY_KEY) {
      return;
    }
    handler(readPinState());
  };
  window.addEventListener(PIN_EVENT, listener);
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener(PIN_EVENT, listener);
    window.removeEventListener("storage", storageListener);
  };
}
