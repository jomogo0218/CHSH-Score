import { SITE_ORIGIN } from "@/lib/constants";
import { resolveClassId } from "@/lib/classes/ids";

export function publicOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return SITE_ORIGIN;
}

export function classPageUrl(classId: string, origin = publicOrigin()) {
  const id = resolveClassId(classId) ?? classId;
  return `${origin.replace(/\/$/, "")}/classes/${id}`;
}

export function buildFixLineText(input: {
  className: string;
  classId: string;
  deficiencyCount: number;
  deadlineLabel?: string;
}) {
  const url = classPageUrl(input.classId);
  if (input.deficiencyCount <= 0) {
    return `【嘉華體衛組】${input.className} 今日巡察無缺失。\n${url}`;
  }
  const due = input.deadlineLabel ? `請於${input.deadlineLabel}前回報改善。` : "請盡快回報改善。";
  return `【嘉華體衛組】${input.className} 有缺失（${input.deficiencyCount} 次），${due}\n${url}`;
}

export function lineShareHref(text: string) {
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
}
