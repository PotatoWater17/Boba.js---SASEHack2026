"use client";

import { useEffect } from "react";
import { markGroupSeen } from "@/app/actions";

export function GroupSeenOnOpen({ meetingId }: { meetingId: string }) {
  useEffect(() => {
    let on = true;

    async function tick() {
      if (!on) return;
      await markGroupSeen(meetingId);
    }

    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      on = false;
      window.clearInterval(id);
    };
  }, [meetingId]);

  return null;
}
