import { joinMeeting } from "@/app/actions";

export function JoinGroupButton({
  meetingId,
  requireApproval,
  pending,
  full,
  isPrivate,
}: {
  meetingId: string;
  requireApproval: boolean;
  pending: boolean;
  full: boolean;
  isPrivate?: boolean;
}) {
  if (isPrivate) {
    return (
      <p className="text-muted meet-private-join-note" style={{ margin: 0 }}>
        Private group — ask the owner for an invite to join.
      </p>
    );
  }
  if (full) {
    return <span className="pill">Group full</span>;
  }
  if (pending) {
    return <span className="pill active">Join request pending</span>;
  }
  return (
    <form action={joinMeeting}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <button className="btn" type="submit">
        {requireApproval ? "Request to join" : "Join group"}
      </button>
    </form>
  );
}
