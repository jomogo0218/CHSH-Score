"use client";

import { useEffect, useState } from "react";
import { LiveBoard } from "@/components/LiveBoard";
import { FETCH_TTL_MS, setCached, withTtlCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchLatestInspections } from "@/lib/firebase/firestore";
import { getLocalInspections } from "@/lib/local/store";
import { useLiveFeedSubscription } from "@/lib/mqtt/useLiveFeed";
import { getLatestFeed } from "@/lib/seed/demo-data";
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

export function BoardClient() {
  const firebaseOn = isFirebaseConfigured();
  const [items, setItems] = useState<InspectionDoc[]>(() =>
    firebaseOn ? [] : getLatestFeed(),
  );

  useLiveFeedSubscription((payload) => {
    const doc = liveToInspection(payload);
    setItems((prev) => {
      const next = mergeFeed([doc], [], prev);
      setCached("board:latest", next.slice(0, 20), FETCH_TTL_MS);
      return next;
    });
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = getLocalInspections();
      let remote: InspectionDoc[] = [];
      const configured = isFirebaseConfigured();
      if (configured) {
        try {
          const result = await withTtlCache(
            "board:latest",
            () => fetchLatestInspections(20),
            FETCH_TTL_MS,
          );
          remote = result.data;
        } catch {
          // keep local
        }
      }
      if (cancelled) return;
      const demo = configured ? [] : getLatestFeed();
      setItems(mergeFeed(remote, local, demo));
    }

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <LiveBoard items={items} />;
}
