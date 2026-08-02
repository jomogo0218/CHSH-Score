import { MQTT_TOPICS } from "@/lib/constants";

export const topics = {
  liveFeed: MQTT_TOPICS.liveFeed,
  forClass: MQTT_TOPICS.classChannel,
  button: MQTT_TOPICS.button,
  /** 組長 App 訂閱所有門鈕：school/button/+ */
  allButtons: "school/button/+",
} as const;

export function parseButtonTopic(topic: string): string | null {
  const match = /^school\/button\/(\d{3})$/.exec(topic);
  return match?.[1] ?? null;
}
