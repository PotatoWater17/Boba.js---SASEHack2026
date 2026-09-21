"use client";

import { useEffect } from "react";
import { markDmSeen } from "@/app/actions";

export function SeenOnOpen({ userId }: { userId: string }) {
  useEffect(() => {
    let on = true;

    async function tick() {
      if (!on) return;
      await markDmSeen(userId);
    }

    void tick();
    const id = window.setInterval(() => void tick(), 2500);
    return () => {
      on = false;
      window.clearInterval(id);
    };
  }, [userId]);

  return null;
}
