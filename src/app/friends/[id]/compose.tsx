"use client";

import { sendDm } from "@/app/actions";
import { ChatCompose } from "@/chat-compose";

export function DmCompose({ userId }: { userId: string }) {
  return <ChatCompose action={sendDm} hidden={{ userId }} placeholder="Type a message..." />;
}
