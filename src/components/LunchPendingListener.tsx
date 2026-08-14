"use client";

import { useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { subscribeLunchReports } from "@/lib/firebase/firestore";
import { emitLunchPendingCount } from "@/lib/live/lunch-events";

/** 背景同步午餐 pending 數，供導覽角標使用 */
export function LunchPendingListener() {
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return subscribeLunchReports((rows) => {
      emitLunchPendingCount(rows.filter((r) => r.status === "pending").length);
    });
  }, []);
  return null;
}
