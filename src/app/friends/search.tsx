"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { acceptFriend, addFriend, searchPeople } from "@/app/actions";
import { MAJORS } from "@/majors";
import { Modal } from "@/modal";
import { YearPicker } from "@/ui";
import { UNIVERSITIES } from "@/universities";

export function PeopleSearch() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(searchPeople, null);

  return (
    <>
      <button type="button" className="btn people-add-btn" onClick={() => setOpen(true)} aria-label="Search buddies" title="Search buddies">
        <span className="people-add-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
            <path d="M3.5 18.5c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 8v6M14 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Search buddies" wide>
        <form action={action} className="people-form">
          <input className="field" name="q" placeholder="Name or email" style={{ margin: 0 }} />
          <input
            className="field"
            name="university"
            list="people-uni"
            placeholder="School (search or type any name)"
            style={{ margin: 0 }}
          />
          <datalist id="people-uni">
            {UNIVERSITIES.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <YearPicker hideLabel allowAny compact />
          <select className="field" name="major" style={{ margin: 0 }}>
            <option value="">Any major</option>
            {MAJORS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="people-results">
          {!state?.ran ? (
            <p className="people-hint">Search by name, email, school, year, or major.</p>
          ) : state.results.length === 0 ? (
            <p className="people-hint">Nobody matched that.</p>
          ) : (
            state.results.map((u) => (
              <div key={u.id} className="people-hit">
                <Link href={`/profile/${u.id}`} className="people-hit-main">
                  <b>
                    {u.firstName} {u.lastName}
                  </b>
                  <span>
                    {[u.year, u.major, u.university].filter(Boolean).join(" · ") || u.email}
                  </span>
                </Link>
                <div className="people-hit-actions">
                  {u.status === "friends" ? (
                    <Link className="pill active" href={`/friends/${u.id}`}>
                      Message
                    </Link>
                  ) : null}
                  {u.status === "friends" ? null : u.status === "sent" ? (
                    <span className="pill">Sent</span>
                  ) : u.status === "incoming" ? (
                    <form action={acceptFriend}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="next" value="/friends" />
                      <button className="btn" type="submit">
                        Accept
                      </button>
                    </form>
                  ) : (
                    <form action={addFriend}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="next" value="/friends" />
                      <button className="btn" type="submit">
                        Add buddy
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
