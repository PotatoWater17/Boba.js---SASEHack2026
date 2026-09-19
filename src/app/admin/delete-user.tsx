"use client";

import { useState } from "react";
import { deleteUser } from "@/app/actions";

export function DeleteUserButton({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="admin-delete-btn" onClick={() => setOpen(true)}>
        Delete
      </button>
      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="modal admin-delete-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title" style={{ marginTop: 0, fontSize: 20 }}>
              Delete user?
            </h2>
            <p style={{ margin: "0 0 16px" }}>
              Remove <b>{name}</b> and all their data (profile, messages, groups they host, friendships). This
              cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
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
        </div>
      ) : null}
    </>
  );
}
