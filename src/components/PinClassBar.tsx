"use client";

import { usePinnedClass } from "@/lib/class-pin/use-pinned-class";
import { sameClass } from "@/lib/class-pin/storage";
import { ensureNotifyPermission } from "@/lib/notify/class-alert";

export function PinClassBar({ classId }: { classId: string }) {
  const { classId: pinned, notify, pin, unpin, setNotify } = usePinnedClass();
  const mine = sameClass(classId, pinned);

  async function toggleNotify() {
    if (notify && mine) {
      setNotify(false);
      return;
    }
    if (!mine) pin(classId);
    const ok = await ensureNotifyPermission();
    setNotify(ok);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => (mine ? unpin() : pin(classId))}
        className={`btn-block px-3 py-2 text-sm ${mine ? "btn-primary" : ""}`}
      >
        {mine ? "已記住本班" : "記住本班"}
      </button>
      <button
        type="button"
        onClick={() => void toggleNotify()}
        className={`btn-block px-3 py-2 text-sm ${mine && notify ? "btn-primary" : ""}`}
      >
        {mine && notify ? "通知已開" : "本班缺失通知"}
      </button>
    </div>
  );
}
