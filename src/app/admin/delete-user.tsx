"use client";

import { useState } from "react";
import { deleteUser } from "@/app/actions";
import { Modal } from "@/modal";

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
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete user?"
        description={`Remove ${name} and all their data (profile, messages, groups they host, friendships). This cannot be undone.`}
      >
        <div className="modal-actions">
          <button type="button" className="btn-ghost action-btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <form action={deleteUser}>
            <input type="hidden" name="userId" value={userId} />
            <button type="submit" className="btn admin-delete-confirm">
              Delete user
            </button>
          </form>
        </div>
      </Modal>
    </>
  );
}
