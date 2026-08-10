/** 前端事件通知（失敗不擋流程） */
export function pushNotify(payload: Record<string, unknown>) {
  void fetch("/api/notify-staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

/** @deprecated 使用 pushNotify */
export const pushStaffNotify = pushNotify;
