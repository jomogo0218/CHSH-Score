/**
 * 本機測試：午餐回報寫入 Firestore + 正式站 notify-staff
 * 用法：node scripts/test-lunch-report.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const out = {};
  try {
    const text = readFileSync(resolve(root, file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      out[t.slice(0, i)] = t.slice(i + 1).trim();
    }
  } catch {
    // ignore
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...process.env };
const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const results = [];
function ok(name, detail) {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, pass: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  fail("env", "缺少 Firebase 設定");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const stamp = new Date().toISOString();
const payload = {
  kind: "feedback",
  class_id: "j101",
  class_name: "測試班（自動化）",
  dish: "測試菜色",
  rating: 4,
  comment: `自動化測試 ${stamp}`,
  status: "pending",
  source: "score-lunch-test",
  created_at: stamp,
};

let reportId = null;

try {
  const ref = await addDoc(collection(db, "lunch_reports"), payload);
  reportId = ref.id;
  ok("firestore.create", `id=${reportId}`);
} catch (err) {
  fail("firestore.create", err instanceof Error ? err.message : String(err));
}

if (reportId) {
  try {
    const snap = await getDoc(doc(db, "lunch_reports", reportId));
    if (snap.exists() && snap.data()?.comment === payload.comment) {
      ok("firestore.readback", "內容一致");
    } else {
      fail("firestore.readback", "讀回內容不符或不存在");
    }
  } catch (err) {
    fail("firestore.readback", err instanceof Error ? err.message : String(err));
  }
}

const notifyUrl = "https://chsh-score.vercel.app/api/notify-staff";
try {
  const res = await fetch(notifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "lunch",
      classId: "j101",
      className: "測試班（自動化）",
      kind: "feedback",
      dish: "測試菜色",
      note: `自動化測試通知 ${stamp}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.ok !== false) {
    ok(
      "notify-staff.lunch",
      `status=${res.status} telegram=${JSON.stringify(body.telegram ?? body)}`,
    );
  } else {
    fail(
      "notify-staff.lunch",
      `status=${res.status} body=${JSON.stringify(body)}`,
    );
  }
} catch (err) {
  fail("notify-staff.lunch", err instanceof Error ? err.message : String(err));
}

// 清理測試單（guest 通常不能刪；失敗不算致命）
if (reportId) {
  try {
    await deleteDoc(doc(db, "lunch_reports", reportId));
    ok("firestore.cleanup", "已刪測試單");
  } catch (err) {
    ok(
      "firestore.cleanup",
      `無法刪除（預期：需 admin）— 請至 /lunch/inbox 結案或刪 id=${reportId}`,
    );
  }
}

const liveRes = await fetch("https://chsh-score.vercel.app/lunch");
const liveText = await liveRes.text();
if (
  liveRes.status === 200 &&
  !liveText.includes("<iframe") &&
  /佈告|回報/.test(liveText)
) {
  ok("live./lunch", "200 且無 iframe");
} else {
  fail("live./lunch", `status=${liveRes.status}`);
}

const inbox = await fetch("https://chsh-score.vercel.app/lunch/inbox");
if (inbox.status === 200) ok("live./lunch/inbox", "200");
else fail("live./lunch/inbox", `status=${inbox.status}`);

const failed = results.filter((r) => !r.pass);
console.log("\n---");
console.log(
  failed.length === 0
    ? `全部通過（${results.length}）`
    : `失敗 ${failed.length}/${results.length}`,
);
process.exit(failed.length === 0 ? 0 : 1);
