"use client";

import { useEffect } from "react";
import { markGroupSeen } from "@/app/actions";

export function GroupSeenOnOpen({ meetingId }: { meetingId: string }) {
  useEffect(() => {
    void markGroupSeen(meetingId);
  }, [meetingId]);
  return null;
}
