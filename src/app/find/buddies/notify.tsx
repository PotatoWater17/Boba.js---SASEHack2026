"use client";

import { useEffect, useState } from "react";

export function MatchNotify({ name, detail }: { name: string; detail: string }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
      <div className="modal" style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title" style={{ marginBottom: 12 }}>
          You found a StudyBuddy!
        </h2>
        <div className="found-card" style={{ minHeight: 0, padding: 24 }}>
          <p>
            <b>{name}</b>
          </p>
          <p>{detail || "Match with potential StudyBuddies based on Preferences"}</p>
        </div>
        <button type="button" className="btn" style={{ marginTop: 18 }} onClick={() => setOpen(false)}>
          See matches
        </button>
      </div>
    </div>
  );
}
