import Link from "next/link";
import { adminResetPassword, dismissPasswordReset } from "@/app/actions";

type ResetRow = {
  id: string;
  note: string;
  createdLabel: string;
  user: {
    id: string;
    email: string;
    name: string;
    accountLabel: string;
  };
};

export function PasswordResetQueue({ requests }: { requests: ResetRow[] }) {
  if (requests.length === 0) {
    return <p className="text-muted admin-reset-empty">No open password reset requests.</p>;
  }

  return (
    <div className="admin-reset-list">
      {requests.map((req) => (
        <div key={req.id} className="admin-reset-item">
          <div className="admin-reset-head">
            <div>
              <Link href={`/profile/${req.user.id}`} className="admin-name-link">
                {req.user.name}
              </Link>
              <div className="admin-sub">
                {req.user.email} · {req.user.accountLabel} · requested {req.createdLabel}
              </div>
              {req.note ? <p className="admin-reset-note">{req.note}</p> : null}
            </div>
            <form action={dismissPasswordReset}>
              <input type="hidden" name="requestId" value={req.id} />
              <button type="submit" className="btn-ghost action-btn">
                Dismiss
              </button>
            </form>
          </div>
          <details className="admin-reset-details">
            <summary className="admin-reset-summary">Set new password</summary>
            <form action={adminResetPassword} className="admin-reset-form">
              <input type="hidden" name="requestId" value={req.id} />
              <label>
                New password
                <input className="field" name="newPassword" type="password" required minLength={8} />
              </label>
              <label>
                Confirm password
                <input className="field" name="confirmPassword" type="password" required minLength={8} />
              </label>
              <p className="admin-reset-hint">
                Share this temporary password with the user securely. They can change it after logging in.
              </p>
              <button type="submit" className="btn">
                Save password &amp; close request
              </button>
            </form>
          </details>
        </div>
      ))}
    </div>
  );
}
