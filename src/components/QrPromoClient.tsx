"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QrImage } from "@/components/ClassQrPanel";
import { CLASS_ROSTER, GRADE_LABELS, GRADE_ORDER } from "@/lib/constants";

export function QrPromoClient() {
  const [origin, setOrigin] = useState("");
  const [grade, setGrade] = useState<number | "all">("all");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const classes = useMemo(() => {
    if (grade === "all") return [...CLASS_ROSTER];
    return CLASS_ROSTER.filter((c) => c.grade === grade);
  }, [grade]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="animate-rise space-y-1">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint sm:text-2xl">
          班級 QR
        </h1>
        <p className="text-sm text-muted">
          貼教室：掃碼看照片／回報。組長 QR 可直接開上傳頁。
        </p>
        <p className="text-xs">
          <Link href="/" className="text-mint underline">
            回大廳
          </Link>
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGrade("all")}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            grade === "all"
              ? "border-mint bg-mint text-white"
              : "border-line bg-paper"
          }`}
        >
          全部
        </button>
        {GRADE_ORDER.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              grade === g
                ? "border-mint bg-mint text-white"
                : "border-line bg-paper"
            }`}
          >
            {GRADE_LABELS[g]}
          </button>
        ))}
      </div>

      {!origin ? (
        <p className="text-sm text-muted">準備網址中…</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <section key={c.class_id} className="panel space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold text-ink">{c.class_name}</h2>
                <span className="text-xs text-muted">{c.class_id}</span>
              </div>
              <QrImage
                value={`${origin}/classes/${c.class_id}`}
                label="班級主頁"
                size={160}
              />
              <QrImage
                value={`${origin}/inspect/${c.class_id}`}
                label="組長巡檢"
                size={120}
              />
              <Link
                href={`/classes/${c.class_id}`}
                className="block text-center text-sm text-mint underline"
              >
                開啟班級頁
              </Link>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
