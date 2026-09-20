"use client";

import { useState } from "react";

export function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {}
    }
  }

  return (
    <button type="button" className="dm-copy-btn" onClick={() => void copy()} aria-label="Copy message">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
