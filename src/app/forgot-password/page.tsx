import Link from "next/link";
import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/app/actions";
import { AuthPage } from "@/auth-ui";
import { getMe } from "@/lib";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const me = await getMe();
  if (me) redirect("/dashboard");

  const { sent, error } = await searchParams;
  let msg: string | null = null;
  let ok = false;
  if (sent === "1") {
    ok = true;
    msg =
      "If that email is registered, an admin will review your request and help reset your password.";
  }
  if (error === "fill") msg = "Enter your school email to request a password reset.";

  return (
    <AuthPage
      brand="lockup"
      title="Forgot Password"
      footer={
        <p className="auth-switch">
          Remembered it? <Link href="/login">Back to login</Link>
        </p>
      }
    >
      {msg ? <p className={ok ? "ok" : "err"}>{msg}</p> : null}
      <p className="auth-lead">
        Submit your school email and an admin will set a new temporary password for you.
      </p>
      <form action={requestPasswordReset}>
        <label>
          School email
          <input className="field" name="email" type="email" placeholder="ex. jsmith@school.edu" required />
        </label>
        <label>
          Note for admin (optional)
          <textarea
            className="field"
            name="note"
            rows={3}
            maxLength={300}
            placeholder="Anything that helps verify your account"
          />
        </label>
        <button className="btn auth-submit" type="submit">
          Request password reset
        </button>
      </form>
    </AuthPage>
  );
}
