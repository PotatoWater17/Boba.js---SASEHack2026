"use client";

import { useEffect, useRef } from "react";
import { markDmSeen } from "@/app/actions";

export function SeenOnOpen({ userId }: { userId: string }) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    void markDmSeen(userId);
  }, [userId]);

  return null;
}
