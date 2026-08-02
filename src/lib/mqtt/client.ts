import { MQTT_TOPICS } from "@/lib/constants";

export { MQTT_TOPICS };

export type MqttRole = "school_client" | "admin_inspector";

export interface MqttConnectionConfig {
  url: string;
  username: string;
  password: string;
  role: MqttRole;
}

/** 瀏覽器訂閱用（school_client） */
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

/** 伺服器端發布用（MQTT_ADMIN_*，勿暴露到前端） */
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

export function isMqttConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MQTT_URL);
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

function makeStubClient(
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
      console.info(
        `[mqtt stub] would connect as ${config.role} → ${config.url}`,
      );
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

/**
 * 建立 MQTT 客戶端：有 URL／帳密則用 mqtt.js WebSocket；否則 stub。
 * 瀏覽器端請用 getSchoolClientConfig()（訂閱）；發布請走 /api/mqtt-publish。
 */
export function createMqttClient(
  config: MqttConnectionConfig | null,
): MqttClientLike {
  if (!config?.url) {
    return makeStubClient(null);
  }

  // 動態 import 避免 SSR 直接載入
  let client: import("mqtt").MqttClient | null = null;
  let connected = false;
  const handlers = new Map<
    string,
    Set<(topic: string, message: string) => void>
  >();

  return {
    get connected() {
      return connected;
    },
    async connect() {
      if (client?.connected) {
        connected = true;
        return;
      }
      const mqtt = await import("mqtt");
      await new Promise<void>((resolve, reject) => {
        client = mqtt.connect(config.url, {
          username: config.username,
          password: config.password,
          reconnectPeriod: 4000,
          connectTimeout: 10_000,
          clean: true,
        });
        const onConnect = () => {
          connected = true;
          cleanup();
          resolve();
        };
        const onError = (err: Error) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          client?.off("connect", onConnect);
          client?.off("error", onError);
        };
        client.on("connect", onConnect);
        client.on("error", onError);
        client.on("message", (topic, buf) => {
          const text = buf.toString();
          const set = handlers.get(topic);
          if (set) {
            for (const h of set) h(topic, text);
          }
        });
        client.on("close", () => {
          connected = false;
        });
      });
    },
    async disconnect() {
      if (!client) return;
      await new Promise<void>((resolve) => {
        client?.end(false, {}, () => resolve());
      });
      client = null;
      connected = false;
    },
    async publish(topic, payload) {
      if (!client?.connected) {
        console.info("[mqtt] publish skipped（未連線）", topic);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        client!.publish(topic, payload, { qos: 0 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
    async subscribe(topic, handler) {
      if (!handlers.has(topic)) handlers.set(topic, new Set());
      handlers.get(topic)!.add(handler);
      if (!client?.connected) {
        console.info("[mqtt] subscribe deferred until connect", topic);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        client!.subscribe(topic, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}

/** 相容舊名稱 */
export const createMqttClientStub = createMqttClient;
