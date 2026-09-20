"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  centered?: boolean;
  titleId?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  centered = false,
  titleId = "app-modal-title",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalClass = ["modal", wide ? "people-modal" : "", centered ? "modal-centered" : ""]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose}>
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-text">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {description ? <p className="modal-description">{description}</p> : null}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
