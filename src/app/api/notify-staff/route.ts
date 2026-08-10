import { NextRequest, NextResponse } from "next/server";
import { isValidClassId, resolveClassId } from "@/lib/classes/ids";
import { displayClassName } from "@/lib/classes/resolve-id";
import { SITE_ORIGIN } from "@/lib/constants";
import {
  AuthRequiredError,
  ForbiddenError,
  requireAdminIfConfigured,
} from "@/lib/firebase/verify-id-token";
import { buildTelegramDigest } from "@/lib/notify/telegram-digest";
import {
  ensureTelegramWebhook,
  routeTelegramNotify,
  sendTelegramMessage,
} from "@/lib/notify/telegram";
import { classPageUrl } from "@/lib/share/line-text";
import { supplyItemById } from "@/lib/supply/catalog";
import { formatFixDeadlineLabel } from "@/lib/time/taiwan";

type NotifyType =
  | "supply"
  | "fix"
  | "inspection"
  | "supply_ready"
  | "supply_rejected"
  | "fixed"
  | "digest";

type Body = {
  test?: boolean | string;
  type?: NotifyType;
  classId?: string;
  itemId?: string;
  itemLabel?: string;
  quantity?: number;
  applicantName?: string;
  authorName?: string;
  note?: string;
  photoUrls?: unknown;
  inspectionId?: string;
  deficiencyCount?: number;
  summary?: string;
  deadlineLabel?: string;
  date?: string;
};

function validClass(id: string) {
  return isValidClassId(id) || Boolean(resolveClassId(id));
}

function photoUrlList(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u) => String(u).trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 10);
}

async function pushLine(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_STAFF_USER_ID;
  if (!token || !to) return { skipped: true as const };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "LINE 推播失敗");
  }
  return { skipped: false as const };
}

async function pushWebhook(payload: Record<string, unknown>) {
  const url = process.env.STAFF_NOTIFY_WEBHOOK;
  if (!url) return { skipped: true as const };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "webhook 失敗");
  }
  return { skipped: false as const };
}

function channelResult(
  result:
    | { skipped: boolean; chatId?: string; sent?: string[] }
    | { skipped: boolean; error: string },
) {
  if ("error" in result) return result;
  return {
    ok: !result.skipped,
    skipped: result.skipped,
    chatId: result.chatId,
    sent: result.sent,
  };
}

async function deliver(input: {
  staffText?: string;
  teacherText?: string;
  teacherClassId?: string;
  photoUrls?: string[];
  extra: Record<string, unknown>;
}) {
  const telegram = await routeTelegramNotify({
    staffText: input.staffText,
    teacherText: input.teacherText,
    teacherClassId: input.teacherClassId,
    photoUrls: input.photoUrls,
  }).catch((err: unknown) => ({
    skipped: false as const,
    sent: [] as string[],
    error: err instanceof Error ? err.message : "Telegram 失敗",
  }));

  const line = input.staffText
    ? await pushLine(input.staffText).catch((err: unknown) => ({
        skipped: false as const,
        error: err instanceof Error ? err.message : "LINE 失敗",
      }))
    : { skipped: true as const };

  const webhook = input.staffText
    ? await pushWebhook({ ...input.extra, text: input.staffText }).catch(
        (err: unknown) => ({
          skipped: false as const,
          error: err instanceof Error ? err.message : "webhook 失敗",
        }),
      )
    : { skipped: true as const };

  return {
    ok: true,
    telegram: channelResult(telegram),
    line: channelResult(line),
    webhook: channelResult(webhook),
  };
}

async function requireAdmin(request: NextRequest) {
  try {
    await requireAdminIfConfigured(request);
  } catch (err) {
    const status =
      err instanceof AuthRequiredError || err instanceof ForbiddenError
        ? err.status
        : 401;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "需要組長登入" },
      { status },
    );
  }
  return null;
}

