"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isFirebaseConfigured, loginAsAdmin } from "@/lib/firebase/auth";
import { SetupStatusBanner } from "@/components/SetupStatusBanner";

type Status = "idle" | "loading" | "success" | "error";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("登入逾時（超過 15 秒）。請檢查網路，或到 Firebase 授權網域加入 chsh-score.vercel.app")),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function explainError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  const raw = err instanceof Error ? err.message : "登入失敗";

  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "帳號或密碼錯誤。請用 Firebase Authentication → Users 裡建立的 Email／密碼（不一定等於 Gmail 信箱密碼）。";
  }
  if (code.includes("unauthorized-domain")) {
    return "網域未授權。請到 Firebase → Authentication → Settings → Authorized domains，新增 chsh-score.vercel.app 後再試。";
  }
  if (code.includes("operation-not-allowed")) {
    return "尚未啟用 Email/Password。請到 Authentication → Sign-in method 開啟。";
  }
  if (code.includes("too-many-requests")) {
    return "嘗試太多次，請稍後再試。";
  }
  if (code.includes("network-request-failed")) {
    return "網路連線失敗，請檢查網路或關閉廣告攔截後重試。";
  }
  if (code) return `${raw}（${code}）`;
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("正在連線 Firebase，請稍候…");

    try {
      if (!configured) {
        throw new Error("前端尚未載入 Firebase 設定。請重新整理頁面；若仍失敗請通知管理員重新部署。");
      }
      await withTimeout(loginAsAdmin(email.trim(), password), 15_000);
      setStatus("success");
      setMessage("登入成功，正在前往巡察…");
      router.push("/inspect");
    } catch (err) {
      setStatus("error");
      setMessage(explainError(err));
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <SetupStatusBanner />
      <form onSubmit={onSubmit} className="panel space-y-3 p-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-mint">
          組長登入
        </h1>
        <p className="text-sm text-muted">登入後可上傳巡察照片。</p>
        <p className={`rounded-lg px-3 py-2 text-xs ${configured ? "bg-leaf/15 text-mint" : "bg-coral/10 text-coral"}`}>
          Firebase 前端設定：{configured ? "已偵測到" : "未偵測到（需重新部署／重整）"}
        </p>

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            disabled={status === "loading"}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-mint disabled:opacity-60"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>密碼</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            disabled={status === "loading"}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 outline-none focus:border-mint disabled:opacity-60"
          />
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-block btn-primary btn-wide disabled:cursor-wait"
        >
          {status === "loading" ? "登入中，請稍候…" : "登入"}
        </button>

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              status === "success"
                ? "border border-mint/40 bg-leaf/15 text-mint"
                : status === "error"
                  ? "border border-coral/40 bg-coral/10 text-coral"
                  : status === "loading"
                    ? "border border-line bg-paper text-ink"
                    : "border border-line bg-paper text-muted"
            }`}
          >
            {status === "loading" ? "⏳ " : status === "success" ? "✓ " : status === "error" ? "✕ " : ""}
            {message}
            {status === "success" ? (
              <p className="mt-2">
                <Link href="/inspect" className="underline">
                  前往巡察上傳 →
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted">狀態：等待輸入。按下「登入」後會顯示讀取中／成功／失敗。</p>
        )}
      </form>
    </div>
  );
}
