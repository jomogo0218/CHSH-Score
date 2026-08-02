import { MQTT_TOPICS } from "@/lib/constants";

export { MQTT_TOPICS };

export type MqttRole = "school_client" | "admin_inspector";

export interface MqttConnectionConfig {
  url: string;
  username: string;
  password: string;
  role: MqttRole;
}

/**
 * 讀取瀏覽器端訂閱用設定（全校螢幕／動態牆）。
 * 真實 mqtt.js 連線於第 3 週實作。
 */
export function getSchoolClientConfig(): MqttConnectionConfig | null {
  const url = process.env.NEXT_PUBLIC_MQTT_URL;
  const username = process.env.NEXT_PUBLIC_MQTT_USER;
  const password = process.env.NEXT_PUBLIC_MQTT_PASS;
  if (!url || !username) return null;
  return {
    url,
    username,
    password: password ?? "",
    role: "school_client",
  };
}

/**
 * 組長發布用設定（僅 server 端應使用 MQTT_ADMIN_*）。
 */
export function getAdminPublisherConfig(): MqttConnectionConfig | null {
  const url = process.env.NEXT_PUBLIC_MQTT_URL;
  const username = process.env.MQTT_ADMIN_USER;
  const password = process.env.MQTT_ADMIN_PASS;
  if (!url || !username) return null;
  return {
    url,
    username,
    password: password ?? "",
    role: "admin_inspector",
  };
}

export interface MqttClientLike {
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publish: (topic: string, payload: string) => Promise<void>;
  subscribe: (
    topic: string,
    handler: (topic: string, message: string) => void,
  ) => Promise<void>;
}

/**
 * Week 1 stub：介面就緒，不連真實 EMQX。
 * Week 3 將以 mqtt.js WebSocket 實作。
 */
export function createMqttClientStub(
  config: MqttConnectionConfig | null,
): MqttClientLike {
  let connected = false;
  return {
    get connected() {
      return connected;
    },
    async connect() {
      if (!config) {
        console.info("[mqtt stub] 尚未設定 NEXT_PUBLIC_MQTT_URL，略過連線");
        return;
      }
      console.info(`[mqtt stub] would connect as ${config.role} → ${config.url}`);
      connected = true;
    },
    async disconnect() {
      connected = false;
    },
    async publish(topic, payload) {
      console.info(`[mqtt stub] publish ${topic}`, payload.slice(0, 120));
    },
    async subscribe(topic) {
      console.info(`[mqtt stub] subscribe ${topic}`);
    },
  };
}
