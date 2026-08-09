"use client";

import { useState } from "react";
import { lineShareHref } from "@/lib/share/line-text";

export function CopyLineButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void copy()}
        className="btn-block btn-primary px-3 py-2 text-sm"
      >
        {copied ? "已複製" : "複製給 LINE"}
      </button>
      <a
        href={lineShareHref(text)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-block px-3 py-2 text-sm"
      >
        開啟 LINE
      </a>
    </div>
  );
}
