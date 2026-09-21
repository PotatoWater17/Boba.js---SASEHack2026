"use client";

import { acceptMeetupInvite, declineMeetupInvite } from "@/app/actions";
import Link from "next/link";

export function InviteCard({
  invite,
  mine,
}: {
  invite: {
    id: string;
    status: string;
    meetingId: string;
    meeting: { subject: string; topic: string; meetDate: string; time: string; location: string };
  };
  mine: boolean;
}) {
  const topic = invite.meeting.topic.split(",")[0]?.trim();
  const when = [invite.meeting.meetDate, invite.meeting.time, invite.meeting.location].filter(Boolean).join(" · ");

  return (
    <div className="dm-invite">
      <div className="dm-invite-title">Study Buddy Group Invite</div>
      <b>
        {invite.meeting.subject}
        {topic ? ` — ${topic}` : ""}
      </b>
      {when ? <div className="dm-invite-meta">{when}</div> : null}
      {invite.status === "pending" && !mine ? (
        <div className="dm-invite-actions">
          <form action={acceptMeetupInvite}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button className="btn action-btn" type="submit">
              Accept
            </button>
          </form>
          <form action={declineMeetupInvite}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button className="btn-ghost action-btn" type="submit">
              Decline
            </button>
          </form>
        </div>
      ) : (
        <div className="dm-invite-actions">
          <span className="pill">{invite.status === "accepted" ? "Accepted" : invite.status === "declined" ? "Declined" : "Pending"}</span>
          {invite.status === "accepted" || invite.status === "pending" ? (
            <Link className="pill active" href={`/meetings/${invite.meetingId}`}>
              View Group
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
