"use client";

import { useFormStatus } from "react-dom";

export function ChatSendButton({ label = "Send" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn" type="submit" disabled={pending}>
      {pending ? "Sending…" : label}
    </button>
  );
}
