"use client";

import { useMemo, useState } from "react";
import { inviteToMeetup } from "@/app/actions";
import { Avatar } from "@/avatar";

type Buddy = {
  id: string;
  firstName: string;
  lastName: string;
  photoKey?: string | null;
  year?: string;
  major?: string;
};

const SUGGESTED_COUNT = 3;

function matchesBuddy(b: Buddy, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${b.firstName} ${b.lastName} ${b.year ?? ""} ${b.major ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function InviteRow({
  buddy,
  meetingId,
  pending,
}: {
  buddy: Buddy;
  meetingId: string;
  pending: boolean;
}) {
  return (
    <div className="invite-row">
      <div className="invite-row-main">
        <Avatar user={buddy} style={{ width: 36, height: 36, fontSize: 12 }} />
        <span>
          <b>
            {buddy.firstName} {buddy.lastName}
          </b>
          <span className="invite-row-meta">
            {[buddy.year, buddy.major].filter(Boolean).join(" · ") || "Buddy"}
          </span>
        </span>
      </div>
      {pending ? (
        <span className="pill">Invited</span>
      ) : (
        <form action={inviteToMeetup}>
          <input type="hidden" name="meetingId" value={meetingId} />
          <input type="hidden" name="userId" value={buddy.id} />
          <input type="hidden" name="next" value={`/meetings/${meetingId}`} />
          <button className="btn" type="submit">
            Invite
          </button>
        </form>
      )}
    </div>
  );
}

export function InviteBuddies({
  meetingId,
  buddies,
  pendingIds,
  ownerOnly = false,
}: {
  meetingId: string;
  buddies: Buddy[];
  pendingIds: string[];
  ownerOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    if (searching) {
      return buddies.filter((b) => matchesBuddy(b, query));
    }

    return [...buddies]
      .sort((a, b) => {
        const aPending = pendingIds.includes(a.id) ? 1 : 0;
        const bPending = pendingIds.includes(b.id) ? 1 : 0;
        if (aPending !== bPending) return aPending - bPending;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      })
      .slice(0, SUGGESTED_COUNT);
  }, [buddies, pendingIds, query, searching]);

  if (buddies.length === 0) {
    return (
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Invite buddies</h3>
        <p className="text-muted" style={{ margin: 0 }}>
          No buddies left to invite. Add buddies from Find Your Buddies first.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0 }}>Invite buddies</h3>
      <p className="text-muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
        {ownerOnly
          ? "Private group — only you can invite buddies. They'll get a chat invite and have to accept it."
          : "They'll get a chat invite and have to accept it."}
      </p>
      <input
        type="search"
        className="field invite-search"
        placeholder="Search by name, year, or major"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search buddies to invite"
      />
      {!searching && buddies.length > SUGGESTED_COUNT ? (
        <p className="text-muted invite-search-hint">
          Showing {Math.min(SUGGESTED_COUNT, buddies.length)} suggestions · search for more
        </p>
      ) : null}
      {searching && visible.length === 0 ? (
        <p className="text-muted invite-search-hint">No buddies match that.</p>
      ) : (
        <div className="invite-list">
          {visible.map((b) => (
            <InviteRow
              key={b.id}
              buddy={b}
              meetingId={meetingId}
              pending={pendingIds.includes(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
