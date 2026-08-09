"use client";

import { useEffect, useState } from "react";
import {
  OFFLINE_EVENT,
  countJobs,
  flushOfflineQueue,
} from "@/lib/offline/queue";

export function OfflineSync() {
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const n = await countJobs();
        if (!cancelled) setCount(n);
      } catch {
        if (!cancelled) setCount(0);
      }
    }

    async function sync() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await refresh();
        return;
      }
      try {
        const result = await flushOfflineQueue();
        if (!cancelled && result.ok > 0) {
          setHint(`已自動送出 ${result.ok} 筆離線暫存`);
          window.setTimeout(() => {
            if (!cancelled) setHint(null);
          }, 4000);
        }
      } catch {
        // keep queued
      }
      await refresh();
    }

    const onChange = () => void refresh();
    const onOnline = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };

    void sync();
    window.addEventListener(OFFLINE_EVENT, onChange);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener(OFFLINE_EVENT, onChange);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (count <= 0 && !hint) return null;

  return (
    <div className="site-shell pt-2">
      <p
        className={`rounded-lg px-3 py-2 text-xs sm:text-sm ${
          count > 0 ? "bg-coral/10 text-coral" : "bg-leaf/15 text-mint"
        }`}
      >
        {count > 0
          ? `離線暫存 ${count} 筆，連上網後會自動送出。`
          : hint}
      </p>
    </div>
  );
}
