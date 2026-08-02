"use client";

import { useEffect, useRef } from "react";
import {
  createMqttClient,
  getSchoolClientConfig,
  MQTT_TOPICS,
} from "@/lib/mqtt/client";
import type { LiveFeedPayload } from "@/lib/types";

/**
 * 訂閱全校 live_feed；無 MQTT 設定時為 no-op。
 */
export function useLiveFeedSubscription(
  onMessage: (payload: LiveFeedPayload) => void,
) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const config = getSchoolClientConfig();
    if (!config) return;

    const client = createMqttClient(config);
    let cancelled = false;

    void (async () => {
      try {
        await client.connect();
        if (cancelled) {
          await client.disconnect();
          return;
        }
        await client.subscribe(MQTT_TOPICS.liveFeed, (_topic, message) => {
          try {
            const data = JSON.parse(message) as LiveFeedPayload;
            if (data?.class_id) handlerRef.current(data);
          } catch {
            // ignore bad payload
          }
        });
      } catch (err) {
        console.info("[mqtt] live_feed 訂閱失敗，改用重整／快取", err);
      }
    })();

    return () => {
      cancelled = true;
      void client.disconnect();
    };
  }, []);
}
