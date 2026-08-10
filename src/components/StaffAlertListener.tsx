"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeAuth } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  fetchUserProfile,
  subscribeSupplyRequests,
} from "@/lib/firebase/firestore";
import { emitSupplyPendingCount, onSupplyUpdate } from "@/lib/live/supply-events";
import {
  notifyStaffSupply,
  readStaffNotifyEnabled,
} from "@/lib/notify/staff-alert";
import type { SupplyRequestDoc } from "@/lib/types";

export function StaffAlertListener() {
  const [watch, setWatch] = useState(false);
  const seenRef = useRef(new Set<string>());
  const readyRef = useRef(false);

  useEffect(() => {
    if (readStaffNotifyEnabled()) setWatch(true);
    return subscribeAuth((user) => {
      if (!user) return;
      void fetchUserProfile(user.uid)
        .then((profile) => {
          if (profile?.role === "admin" || readStaffNotifyEnabled()) {
            setWatch(true);
          }
        })
        .catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    if (!watch) return;

    function applyRows(rows: SupplyRequestDoc[]) {
      const pending = rows.filter((row) => row.status === "pending");
      emitSupplyPendingCount(pending.length);
      if (!readyRef.current) {
        for (const row of rows) seenRef.current.add(row.request_id);
        readyRef.current = true;
        return;
      }
      for (const row of pending) {
        if (seenRef.current.has(row.request_id)) continue;
        seenRef.current.add(row.request_id);
        notifyStaffSupply(row);
      }
    }

    let unsub: (() => void) | undefined;
    if (isFirebaseConfigured()) {
      try {
        unsub = subscribeSupplyRequests(applyRows);
      } catch {
        // ignore
      }
    }
    const stop = onSupplyUpdate((row) => {
      if (row.status !== "pending" || seenRef.current.has(row.request_id)) return;
      seenRef.current.add(row.request_id);
      notifyStaffSupply(row);
    });
    return () => {
      unsub?.();
      stop();
    };
  }, [watch]);

  return null;
}
