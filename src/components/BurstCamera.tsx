"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAPTURE_MAX_EDGE,
  captureJpegFromVideo,
  formatBytes,
} from "@/lib/image/compress";

type Shot = {
  id: string;
  preview: string;
  bytes: number;
};

export type BurstCameraItem = {
  id: string;
  label: string;
  remaining?: number;
};

type Props = {
  open: boolean;
  title?: string;
  remaining?: number;
  onClose: () => void;
  onCapture: (file: File) => void | Promise<void>;
  /** getUserMedia 失敗時改走系統相機 */
  onFallback?: () => void;
  doneLabel?: string;
  /** 巡察連拍時可切換評分項目，不必關相機 */
  items?: BurstCameraItem[];
  activeItemId?: string;
  onItemChange?: (id: string) => void;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * 連拍相機：鏡頭保持開啟，每按一次快門就截一張已縮小的 JPEG。
 */
export function BurstCamera({
  open,
  title,
  remaining,
  onClose,
  onCapture,
  onFallback,
  doneLabel = "完成",
  items,
  activeItemId,
  onItemChange,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  const left = remaining === undefined ? Infinity : Math.max(0, remaining);

  const start = useCallback(async (mode: "environment" | "user") => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280, max: 1600 },
          height: { ideal: 720, max: 1200 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        return;
      }
      video.srcObject = stream;
      await video.play();
      setReady(true);
    } catch (err) {
      const msg =
        err instanceof Error && /NotAllowed|Permission/i.test(err.name + err.message)
          ? "請允許使用相機，或改用系統相機。"
          : err instanceof Error
            ? err.message
            : "無法開啟相機";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("這台裝置不支援連拍相機，請改用系統相機。");
      return;
    }
    void start(facing);
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open, facing, start]);

  useEffect(() => {
    if (!open) {
      setShots((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.preview));
        return [];
      });
      setReady(false);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function onShutter() {
    const video = videoRef.current;
    if (!video || !ready || busy || left <= 0) return;
    setBusy(true);
    try {
      const file = await captureJpegFromVideo(video, CAPTURE_MAX_EDGE);
      const preview = URL.createObjectURL(file);
      setShots((prev) => [
        ...prev,
        { id: `${Date.now()}_${prev.length}`, preview, bytes: file.size },
      ]);
      try {
        navigator.vibrate?.(30);
      } catch {
        // ignore
      }
      await onCapture(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "拍照失敗");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-sm font-semibold">
          {title ?? "連拍"}
          {Number.isFinite(left) ? (
            <span className="ml-2 text-xs font-normal text-white/70">
              還可拍 {left} 張
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="btn-block btn-nav btn-on-dark"
        >
          {doneLabel}
        </button>
      </header>

      {items && items.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {items.map((it) => {
            const active = it.id === activeItemId;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onItemChange?.(it.id)}
                className={`btn-block btn-nav shrink-0 text-xs ${
                  active ? "btn-primary" : "btn-on-dark"
                }`}
              >
                {it.label}
                {typeof it.remaining === "number" ? (
                  <span className="ml-1 font-normal opacity-80">
                    {it.remaining}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!ready && !error ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
            開啟相機中…
          </p>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
            <p className="text-sm">{error}</p>
            {onFallback ? (
              <button
                type="button"
                onClick={onFallback}
                className="btn-block btn-primary px-4 py-2 text-sm"
              >
                改用系統相機
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {shots.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2">
          {shots.map((s) => (
            <div key={s.id} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.preview}
                alt=""
                className="h-14 w-14 rounded-md object-cover"
              />
              <p className="mt-0.5 text-center text-[10px] text-white/70">
                {formatBytes(s.bytes)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-3 py-1 text-center text-[11px] text-white/70">
          可連續拍照，每張當場縮小畫質；拍完按「完成」。
        </p>
      )}

      <footer className="flex items-center justify-center gap-8 px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={() =>
            setFacing((f) => (f === "environment" ? "user" : "environment"))
          }
          className="btn-block btn-nav btn-on-dark text-xs"
        >
          翻轉
        </button>
        <button
          type="button"
          disabled={!ready || busy || left <= 0}
          onClick={() => void onShutter()}
          data-click-sound
          className="h-16 w-16 rounded-full border-4 border-white bg-mint disabled:opacity-40"
          aria-label="拍照"
        />
        <span className="w-12 text-center text-xs text-white/80">
          {shots.length}
        </span>
      </footer>
    </div>
  );
}
