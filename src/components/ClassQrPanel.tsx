"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({
  value,
  label,
  size = 180,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark: "#1f3d2b", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <figure className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white p-4">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} width={size} height={size} />
      ) : (
        <div
          className="animate-pulse bg-leaf/20"
          style={{ width: size, height: size }}
        />
      )}
      <figcaption className="text-center text-sm text-muted">{label}</figcaption>
      <a
        href={value}
        className="break-all text-center text-xs text-mint underline"
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    </figure>
  );
}

export function ClassQrPanel({ classId, className }: { classId: string; className: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) {
    return (
      <p className="text-sm text-muted">產生 QR Code 中…</p>
    );
  }

  const classUrl = `${origin}/classes/${classId}`;
  const inspectUrl = `${origin}/inspect/${classId}`;

  return (
    <div className="space-y-3">
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint">
        {className} QR Code
      </h3>
      <p className="text-sm text-muted">
        可貼在教室門口：掃碼進班級小站看佐證；組長可掃巡檢連結快速評分。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <QrImage value={classUrl} label="班級主頁" />
        <QrImage value={inspectUrl} label="組長巡檢入口" />
      </div>
    </div>
  );
}
