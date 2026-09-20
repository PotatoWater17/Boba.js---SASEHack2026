"use client";

import { useEffect } from "react";

/** Keeps --nav-height in sync so hero/chat layouts account for wrapped mobile nav. */
export function NavHeightSync() {
  useEffect(() => {
    const nav = document.querySelector(".nav");
    if (!nav) return;

    const sync = () => {
      document.documentElement.style.setProperty("--nav-height", `${nav.getBoundingClientRect().height}px`);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(nav);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return null;
}
