"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { deleteUser } from "@/app/actions";

export function DeleteUserButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      <button type="button" className="admin-delete-btn" onClick={() => setOpen(true)}>
        Delete
      </button>
      {open && mounted
        ? createPortal(
            <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
              <div className="modal admin-delete-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="page-title" style={{ marginTop: 0, fontSize: 20 }}>
                  Delete user?
                </h2>
                <p className="admin-delete-copy">
                  Remove <b>{name}</b> and all their data (profile, messages, groups they host, friendships).
                  This cannot be undone.
                </p>
                <div className="admin-delete-actions">
                  <button type="button" className="pill" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <form action={deleteUser}>
                    <input type="hidden" name="userId" value={userId} />
                    <button type="submit" className="btn admin-delete-confirm">
                      Delete user
                    </button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
