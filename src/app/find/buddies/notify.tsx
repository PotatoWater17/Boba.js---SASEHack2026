"use client";

import { useState } from "react";
import { Modal } from "@/modal";

export function MatchNotify({ name, detail }: { name: string; detail: string }) {
  const [open, setOpen] = useState(true);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="You found a StudyBuddy!" centered>
      <div className="found-card" style={{ minHeight: 0, padding: 24 }}>
        <p>
          <b>{name}</b>
        </p>
        <p>{detail || "Match with potential StudyBuddies based on Preferences"}</p>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          See matches
        </button>
      </div>
    </Modal>
  );
}
