"use client";

import { useEffect, useState } from "react";
import { ClassDirectory } from "@/components/ClassDirectory";
import { HallFeed, TopBoard } from "@/components/HallFeed";
import { SetupStatusBanner } from "@/components/SetupStatusBanner";
import { FETCH_TTL_MS, setCached, withTtlCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchLatestInspections } from "@/lib/firebase/firestore";
import { getLocalInspections } from "@/lib/local/store";
import { useLiveFeedSubscription } from "@/lib/mqtt/useLiveFeed";
import {
  allClasses,
  getDemoClass,
  getLatestFeed,
  getTodayTopClasses,
} from "@/lib/seed/demo-data";
import type { InspectionDoc, LiveFeedPayload } from "@/lib/types";

function mergeFeed(
  remote: InspectionDoc[],
  local: InspectionDoc[],
  demo: InspectionDoc[],
): InspectionDoc[] {
  const map = new Map<string, InspectionDoc>();
  for (const item of [...demo, ...local, ...remote]) {
    map.set(item.inspection_id, item);
  }
  return [...map.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

function liveToInspection(payload: LiveFeedPayload): InspectionDoc {
  const date = payload.created_at.slice(0, 10);
  return {
    inspection_id: `${date}_${payload.class_id}`,
    date,
    class_id: payload.class_id,
    inspector_id: "mqtt",
    total_score: payload.score,
    summary_blog: payload.note,
    status: payload.status ?? "pending_fix",
    cover_photo_url: payload.photo_url || undefined,
    created_at: payload.created_at,
  };
}

export function HallClient() {
  const [feed, setFeed] = useState<InspectionDoc[]>(getLatestFeed());
  const [source, setSource] = useState("demo");
  const [liveHint, setLiveHint] = useState<string | null>(null);

  useLiveFeedSubscription((payload) => {
    const doc = liveToInspection(payload);
    setFeed((prev) => {
      const next = mergeFeed([doc], [], prev);
      setCached("hall:latest", next.slice(0, 30), FETCH_TTL_MS);
      return next;
    });
    const name =
      getDemoClass(payload.class_id)?.class_name ?? payload.class_id;
    setLiveHint(`即時更新：${name} ${payload.score} 分`);
    setSource("mqtt");
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = getLocalInspections();
      let remote: InspectionDoc[] = [];
      let fromCache = false;
      if (isFirebaseConfigured()) {
        try {
          const result = await withTtlCache(
            "hall:latest",
            () => fetchLatestInspections(30),
            FETCH_TTL_MS,
          );
          remote = result.data;
          fromCache = result.fromCache;
        } catch {
          // keep demo/local
        }
      }
      if (cancelled) return;
      const merged = mergeFeed(remote, local, getLatestFeed());
      setFeed(merged);
      if (remote.length) {
        setSource(fromCache ? "firestore(cache)" : "firestore");
      } else if (local.length) setSource("local");
      else setSource("demo");
    }

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const top = [...feed]
    .filter((i) => i.date === today)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);
  const topBoard = top.length ? top : getTodayTopClasses(3);

  return (
    <div className="space-y-6">
      <SetupStatusBanner />
      <section className="animate-rise space-y-2">
        <p className="text-sm tracking-widest text-muted">CAMPUS PATROL HALL</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-ink sm:text-5xl">
          校園環境無名小站
        </h1>
        <p className="max-w-2xl text-muted">
          組長巡察拍照給導師與同學看；班級改善後可回報銷案。評分用來標示待改善與優良。
        </p>
        <p className="text-xs text-muted">
          資料來源：{source}（{FETCH_TTL_MS / 1000} 秒內重整沿用快取
          {liveHint ? `；${liveHint}` : ""}）
        </p>
      </section>

      <TopBoard inspections={topBoard} />
      <HallFeed items={feed.slice(0, 12)} />
      <ClassDirectory classes={allClasses} />
    </div>
  );
}
