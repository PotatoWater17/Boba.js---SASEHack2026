import Link from "next/link";
import { approveJoinRequest, declineJoinRequest } from "@/app/actions";
import { Avatar } from "@/avatar";

export function JoinRequestsPanel({
  meetingId,
  requests,
}: {
  meetingId: string;
  requests: {
    id: string;
    user: { id: string; firstName: string; lastName: string; photoKey: string; year: string; major: string };
  }[];
}) {
  if (!requests.length) return null;

  return (
    <section className="meet-join-requests page-section">
      <h2 className="page-section-title">Join Requests</h2>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        {requests.map((req) => (
          <div key={req.id} className="meet-join-request-row">
            <Link href={`/profile/${req.user.id}`} className="meet-join-request-user">
              <Avatar user={req.user} style={{ width: 40, height: 40, fontSize: 14 }} />
              <span>
                <b>
                  {req.user.firstName} {req.user.lastName}
                </b>
                {req.user.year || req.user.major ? (
                  <span className="text-muted" style={{ display: "block", fontSize: 13 }}>
                    {[req.user.year, req.user.major].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </span>
            </Link>
            <div className="meet-join-request-actions">
              <form action={approveJoinRequest}>
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="meetingId" value={meetingId} />
                <button type="submit" className="btn action-btn">
                  Approve
                </button>
              </form>
              <form action={declineJoinRequest}>
                <input type="hidden" name="requestId" value={req.id} />
                <input type="hidden" name="meetingId" value={meetingId} />
                <button type="submit" className="btn-ghost action-btn">
                  Decline
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
