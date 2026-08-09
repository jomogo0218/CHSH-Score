"use client";

import { useEffect, useState } from "react";
import { ClassDirectory } from "@/components/ClassDirectory";
import { HallFeed, RankBoard, TopBoard, WeeklyBoard } from "@/components/HallFeed";
import { MyClassCard } from "@/components/MyClassCard";
import { SetupStatusBanner } from "@/components/SetupStatusBanner";
import { FETCH_TTL_MS, setCached, withTtlCache } from "@/lib/cache/ttl";
import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import {
  SEMESTER_INSPECTIONS_LIMIT,
  fetchInspectionsSince,
} from "@/lib/firebase/firestore";
import { getLocalInspections } from "@/lib/local/store";
import { onInspectionUpdate } from "@/lib/live/inspection-events";
import { useLiveFeedSubscription } from "@/lib/mqtt/useLiveFeed";
import { TEACHER_ZONE_LABEL, TEACHER_ZONE_TAGLINE } from "@/lib/constants";
import {
  allClasses,
  getDemoClass,
  getLatestFeed,
  getTodayTopClasses,
} from "@/lib/seed/demo-data";
import {
  deficiencyCountOf,
  monthlyDeficiencyByClass,
  semesterDeficiencyByClass,
  weeklyDeficiencyByClass,
} from "@/lib/scoring/deficiency";
import {
  taiwanDateString,
  taiwanMonthEnd,
  taiwanMonthStart,
  taiwanSemesterEnd,
  taiwanSemesterStart,
  taiwanWeekEnd,
  taiwanWeekStart,
} from "@/lib/time/taiwan";
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
    inspection_id: payload.inspection_id ?? `${date}_${payload.class_id}`,
    date,
    class_id: payload.class_id,
    inspector_id: "mqtt",
    total_score: payload.score,
    deficiency_count: payload.deficiency_count,
    summary_blog: payload.note,
    status: payload.status ?? "pending_fix",
    cover_photo_url: payload.photo_url || undefined,
    created_at: payload.created_at,
  };
}

export function HallClient() {
  const [feed, setFeed] = useState<InspectionDoc[]>(() => getLatestFeed());
  const [source, setSource] = useState("demo（預覽）");
  const [liveHint, setLiveHint] = useState<string | null>(null);
  const { classId: pinnedClassId } = usePinnedClass();
  const semesterStart = taiwanSemesterStart();

  useLiveFeedSubscription((payload) => {
    const doc = liveToInspection(payload);
    setFeed((prev) => {
      const next = mergeFeed([doc], [], prev);
      setCached(`hall:since:${semesterStart}`, next.slice(0, SEMESTER_INSPECTIONS_LIMIT), FETCH_TTL_MS);
      return next;
    });
    const name =
      getDemoClass(payload.class_id)?.class_name ?? payload.class_id;
    const n = payload.deficiency_count ?? deficiencyCountOf(doc);
    setLiveHint(`即時更新：${name} ${n === 0 ? "無缺失" : `缺失 ${n} 次`}`);
    setSource("mqtt");
  });

  useEffect(() => {
    return onInspectionUpdate((doc) => {
      setFeed((prev) => {
        const next = mergeFeed([doc], [], prev);
        setCached(`hall:since:${semesterStart}`, next.slice(0, SEMESTER_INSPECTIONS_LIMIT), FETCH_TTL_MS);
        return next;
      });
    });
  }, [semesterStart]);

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
            `hall:since:${semesterStart}`,
            () => fetchInspectionsSince(semesterStart, SEMESTER_INSPECTIONS_LIMIT),
            FETCH_TTL_MS,
          );
          remote = result.data;
          fromCache = result.fromCache;
        } catch {
          // keep local only
        }
      }
      if (cancelled) return;
      const demo =
        remote.length === 0 && local.length === 0 ? getLatestFeed() : [];
      const merged = mergeFeed(remote, local, demo);
      setFeed(merged);
      if (remote.length) {
        setSource(fromCache ? "firestore(cache)" : "firestore");
      } else if (local.length) setSource("local");
      else setSource(demo.length ? "demo（預覽）" : "empty");
    }

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [semesterStart]);

  const today = taiwanDateString();
  const openFeed = feed.filter((i) => i.status !== "fixed");
  const top = [...openFeed]
    .filter((i) => i.date === today)
    .sort(
      (a, b) =>
        deficiencyCountOf(a) - deficiencyCountOf(b) ||
        b.created_at.localeCompare(a.created_at),
    )
    .slice(0, 3);
  const topBoard =
    top.length > 0
      ? top
      : openFeed.length === 0
        ? getTodayTopClasses(3).filter((i) => i.status !== "fixed")
        : [];
  const weekRows = weeklyDeficiencyByClass(feed);
  const monthRows = monthlyDeficiencyByClass(feed);
  const semesterRows = semesterDeficiencyByClass(feed);
  const weekLabel = `${taiwanWeekStart().replaceAll("-", "/")}～${taiwanWeekEnd().replaceAll("-", "/")}`;
  const monthLabel = `${taiwanMonthStart().replaceAll("-", "/")}～${taiwanMonthEnd().replaceAll("-", "/")}`;
  const semesterLabel = `${taiwanSemesterStart().replaceAll("-", "/")}～${taiwanSemesterEnd().replaceAll("-", "/")}`;

  return (
    <div className="space-y-3 sm:space-y-4">
      <SetupStatusBanner />
      <div
        className="atelier-hero h-28 overflow-hidden rounded-[0.75rem] bg-cover bg-center shadow-sm sm:h-36"
        style={{ backgroundImage: "url(/themes/atelier/classroom.jpg)" }}
        aria-hidden
      />
      <section className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
          {TEACHER_ZONE_LABEL}
        </h1>
        <p className="text-sm text-muted">{TEACHER_ZONE_TAGLINE}</p>
        <p className="text-[11px] text-muted">
          {source}
          {liveHint ? ` · ${liveHint}` : ""}
        </p>
      </section>

      {pinnedClassId ? (
        <MyClassCard classId={pinnedClassId} inspections={feed} />
      ) : null}
      {topBoard.length > 0 ? (
        <TopBoard inspections={topBoard} highlightClassId={pinnedClassId} />
      ) : null}
      {weekRows.length || monthRows.length || semesterRows.length ? (
        <details className="panel animate-rise p-3 sm:p-4">
          <summary className="cursor-pointer list-none font-[family-name:var(--font-display)] text-lg font-bold text-mint [&::-webkit-details-marker]:hidden">
            累計缺失
            <span className="ml-2 text-xs font-normal text-muted">點開看</span>
          </summary>
          <div className="mt-3 space-y-4">
            <WeeklyBoard
              rows={weekRows}
              weekLabel={weekLabel}
              highlightClassId={pinnedClassId}
            />
            <RankBoard
              title="本月累計缺失"
              hint={`${monthLabel} · 缺失多的在前`}
              rows={monthRows}
              highlightClassId={pinnedClassId}
            />
            <RankBoard
              title="本學期累計缺失"
              hint={`${semesterLabel}（上學期 8–1 月／下學期 2–7 月）`}
              rows={semesterRows}
              highlightClassId={pinnedClassId}
            />
          </div>
        </details>
      ) : null}
      <HallFeed items={openFeed.slice(0, 12)} highlightClassId={pinnedClassId} />
      <ClassDirectory classes={allClasses} highlightClassId={pinnedClassId} />
    </div>
  );
}
