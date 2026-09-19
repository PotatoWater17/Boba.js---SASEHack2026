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

export function InviteBuddies({
  meetingId,
  buddies,
  pendingIds,
}: {
  meetingId: string;
  buddies: Buddy[];
  pendingIds: string[];
}) {
  if (buddies.length === 0) {
    return (
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Invite buddies</h3>
        <p className="text-muted" style={{ margin: 0 }}>
          No buddies left to invite. Add people from Find your buddies first.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0 }}>Invite buddies</h3>
      <p className="text-muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
        They&apos;ll get a chat invite and have to accept it.
      </p>
      <div className="invite-list">
        {buddies.map((b) => (
          <div key={b.id} className="invite-row">
            <div className="invite-row-main">
              <Avatar user={b} style={{ width: 36, height: 36, fontSize: 12 }} />
              <span>
                <b>
                  {b.firstName} {b.lastName}
                </b>
                <span className="invite-row-meta">
                  {[b.year, b.major].filter(Boolean).join(" · ") || "Buddy"}
                </span>
              </span>
            </div>
            {pendingIds.includes(b.id) ? (
              <span className="pill">Invited</span>
            ) : (
              <form action={inviteToMeetup}>
                <input type="hidden" name="meetingId" value={meetingId} />
                <input type="hidden" name="userId" value={b.id} />
                <input type="hidden" name="next" value={`/meetings/${meetingId}`} />
                <button className="btn" type="submit">
                  Invite
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
