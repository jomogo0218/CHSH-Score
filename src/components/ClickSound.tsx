"use client";

import { useEffect } from "react";
import { playClickSound } from "@/lib/ui/click-sound";

function isClickTarget(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  const el = node.closest(".btn-block, [data-click-sound]");
  if (!el) return false;
  if (el.matches(":disabled, [aria-disabled='true']")) return false;
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  return true;
}

/** 立體方塊按鈕按下時播放喀答音 */
export function ClickSound() {
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      if (!isClickTarget(event.target)) return;
      playClickSound();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  return null;
}
