"use client";

import { useState, type FormEvent } from "react";
import { isFirebaseConfigured, loginAsAdmin } from "@/lib/firebase/auth";

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
      setMessage("登入成功。可前往 /inspect 使用組長工具。");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mx-auto max-w-md space-y-4 p-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-mint">
        組長登入
      </h1>
      <p className="text-sm text-muted">
        使用 Firebase Email／密碼。請先依 docs/cloud-setup.md 建立 admin
        帳號與 users 文件。
      </p>
      {!configured ? (
        <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">
          尚未偵測到 Firebase 環境變數，表單可操作但無法連線。
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
    </form>
  );
}
