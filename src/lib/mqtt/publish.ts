import { MQTT_TOPICS } from "@/lib/constants";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { LiveFeedPayload } from "@/lib/types";

/** 經 API 以管理員身分廣播 live_feed 與班級 channel */
export async function publishLiveUpdate(
  payload: LiveFeedPayload,
): Promise<{ stub: boolean }> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const res = await fetch("/api/mqtt-publish", {
    method: "POST",
    headers,
    body: JSON.stringify({
      topics: [
        MQTT_TOPICS.liveFeed,
        MQTT_TOPICS.classChannel(payload.class_id),
      ],
      payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "MQTT 發布失敗");
  }

  const data = (await res.json()) as { stub?: boolean };
  return { stub: Boolean(data.stub) };
}
