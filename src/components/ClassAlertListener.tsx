"use client";

import { useEffect } from "react";
import {
  onPinChange,
  readNotifyEnabled,
  readPinnedClassId,
} from "@/lib/class-pin/storage";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchInspectionsByClass } from "@/lib/firebase/firestore";
import { onInspectionUpdate } from "@/lib/live/inspection-events";
import { useLiveFeedSubscription } from "@/lib/mqtt/useLiveFeed";
import {
  notifyFromInspection,
  notifyFromLive,
} from "@/lib/notify/class-alert";

export function ClassAlertListener() {
  useLiveFeedSubscription((payload) => {
    notifyFromLive(payload);
  });

  useEffect(() => {
    return onInspectionUpdate((insp) => {
      notifyFromInspection(insp);
    });
  }, []);

  useEffect(() => {
    async function checkPinned() {
      if (!readNotifyEnabled()) return;
      const classId = readPinnedClassId();
      if (!classId || !isFirebaseConfigured()) return;
      try {
        const list = await fetchInspectionsByClass(classId, 8);
        const pending = list.find((i) => i.status === "pending_fix");
        if (pending) notifyFromInspection(pending);
      } catch {
        // ignore
      }
    }

    void checkPinned();
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkPinned();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkPinned);
    const unsub = onPinChange(() => void checkPinned());
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkPinned);
      unsub();
    };
  }, []);

  return null;
}
