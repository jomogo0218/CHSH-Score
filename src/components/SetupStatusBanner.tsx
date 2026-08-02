"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SetupStatus = {
  coreReady: boolean;
  firebase: boolean;
  r2: { publicUrl: boolean; upload: boolean };
  mqtt: { subscribe: boolean; publish: boolean };
  hint: string;
};

export function SetupStatusBanner() {
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/setup-status")
      .then((r) => r.json())
      .then((data: SetupStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.coreReady) return null;

  return (
    <aside className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-ink">
      <p className="font-semibold text-coral">上線設定尚未完成</p>
      <p className="mt-1 text-muted">{status.hint}</p>
      <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
        <li>Firebase：{status.firebase ? "已設定" : "未設定"}</li>
        <li>
          R2 上傳：{status.r2.upload ? "已設定" : "未設定"}
          {status.r2.publicUrl ? "" : "（缺公開網址）"}
        </li>
        <li>
          MQTT 即時（選配）：
          {status.mqtt.publish && status.mqtt.subscribe
            ? "已設定"
            : "未設定／可略過"}
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted">
        步驟見{" "}
        <Link href="/login" className="text-mint underline">
          登入頁說明
        </Link>
        ，或專案內 docs/cloud-setup.md。目前訪客仍可看 demo；設定後即可顯示真實巡察照片。
      </p>
    </aside>
  );
}
