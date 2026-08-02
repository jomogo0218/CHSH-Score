"use client";

import { useEffect, useState } from "react";
import { LiveBoard } from "@/components/LiveBoard";
import { FETCH_TTL_MS, withTtlCache } from "@/lib/cache/ttl";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { fetchLatestInspections } from "@/lib/firebase/firestore";
import { getLocalInspections } from "@/lib/local/store";
import { getLatestFeed } from "@/lib/seed/demo-data";
import type { InspectionDoc } from "@/lib/types";

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

export function BoardClient() {
  const [items, setItems] = useState<InspectionDoc[]>(getLatestFeed());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = getLocalInspections();
      let remote: InspectionDoc[] = [];
      if (isFirebaseConfigured()) {
        try {
          const result = await withTtlCache(
            "board:latest",
            () => fetchLatestInspections(20),
            FETCH_TTL_MS,
          );
          remote = result.data;
        } catch {
          // keep demo
        }
      }
      if (cancelled) return;
      setItems(mergeFeed(remote, local, getLatestFeed()));
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
