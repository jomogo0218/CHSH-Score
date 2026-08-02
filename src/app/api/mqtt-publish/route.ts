import { NextRequest, NextResponse } from "next/server";
import mqtt from "mqtt";
import { getAdminPublisherConfig } from "@/lib/mqtt/client";

/**
 * 伺服器端以 admin_inspector 發布 MQTT（瀏覽器不持有管理員密碼）。
 * 未設定 MQTT_ADMIN_* 時回傳 stub，不中斷評分流程。
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      topics?: string[];
      topic?: string;
      payload?: unknown;
    };

    const topics =
      body.topics ?? (body.topic ? [body.topic] : []);
    if (!topics.length || body.payload === undefined) {
      return NextResponse.json(
        { error: "需要 topics 與 payload" },
        { status: 400 },
      );
    }

    const payload =
      typeof body.payload === "string"
        ? body.payload
        : JSON.stringify(body.payload);

    const config = getAdminPublisherConfig();
    if (!config) {
      console.info("[mqtt-publish] stub：未設定 MQTT_ADMIN_*", topics);
      return NextResponse.json({
        ok: true,
        stub: true,
        message: "未設定 MQTT 管理員憑證，已略過真實廣播",
      });
    }

    await new Promise<void>((resolve, reject) => {
      const client = mqtt.connect(config.url, {
        username: config.username,
        password: config.password,
        connectTimeout: 10_000,
        reconnectPeriod: 0,
      });

      const fail = (err: Error) => {
        client.end(true);
        reject(err);
      };

      client.on("error", fail);
      client.on("connect", () => {
        let pending = topics.length;
        for (const topic of topics) {
          client.publish(topic, payload, { qos: 0 }, (err) => {
            if (err) {
              fail(err);
              return;
            }
            pending -= 1;
            if (pending <= 0) {
              client.end(false, {}, () => resolve());
            }
          });
        }
      });
    });

    return NextResponse.json({ ok: true, stub: false, topics });
  } catch (err) {
    console.error("[mqtt-publish]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "MQTT 發布失敗",
      },
      { status: 500 },
    );
  }
}
