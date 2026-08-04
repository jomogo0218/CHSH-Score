import { NextResponse } from "next/server";
import { hasR2Credentials } from "@/lib/r2/server";

/**
 * 回傳雲端接線狀態（不含任何密鑰內容），方便組長確認上線條件。
 */
export async function GET() {
  const firebase = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
  const r2Public = Boolean(process.env.NEXT_PUBLIC_CF_R2_PUBLIC_URL);
  const r2Write = hasR2Credentials();
  const mqttSubscribe = Boolean(
    process.env.NEXT_PUBLIC_MQTT_URL && process.env.NEXT_PUBLIC_MQTT_USER,
  );
  const mqttPublish = Boolean(
    process.env.NEXT_PUBLIC_MQTT_URL && process.env.MQTT_ADMIN_USER,
  );

  const coreReady = firebase && r2Write && r2Public;
  return NextResponse.json({
    coreReady,
    firebase,
    r2: { publicUrl: r2Public, upload: r2Write },
    mqtt: { subscribe: mqttSubscribe, publish: mqttPublish },
    guestFixReport: coreReady,
    hint: coreReady
      ? "核心已就緒：導師可免登入於班級頁拍照回報（累積、不覆蓋）。請確認已發布最新 firestore.rules。"
      : "請在 Vercel Environment Variables 填入 Firebase 與 R2（見 docs/cloud-setup.md）。MQTT 為選配即時廣播。",
  });
}
