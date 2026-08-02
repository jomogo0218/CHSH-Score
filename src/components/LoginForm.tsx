"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { isFirebaseConfigured, loginAsAdmin } from "@/lib/firebase/auth";
import { SetupStatusBanner } from "@/components/SetupStatusBanner";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isFirebaseConfigured();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await loginAsAdmin(email, password);
      setMessage("登入成功。可前往「巡察上傳」發布照片與評分。");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      const raw = err instanceof Error ? err.message : "登入失敗";
      let hint = raw;
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        hint = "帳號或密碼錯誤。請確認 Firebase Authentication 已建立此使用者。";
      } else if (code.includes("unauthorized-domain")) {
        hint =
          "網域未授權。請到 Firebase Console → Authentication → Settings → Authorized domains，新增 chsh-score.vercel.app";
      } else if (code.includes("operation-not-allowed")) {
        hint = "尚未啟用 Email/Password 登入。請到 Authentication → Sign-in method 開啟。";
      } else if (code.includes("too-many-requests")) {
        hint = "嘗試太多次，請稍後再試。";
      } else if (code.includes("network-request-failed")) {
        hint = "網路連線失敗，請檢查網路後重試。";
      } else if (code) {
        hint = `${raw}（${code}）`;
      }
      setMessage(hint);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <SetupStatusBanner />
      <form onSubmit={onSubmit} className="panel space-y-4 p-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
          組長登入
        </h1>
        <p className="text-sm text-muted">
          登入後可上傳巡察照片給導師與同學看，並可評分。導師／股長回報清掃請到各班「改善回報」。
        </p>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
          <li>
            依{" "}
            <span className="font-mono">docs/cloud-setup.md</span> 申請 Firebase
            與 Cloudflare R2
          </li>
          <li>在 Vercel 專案填入對應環境變數並重新部署</li>
          <li>Firebase Console 貼上最新 firestore.rules，建立 admin 帳號</li>
        </ol>
        {!configured ? (
          <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">
            尚未偵測到 Firebase 環境變數，表單可操作但無法連線雲端。
          </p>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-mint"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>密碼</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-mint"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-mint px-4 py-2.5 font-semibold text-white transition hover:bg-leaf disabled:opacity-60"
        >
          {loading ? "登入中…" : "登入"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        <p className="text-center text-xs text-muted">
          <Link href="/inspect" className="text-mint underline">
            前往巡察上傳
          </Link>
          {" · "}
          <Link href="/qr" className="text-mint underline">
            班級 QR
          </Link>
        </p>
      </form>
    </div>
  );
}
