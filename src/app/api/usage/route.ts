import { NextResponse } from "next/server";
import { withTtlCache } from "@/lib/cache/ttl";
import { getR2BucketUsage } from "@/lib/r2/server";

/** Cloudflare R2 免費儲存額度（約 10 GB） */
const R2_FREE_BYTES = 10 * 1024 * 1024 * 1024;
/** Vercel Hobby Fast Data Transfer（約 100 GB／月） */
const VERCEL_FREE_BYTES = 100 * 1024 * 1024 * 1024;
/** 壓縮後單張粗估，用來推算還能存幾張 */
const AVG_PHOTO_BYTES = 300 * 1024;

const USAGE_CACHE_MS = 5 * 60_000;

export type UsageMeter = {
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 用量總覽：R2 為實際掃描；Vercel／Firebase 為免費額度參考＋後台連結。
 */
export async function GET() {
  try {
    const { data: r2, fromCache } = await withTtlCache(
      "usage:r2",
      () => getR2BucketUsage(),
      USAGE_CACHE_MS,
    );

    const r2Percent = r2.configured
      ? Math.min(100, (r2.usedBytes / R2_FREE_BYTES) * 100)
      : null;
    const remainingBytes = r2.configured
      ? Math.max(0, R2_FREE_BYTES - r2.usedBytes)
      : null;
    const photosLeft =
      remainingBytes !== null
        ? Math.floor(remainingBytes / AVG_PHOTO_BYTES)
        : null;

    const meters: UsageMeter[] = [
      {
        id: "r2",
        label: "照片儲存（Cloudflare R2）",
        description: "巡察／改善照實際占用的空間",
        usedBytes: r2.configured ? r2.usedBytes : null,
        limitBytes: R2_FREE_BYTES,
        usedLabel: r2.configured ? formatSize(r2.usedBytes) : null,
        limitLabel: formatSize(R2_FREE_BYTES),
        percent: r2Percent,
        live: r2.configured,
        dashboardUrl: "https://dash.cloudflare.com/",
        note: r2.configured
          ? `約 ${r2.objectCount.toLocaleString("zh-TW")} 個檔案；以每張 ≤300KB 粗估，大約還能再存 ${photosLeft?.toLocaleString("zh-TW")} 張。`
          : "尚未設定 R2 憑證，無法讀取實際用量。",
      },
      {
        id: "vercel",
        label: "網站訪問流量（Vercel）",
        description: "頁面／程式從 Vercel 送出的流量（每月）",
        usedBytes: null,
        limitBytes: VERCEL_FREE_BYTES,
        usedLabel: null,
        limitLabel: formatSize(VERCEL_FREE_BYTES),
        percent: null,
        live: false,
        dashboardUrl: "https://vercel.com/dashboard",
        note: "Hobby 免費約 100 GB／月。超額通常是暫停，不會自動扣款。請到 Vercel → Usage 看本月數字。",
      },
      {
        id: "firebase",
        label: "文字資料（Firebase）",
        description: "分數、留言、登入等讀寫（每日／每月額度）",
        usedBytes: null,
        limitBytes: 0,
        usedLabel: null,
        limitLabel: "Spark 免費額度",
        percent: null,
        live: false,
        dashboardUrl: "https://console.firebase.google.com/",
        note: "全校規模通常夠用。請到 Firebase → 用量／Billing 查看讀寫次數。",
      },
    ];

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      fromCache,
      r2: {
        configured: r2.configured,
        bucket: r2.bucket,
        objectCount: r2.objectCount,
        usedBytes: r2.usedBytes,
        freeLimitBytes: R2_FREE_BYTES,
      },
      meters,
      tip: "進度條會快取約 5 分鐘。照片已壓縮，一般離付費還很遠。",
    });
  } catch (err) {
    console.error("[usage]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "讀取用量失敗" },
      { status: 500 },
    );
  }
}
