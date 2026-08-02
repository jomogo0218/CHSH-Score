import { NextRequest, NextResponse } from "next/server";
import mqtt from "mqtt";
import {
  AuthRequiredError,
  requireFirebaseUserIfConfigured,
} from "@/lib/firebase/verify-id-token";
import { getAdminPublisherConfig } from "@/lib/mqtt/client";

/**
 * 伺服器端以 admin_inspector 發布 MQTT。
 * Firebase 已設定時必須登入；未設定 MQTT 時回 stub。
 */
export async function POST(request: NextRequest) {
  try {
    await requireFirebaseUserIfConfigured(request);

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

    // 僅允許學校 live_feed／班級 channel，避免被當開放 relay
    for (const topic of topics) {
      if (
        topic !== "school/clean/live_feed" &&
        !/^school\/clean\/class\/[A-Za-z0-9_-]+$/.test(topic)
      ) {
        return NextResponse.json(
          { error: `不允許的 topic：${topic}` },
          { status: 400 },
        );
      }
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
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
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