/**
 * 領用／改善照／巡察缺失／銷案／可領取 → Telegram（@terry_stock_bot）
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const type: NotifyType | "test" =
      body.test === true || body.test === "test"
        ? "test"
        : body.test === "digest" || body.type === "digest"
          ? "digest"
          : body.type === "fix" || (Array.isArray(body.photoUrls) && !body.itemId && !body.type)
            ? "fix"
            : body.type ?? "supply";

    if (type === "test") {
      const denied = await requireAdmin(request);
      if (denied) return denied;
      await ensureTelegramWebhook().catch(() => undefined);
      const text =
        "【嘉華體衛組】Telegram 通知測試成功。\n之後會傳到這裡：領用、打掃回報、巡察缺失、每日 8 點早報。\n導師請在班級頁按「綁定 Telegram」。";
      const telegram = await sendTelegramMessage(text).catch((err: unknown) => ({
        skipped: false as const,
        error: err instanceof Error ? err.message : "Telegram 失敗",
      }));
      return NextResponse.json({
        ok: !("error" in telegram) && !telegram.skipped,
        telegram: channelResult(telegram),
      });
    }

    if (type === "digest") {
      const denied = await requireAdmin(request);
      if (denied) return denied;
      const digest = await buildTelegramDigest();
      return NextResponse.json(
        await deliver({
          staffText: digest.text,
          extra: { type: "digest", ...digest },
        }),
      );
    }

    const classId = String(body.classId ?? "");
    if (!validClass(classId)) {
      return NextResponse.json({ error: "資料不正確" }, { status: 400 });
    }
    const className = displayClassName(classId);
    const page = classPageUrl(classId, SITE_ORIGIN);

    if (type === "fix") {
      const authorName = String(body.authorName ?? "導師").trim().slice(0, 40) || "導師";
      const note =
        String(body.note ?? "已打掃完成，請複查。").trim().slice(0, 200) ||
        "已打掃完成，請複查。";
      const photoUrls = photoUrlList(body.photoUrls);
      const staffText = [
        `【嘉華改善回報】${className}（${authorName}）`,
        note,
        `${photoUrls.length} 張佐證`,
        page,
      ].join("\n");
      return NextResponse.json(
        await deliver({
          staffText,
          photoUrls,
          extra: {
            type: "fix_report",
            classId,
            className,
            authorName,
            note,
            photoUrls,
            inspectionId: body.inspectionId ? String(body.inspectionId) : "",
          },
        }),
      );
    }

    if (type === "inspection") {
      const count = Math.max(0, Math.floor(Number(body.deficiencyCount) || 0));
      if (count <= 0) {
        return NextResponse.json({ ok: true, skipped: true, reason: "無缺失不通知" });
      }
      const deadline =
        String(body.deadlineLabel ?? "").trim() ||
        (body.date ? formatFixDeadlineLabel(String(body.date)) : "");
      const summary = String(body.summary ?? "").trim().slice(0, 200);
      const photoUrls = photoUrlList(body.photoUrls);
      const staffText = [
        `【嘉華巡察】${className} 缺失 ${count} 次`,
        deadline ? `請於${deadline}前回報` : "請盡快回報改善",
        summary,
        page,
      ]
        .filter(Boolean)
        .join("\n");
      const teacherText = [
        `【本班缺失】${className} 巡察缺失 ${count} 次`,
        deadline ? `請於${deadline}前拍照回報` : "請盡快到班級頁拍照回報",
        page,
      ].join("\n");
      return NextResponse.json(
        await deliver({
          staffText,
          teacherText,
          teacherClassId: classId,
          photoUrls,
          extra: {
            type: "inspection",
            classId,
            className,
            deficiencyCount: count,
            photoUrls,
          },
        }),
      );
    }

    if (type === "fixed") {
      const date = String(body.date ?? "").trim();
      const teacherText = [
        `【已銷案】${className}${date ? ` ${date.replaceAll("-", "/")}` : ""} 巡察已確認改善完成。`,
        page,
      ].join("\n");
      return NextResponse.json(
        await deliver({
          teacherText,
          teacherClassId: classId,
          extra: { type: "fixed", classId, className, date },
        }),
      );
    }

    if (type === "supply_ready" || type === "supply_rejected") {
      const itemLabel = String(body.itemLabel ?? "用品").trim().slice(0, 40);
      const quantity = Math.max(1, Math.min(99, Math.floor(Number(body.quantity) || 1)));
      const ready = type === "supply_ready";
      const teacherText = ready
        ? `【領用可取】${className} ${itemLabel} ×${quantity} 已可至學務處領取。\n${SITE_ORIGIN}/supply`
        : `【領用未通過】${className} ${itemLabel} ×${quantity} 未通過，請向學務處確認。\n${SITE_ORIGIN}/supply`;
      return NextResponse.json(
        await deliver({
          teacherText,
          teacherClassId: classId,
          extra: { type, classId, className, itemLabel, quantity },
        }),
      );
    }

    const itemId = String(body.itemId ?? "");
    const item = supplyItemById(itemId);
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(body.quantity) || 1)));
    const applicantName = String(body.applicantName ?? "導師").trim().slice(0, 40);
    if (!item) {
      return NextResponse.json({ error: "申請資料不正確" }, { status: 400 });
    }

    const staffText = `【嘉華領用】${className}（${applicantName}）申請${item.label} ×${quantity}，請至學務處處理。\n${SITE_ORIGIN}/supply`;
    return NextResponse.json(
      await deliver({
        staffText,
        extra: {
          type: "supply_request",
          classId,
          className,
          itemId: item.id,
          itemLabel: item.label,
          quantity,
          applicantName,
        },
      }),
    );
  } catch (err) {
    console.error("[notify-staff]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "通知失敗" },
      { status: 500 },
    );
  }
}
