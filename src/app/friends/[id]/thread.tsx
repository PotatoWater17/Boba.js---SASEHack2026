"use client";

import { useEffect, useRef } from "react";

export function DmThread({
  children,
  messageCount,
}: {
  children: React.ReactNode;
  messageCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount]);

  return (
    <div ref={ref} className="dm-thread">
      {children}
    </div>
  );
}
