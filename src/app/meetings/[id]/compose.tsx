"use client";

import { sendMessage } from "@/app/actions";
import { ChatCompose } from "@/chat-compose";

export function GroupChatCompose({ meetingId }: { meetingId: string }) {
  return <ChatCompose action={sendMessage} hidden={{ meetingId }} placeholder="Type a chat..." />;
}
