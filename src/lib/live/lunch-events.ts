const LUNCH_COUNT_EVENT = "chsh-lunch-pending-count";

export function emitLunchPendingCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LUNCH_COUNT_EVENT, { detail: count }));
}

export function onLunchPendingCount(
  handler: (count: number) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    handler(Number((event as CustomEvent<number>).detail) || 0);
  };
  window.addEventListener(LUNCH_COUNT_EVENT, listener);
  return () => window.removeEventListener(LUNCH_COUNT_EVENT, listener);
}
