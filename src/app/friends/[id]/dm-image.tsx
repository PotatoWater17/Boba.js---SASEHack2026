"use client";

import { useEffect, useState } from "react";

export function DmImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className="dm-pic-btn" onClick={() => setOpen(true)} aria-label="View image">
        <img className="dm-pic" src={src} alt={alt} />
      </button>
      {open ? (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <button type="button" className="lightbox-x" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
          <img className="lightbox-img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
