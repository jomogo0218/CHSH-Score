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
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import {
  allClasses,
  getDemoClass,
  getLatestFeed,
  getTodayTopClasses,
} from "@/lib/seed/demo-data";
import { taiwanDateString } from "@/lib/time/taiwan";
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
  const firebaseOn = isFirebaseConfigured();
  const [feed, setFeed] = useState<InspectionDoc[]>(() =>
    firebaseOn ? [] : getLatestFeed(),
  );
  const [source, setSource] = useState(firebaseOn ? "loading" : "demo");
  const [liveHint, setLiveHint] = useState<string | null>(null);

  useLiveFeedSubscription((payload) => {
    const doc = liveToInspection(payload);
    setFeed((prev) => {
      // 正式模式：即時更新只併入現有真實 feed，不夾帶 demo
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
      const configured = isFirebaseConfigured();
      if (configured) {
        try {
          const result = await withTtlCache(
            "hall:latest",
            () => fetchLatestInspections(30),
            FETCH_TTL_MS,
          );
          remote = result.data;
          fromCache = result.fromCache;
        } catch {
          // keep local only
        }
      }
      if (cancelled) return;
      // Firebase 已設定時不混 demo，避免正式大廳出現假班級
      const demo = configured ? [] : getLatestFeed();
      const merged = mergeFeed(remote, local, demo);
      setFeed(merged);
      if (remote.length) {
        setSource(fromCache ? "firestore(cache)" : "firestore");
      } else if (local.length) setSource("local");
      else setSource(configured ? "empty" : "demo");
    }

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const today = taiwanDateString();
  const top = [...feed]
    .filter((i) => i.date === today)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);
  const topBoard =
    top.length > 0
      ? top
      : firebaseOn
        ? []
        : getTodayTopClasses(3);

  return (
    <div className="space-y-3 sm:space-y-4">
      <SetupStatusBanner />
      <section className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          {SITE_NAME}
        </h1>
        <p className="text-sm text-muted">{SITE_TAGLINE}</p>
        <p className="text-[11px] text-muted">
          {source}
          {liveHint ? ` · ${liveHint}` : ""}
        </p>
      </section>

      {topBoard.length > 0 ? <TopBoard inspections={topBoard} /> : null}
      <HallFeed items={feed.slice(0, 12)} />
      <ClassDirectory classes={allClasses} />
    </div>
  );
}
