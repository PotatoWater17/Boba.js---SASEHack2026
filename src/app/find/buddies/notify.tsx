"use client";

import { useState } from "react";
import { buddyMatchReasonLabel } from "@/buddy-match-display";
import { Modal } from "@/modal";

export function MatchNotify({ name, reasons }: { name: string; reasons: string[] }) {
  const [open, setOpen] = useState(true);
  const labels = reasons.map(buddyMatchReasonLabel);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="You Found a Buddy!" centered>
      <div className="found-card" style={{ minHeight: 0, padding: 24 }}>
        <p>
          <b>{name}</b>
        </p>
        {labels.length ? (
          <div className="match-reasons match-reasons-modal">
            <p className="match-reasons-heading">Why you match</p>
            <ul className="match-reasons-list">
              {labels.slice(0, 5).map((label, i) => (
                <li key={`${i}-${label}`}>{label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Matched based on your exam prep and profile.</p>
        )}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          See Matches
        </button>
      </div>
    </Modal>
  );
}
