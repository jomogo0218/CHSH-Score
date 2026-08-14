/**
 * 正式站通道往返檢查
 * node scripts/audit-channels.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://chsh-score.vercel.app";
const stamp = new Date().toISOString();
const results = [];

function loadEnv(file) {
  const out = {};
  try {
    for (const line of readFileSync(resolve(root, file), "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      out[t.slice(0, i)] = t.slice(i + 1).trim();
    }
  } catch {
    /* ignore */
  }
  return out;
}

const env = { ...loadEnv(".env.local"), ...process.env };

function pass(channel, step, detail = "") {
  results.push({ channel, step, ok: true, detail });
  console.log(`PASS  [${channel}] ${step}${detail ? ` — ${detail}` : ""}`);
}
function fail(channel, step, detail = "") {
  results.push({ channel, step, ok: false, detail });
  console.error(`FAIL  [${channel}] ${step}${detail ? ` — ${detail}` : ""}`);
}

async function checkPage(path, expectText) {
  const channel = `page${path === "/" ? "/環境" : path}`;
  try {
    const res = await fetch(`${ORIGIN}${path}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    const text = await res.text();
    if (res.status !== 200) {
      fail(channel, "GET", `status=${res.status}`);
      return;
    }
    if (expectText && !expectText.test(text)) {
      fail(channel, "GET", "內容缺少預期關鍵字");
      return;
    }
    if (path === "/lunch" && text.includes("<iframe")) {
      fail(channel, "GET", "仍含 iframe（應已原生化）");
      return;
    }
    pass(channel, "GET", "200");
  } catch (err) {
    fail(channel, "GET", err instanceof Error ? err.message : String(err));
  }
}

async function checkAsset(path) {
  const channel = `asset${path}`;
  try {
    const res = await fetch(`${ORIGIN}${path}`, { method: "HEAD" });
    if (res.status === 200) pass(channel, "HEAD", "200");
    else fail(channel, "HEAD", `status=${res.status}`);
  } catch (err) {
    fail(channel, "HEAD", err instanceof Error ? err.message : String(err));
  }
}

async function checkJsonApi(path, opts = {}) {
  const channel = `api${path}`;
  try {
    const res = await fetch(`${ORIGIN}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { res, body, channel };
  } catch (err) {
    fail(channel, "request", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// --- pages ---
await checkPage("/", /環境|環境評分/);
await checkPage("/recycle", /回收/);
await checkPage("/supply", /領用/);
await checkPage("/lunch", /午餐|佈告|回報/);
await checkPage("/lunch/inbox", /午餐|收件|菜單/);
await checkPage("/board", /看板|巡察|缺失/);
await checkPage("/inspect", /巡察/);
await checkPage("/usage", /用量|使用/);
await checkPage("/login", /登入|組長|帳號/);
await checkPage("/classes/j101", /班|巡察|環境/);

await checkAsset("/themes/atelier/classroom.jpg");
await checkAsset("/themes/atelier/recycle.jpg");
await checkAsset("/themes/atelier/supply.jpg");
await checkAsset("/themes/atelier/lunch.jpg");
await checkAsset("/manifest.webmanifest");
await checkAsset("/docs/recycle-guide.pdf");

// --- setup-status ---
{
  const hit = await checkJsonApi("/api/setup-status");
  if (hit) {
    if (hit.res.status === 200) {
      pass("api/setup-status", "GET", JSON.stringify(hit.body).slice(0, 120));
    } else {
      fail("api/setup-status", "GET", `status=${hit.res.status}`);
    }
  }
}

// --- usage ---
{
  const hit = await checkJsonApi("/api/usage");
  if (hit) {
    if (hit.res.status === 200) pass("api/usage", "GET", "200");
    else fail("api/usage", "GET", `status=${hit.res.status}`);
  }
}

// --- Firebase round trips ---
if (!env.NEXT_PUBLIC_FIREBASE_API_KEY || !env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  fail("firebase", "env", "缺少 Firebase 設定");
} else {
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const db = getFirestore(app);

  // lunch_reports write → read
  let lunchId = null;
  try {
    const payload = {
      kind: "portion",
      class_id: "j101",
      class_name: "通道測試班",
      dish: "測試主菜",
      dishes: ["飯", "主菜"],
      portion: "too_little",
      comment: `通道往返測試 ${stamp}`,
      status: "pending",
      source: "channel-audit",
      created_at: stamp,
    };
    const ref = await addDoc(collection(db, "lunch_reports"), payload);
    lunchId = ref.id;
    pass("lunch_reports", "create", `id=${lunchId}`);
    const snap = await getDoc(doc(db, "lunch_reports", lunchId));
    if (snap.exists() && snap.data()?.comment === payload.comment) {
      pass("lunch_reports", "readback", "內容一致");
    } else fail("lunch_reports", "readback", "不符");
  } catch (err) {
    fail("lunch_reports", "create/read", err instanceof Error ? err.message : String(err));
  }

  // supply_requests write → read
  let supplyId = null;
  try {
    const payload = {
      class_id: "j101",
      item_id: "toilet_cleaner",
      item_label: "刷洗廁所清潔劑",
      quantity: 1,
      note: `通道往返測試 ${stamp}`,
      applicant_name: "通道測試",
      status: "pending",
      created_at: stamp,
    };
    // item id from catalog - check actual ids
    const ref = await addDoc(collection(db, "supply_requests"), payload);
    supplyId = ref.id;
    pass("supply_requests", "create", `id=${supplyId}`);
    const snap = await getDoc(doc(db, "supply_requests", supplyId));
    if (snap.exists() && snap.data()?.note === payload.note) {
      pass("supply_requests", "readback", "內容一致");
    } else fail("supply_requests", "readback", "不符");
  } catch (err) {
    fail("supply_requests", "create/read", err instanceof Error ? err.message : String(err));
  }

  // menus read (may be empty; guest read should work)
  try {
    const snap = await getDocs(query(collection(db, "menus"), limit(5)));
    pass("menus", "read", `docs=${snap.size}`);
  } catch (err) {
    fail("menus", "read", err instanceof Error ? err.message : String(err));
  }

  // classes read
  try {
    const snap = await getDocs(query(collection(db, "classes"), limit(3)));
    pass("classes", "read", `docs=${snap.size}`);
  } catch (err) {
    fail("classes", "read", err instanceof Error ? err.message : String(err));
  }

  // inspections read
  try {
    const snap = await getDocs(
      query(collection(db, "inspections"), orderBy("created_at", "desc"), limit(3)),
    );
    pass("inspections", "read", `docs=${snap.size}`);
  } catch (err) {
    // fallback without orderBy
    try {
      const snap = await getDocs(query(collection(db, "inspections"), limit(3)));
      pass("inspections", "read", `docs=${snap.size} (無索引排序)`);
    } catch (err2) {
      fail(
        "inspections",
        "read",
        err2 instanceof Error ? err2.message : String(err2),
      );
    }
  }

  // notify lunch (uses live report path)
  {
    const hit = await checkJsonApi("/api/notify-staff", {
      method: "POST",
      body: JSON.stringify({
        type: "lunch",
        classId: "j101",
        className: "通道測試班",
        kind: "portion",
        dish: "測試主菜",
        note: `通道往返測試 lunch ${stamp}`,
      }),
    });
    if (hit) {
      const tg = hit.body.telegram;
      if (hit.res.status === 200 && tg && tg.ok && !tg.skipped) {
        pass("notify/lunch→Telegram", "roundtrip", `chatId=${tg.chatId}`);
      } else if (hit.res.status === 200 && tg?.skipped) {
        fail("notify/lunch→Telegram", "roundtrip", `skipped: ${JSON.stringify(tg)}`);
      } else {
        fail(
          "notify/lunch→Telegram",
          "roundtrip",
          `status=${hit.res.status} ${JSON.stringify(hit.body).slice(0, 200)}`,
        );
      }
    }
  }

  // notify supply
  {
    // discover a real supply item id from catalog via page or hardcode common
    const itemCandidates = [
      "toilet_cleaner",
      "cleaner",
      "soap",
      "trash_bag",
      "plastic_bag",
    ];
    // read from source catalog if possible
    let itemId = "soap";
    try {
      const cat = readFileSync(
        resolve(root, "src/lib/supply/catalog.ts"),
        "utf8",
      );
      const m = cat.match(/id:\s*"([^"]+)"/);
      if (m) itemId = m[1];
    } catch {
      /* use default */
    }
    const hit = await checkJsonApi("/api/notify-staff", {
      method: "POST",
      body: JSON.stringify({
        type: "supply",
        classId: "j101",
        itemId,
        quantity: 1,
        applicantName: "通道測試",
      }),
    });
    if (hit) {
      const tg = hit.body.telegram;
      if (hit.res.status === 200 && tg && tg.ok && !tg.skipped) {
        pass("notify/supply→Telegram", "roundtrip", `item=${itemId}`);
      } else if (hit.res.status === 400) {
        fail(
          "notify/supply→Telegram",
          "roundtrip",
          `itemId 無效? ${itemId} ${JSON.stringify(hit.body)}`,
        );
        // retry with all candidates
        for (const id of itemCandidates) {
          const retry = await checkJsonApi("/api/notify-staff", {
            method: "POST",
            body: JSON.stringify({
              type: "supply",
              classId: "j101",
              itemId: id,
              quantity: 1,
              applicantName: "通道測試",
            }),
          });
          if (
            retry &&
            retry.res.status === 200 &&
            retry.body.telegram?.ok &&
            !retry.body.telegram?.skipped
          ) {
            pass("notify/supply→Telegram", "roundtrip-retry", `item=${id}`);
            break;
          }
        }
      } else {
        fail(
          "notify/supply→Telegram",
          "roundtrip",
          `status=${hit.res.status} ${JSON.stringify(hit.body).slice(0, 200)}`,
        );
      }
    }
  }

  // notify fix
  {
    const hit = await checkJsonApi("/api/notify-staff", {
      method: "POST",
      body: JSON.stringify({
        type: "fix",
        classId: "j101",
        authorName: "通道測試",
        note: `通道往返測試 fix ${stamp}`,
        photoUrls: [],
      }),
    });
    if (hit) {
      const tg = hit.body.telegram;
      if (hit.res.status === 200 && tg && tg.ok && !tg.skipped) {
        pass("notify/fix→Telegram", "roundtrip", "ok");
      } else {
        fail(
          "notify/fix→Telegram",
          "roundtrip",
          `status=${hit.res.status} ${JSON.stringify(hit.body).slice(0, 200)}`,
        );
      }
    }
  }

  // form-report upload roundtrip (tiny jpeg)
  {
    // 1x1 jpeg
    const b64 =
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z";
    const bin = Buffer.from(b64, "base64");
    const form = new FormData();
    form.append(
      "file",
      new Blob([bin], { type: "image/jpeg" }),
      "audit.jpg",
    );
    form.append("classId", "j101");
    try {
      const res = await fetch(`${ORIGIN}/api/fix-report`, {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body.photoUrl) {
        pass(
          "api/fix-report",
          "upload→url",
          body.stub ? "stub dataURL" : "R2 url",
        );
      } else {
        fail(
          "api/fix-report",
          "upload→url",
          `status=${res.status} ${JSON.stringify(body).slice(0, 160)}`,
        );
      }
    } catch (err) {
      fail(
        "api/fix-report",
        "upload→url",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // leave note about cleanup ids
  if (lunchId || supplyId) {
    pass(
      "cleanup",
      "manual",
      `請於收件匣結案：lunch=${lunchId || "-"} supply=${supplyId || "-"}`,
    );
  }
}

// FOOD optional
try {
  const res = await fetch("https://chsh-food.vercel.app/", {
    headers: { "Cache-Control": "no-cache" },
  });
  if (res.status === 200) pass("FOOD", "GET /", "200（導師主路徑已改 Score）");
  else fail("FOOD", "GET /", `status=${res.status}`);
} catch (err) {
  fail("FOOD", "GET /", err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.ok);
const passed = results.filter((r) => r.ok);
console.log("\n========== 摘要 ==========");
console.log(`通過 ${passed.length}／${results.length}，失敗 ${failed.length}`);
if (failed.length) {
  console.log("失敗項目：");
  for (const f of failed) {
    console.log(` - [${f.channel}] ${f.step}: ${f.detail}`);
  }
}

const outPath = resolve(root, "scripts/audit-channels-result.json");
writeFileSync(
  outPath,
  JSON.stringify({ stamp, origin: ORIGIN, results }, null, 2),
  "utf8",
);
console.log(`結果已寫入 ${outPath}`);
process.exit(failed.length ? 1 : 0);
