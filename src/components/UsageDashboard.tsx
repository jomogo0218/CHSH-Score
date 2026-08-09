"use client";

import { useCallback, useEffect, useState } from "react";

type UsageMeter = {
  id: string;
  label: string;
  description: string;
  usedBytes: number | null;
  limitBytes: number;
  usedLabel: string | null;
  limitLabel: string;
  percent: number | null;
  live: boolean;
  dashboardUrl: string;
  note?: string;
};

type UsageResponse = {
  updatedAt: string;
  fromCache: boolean;
  meters: UsageMeter[];
  tip?: string;
  error?: string;
};

function barColor(percent: number | null): string {
  if (percent === null) return "bg-line";
  if (percent >= 85) return "bg-coral";
  if (percent >= 60) return "bg-amber-500";
  return "bg-mint";
}

function MeterCard({ meter }: { meter: UsageMeter }) {
  const pct = meter.percent;
  const width =
    pct === null ? (meter.live ? "0%" : "0%") : `${Math.min(100, pct)}%`;

  return (
    <article className="panel space-y-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink sm:text-base">
            {meter.label}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{meter.description}</p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            meter.live
              ? "bg-leaf/25 text-mint"
              : "bg-paper text-muted"
          }`}
        >
          {meter.live ? "即時" : "需看後台"}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">
            {meter.usedLabel ?? "—"}
            <span className="ml-1 text-sm font-normal text-muted">
              / {meter.limitLabel}
            </span>
          </p>
          <p className="tabular-nums text-sm font-semibold text-muted">
            {pct === null ? "—" : `${pct.toFixed(1)}%`}
          </p>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-line/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct === null ? undefined : Math.round(pct)}
          aria-label={meter.label}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${barColor(pct)}`}
            style={{ width: meter.live && pct !== null ? width : "0%" }}
          />
        </div>
        {!meter.live ? (
          <p className="text-[11px] text-muted">
            此項無法由網站自動讀取完整數字，請點下方後台查看實際進度。
          </p>
        ) : null}
      </div>

      {meter.note ? (
        <p className="text-xs leading-relaxed text-muted">{meter.note}</p>
      ) : null}

      <a
        href={meter.dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-xs font-semibold text-mint underline"
      >
        開啟後台查看 →
      </a>
    </article>
  );
}

export function UsageDashboard() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = (await res.json()) as UsageResponse;
      if (!res.ok) {
        throw new Error(json.error || "讀取失敗");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "讀取失敗");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          免費額度進度
        </h1>
        <p className="text-sm text-muted">
          隨時查看照片空間與各服務免費上限，避免突然需要付費。
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="btn-block btn-primary px-3 py-1.5 text-sm"
        >
          {busy ? "讀取中…" : "重新整理"}
        </button>
        {data?.updatedAt ? (
          <p className="text-xs text-muted">
            更新於 {new Date(data.updatedAt).toLocaleString("zh-TW")}
            {data.fromCache ? "（快取）" : ""}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      ) : null}

      {data?.tip ? (
        <p className="rounded-lg border border-mint/25 bg-leaf/15 px-3 py-2 text-xs text-ink sm:text-sm">
          {data.tip}
        </p>
      ) : null}

      <div className="grid gap-3 sm:gap-4">
        {(data?.meters ?? []).map((meter) => (
          <MeterCard key={meter.id} meter={meter} />
        ))}
        {!data && busy ? (
          <p className="text-sm text-muted">正在掃描照片用量…</p>
        ) : null}
      </div>
    </div>
  );
}
