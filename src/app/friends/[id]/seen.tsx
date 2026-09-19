"use client";

import { useEffect } from "react";
import { markDmSeen } from "@/app/actions";

export function SeenOnOpen({ userId }: { userId: string }) {
  useEffect(() => {
    void markDmSeen(userId);
  }, [userId]);
  return null;
}
