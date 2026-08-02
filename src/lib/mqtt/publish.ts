import { MQTT_TOPICS } from "@/lib/constants";
import type { LiveFeedPayload } from "@/lib/types";

/** 經 API 以管理員身分廣播 live_feed 與班級 channel */
export async function publishLiveUpdate(
  payload: LiveFeedPayload,
): Promise<{ stub: boolean }> {
  const res = await fetch("/api/mqtt-publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
