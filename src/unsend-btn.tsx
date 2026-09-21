"use client";

import { useState } from "react";
import { unsendDm, unsendMessage } from "@/app/actions";
import { isNextRedirect } from "@/next-redirect";

export function UnsendButton({
  kind,
  messageId,
  userId,
  meetingId,
  onOptimistic,
  onRevert,
}: {
  kind: "dm" | "group";
  messageId: string;
  userId?: string;
  meetingId?: string;
  onOptimistic?: () => void;
  onRevert?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onUnsend() {
    if (busy) return;
    setBusy(true);
    onOptimistic?.();
    const fd = new FormData();
    fd.set("messageId", messageId);
    if (userId) fd.set("userId", userId);
    if (meetingId) fd.set("meetingId", meetingId);
    try {
      const result = await (kind === "dm" ? unsendDm(fd) : unsendMessage(fd));
      if (result && "error" in result && result.error) {
        onRevert?.();
      }
    } catch (err) {
      if (isNextRedirect(err)) throw err;
      onRevert?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="dm-unsend-btn" onClick={() => void onUnsend()} disabled={busy}>
      {busy ? "…" : "Unsend"}
    </button>
  );
}
