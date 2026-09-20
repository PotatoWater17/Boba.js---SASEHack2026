"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/avatar";
import { Modal } from "@/modal";

export type MutualConnection = {
  id: string;
  firstName: string;
  lastName: string;
  university: string | null;
  year: string | null;
  photoKey: string | null;
};

const PAGE_SIZE = 8;

export function MutualConnectionsButton({
  profileName,
  mutuals,
}: {
  profileName: string;
  mutuals: MutualConnection[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const count = mutuals.length;
  const label =
    count > 1 ? `${count} Mutual Buddies` : count === 1 ? "1 Mutual Buddy" : "Mutual Buddies";

  useEffect(() => {
    if (!open) {
      setQuery("");
      setPage(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mutuals;
    return mutuals.filter((person) => {
      const haystack = [person.firstName, person.lastName, person.year, person.university]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [mutuals, query]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="pill active profile-action-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      <Modal
        open={open}
        onClose={closeModal}
        title="Mutual Buddies"
        description={`Buddies you share with ${profileName}`}
        wide
      >
        <div className="mutual-buddies-modal">
          {count > 0 ? (
            <input
              className="field mutual-buddies-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, year, or school"
              aria-label="Search mutual buddies"
            />
          ) : null}

          {count === 0 ? (
            <p className="people-hint">No mutual buddies yet.</p>
          ) : filtered.length === 0 ? (
            <p className="people-hint">Nobody matched that search.</p>
          ) : (
            <>
              <div className="mutual-buddies-list">
                {pageItems.map((person) => (
                  <Link
                    key={person.id}
                    href={`/profile/${person.id}`}
                    className="people-hit mutual-hit"
                    onClick={closeModal}
                  >
                    <Avatar user={person} />
                    <span className="people-hit-main">
                      <b>
                        {person.firstName} {person.lastName}
                      </b>
                      <span>
                        {[person.year, person.university].filter(Boolean).join(" · ") ||
                          "StudyBuddyBoard buddy"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>

              {filtered.length > PAGE_SIZE ? (
                <div className="modal-pager">
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    Previous
                  </button>
                  <span className="modal-pager-info">
                    {rangeStart}–{rangeEnd} of {filtered.length}
                  </span>
                  <button
                    type="button"
                    className="pill"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                  >
                    Next
                  </button>
                </div>
              ) : (
                <p className="modal-pager-info">{filtered.length} mutual budd{filtered.length === 1 ? "y" : "ies"}</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
