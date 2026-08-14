"use client";

import { useEffect, useState } from "react";
import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";
import { sameClass } from "@/lib/class-pin/storage";
import { resolveClassId } from "@/lib/classes/resolve-id";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchInspectionsByClass } from "@/lib/firebase/firestore";
import { onInspectionUpdate } from "@/lib/live/inspection-events";
import { getLocalInspectionsByClass } from "@/lib/local/store";
import { useLiveFeedSubscription } from "@/lib/mqtt/useLiveFeed";
import type { InspectionDoc } from "@/lib/types";

function hasPendingFix(list: InspectionDoc[], classId: string) {
  return list.some(
    (i) => sameClass(i.class_id, classId) && i.status === "pending_fix",
  );
}

/**
 * 導師已記住本班、且該班有待改善缺失時：
 * 在螢幕最外圍顯示紅色呼吸燈（全站可見）。
 */
export function ScreenDeficiencyGlow() {
  const { classId: pinnedClassId } = usePinnedClass();
  const [active, setActive] = useState(false);

  useLiveFeedSubscription((payload) => {
    if (!pinnedClassId || !sameClass(payload.class_id, pinnedClassId)) return;
    if (payload.status === "pending_fix") {
      setActive(true);
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const classId = pinnedClassId
        ? (resolveClassId(pinnedClassId) ?? pinnedClassId)
        : null;
      if (!classId) {
        if (!cancelled) setActive(false);
        return;
      }

      const local = getLocalInspectionsByClass(classId);
      let remote: InspectionDoc[] = [];
      if (isFirebaseConfigured()) {
        try {
          remote = await fetchInspectionsByClass(classId, 8);
        } catch {
          // ignore
        }
      }

      const map = new Map<string, InspectionDoc>();
      for (const row of [...local, ...remote]) {
        map.set(row.inspection_id, row);
      }
      if (!cancelled) setActive(hasPendingFix([...map.values()], classId));
    }

    void refresh();

    const unsubInsp = onInspectionUpdate((insp) => {
      if (!pinnedClassId || !sameClass(insp.class_id, pinnedClassId)) return;
      if (insp.status === "pending_fix") {
        setActive(true);
        return;
      }
      void refresh();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      unsubInsp();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [pinnedClassId]);

  if (!active) return null;

  return (
    <div
      className="screen-alert-glow"
      role="status"
      aria-live="polite"
      aria-label="本班有待改善缺失"
    />
  );
}
