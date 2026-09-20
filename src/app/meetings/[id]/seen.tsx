"use client";

import { useEffect, useRef } from "react";
import { markGroupSeen } from "@/app/actions";

export function GroupSeenOnOpen({ meetingId }: { meetingId: string }) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    void markGroupSeen(meetingId);
  }, [meetingId]);

  return null;
}
