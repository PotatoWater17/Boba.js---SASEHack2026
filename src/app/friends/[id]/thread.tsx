"use client";

import { useEffect, useRef } from "react";

export function DmThread({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  return (
    <div ref={ref} className="dm-thread">
      {children}
    </div>
  );
}
