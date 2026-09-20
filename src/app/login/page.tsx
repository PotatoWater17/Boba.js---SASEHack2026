import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthPage } from "@/auth-ui";
import { getMe } from "@/lib";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const me = await getMe();
  if (me) redirect("/dashboard");

  const { error, notice } = await searchParams;
  let msg: string | null = null;
  let ok = false;
  if (error === "bad") msg = "Wrong email or password.";
  if (error === "rate") msg = "Too many attempts. Wait a few minutes and try again.";
  if (error === "fill") msg = "Please fill out all fields.";
  if (notice === "signup") {
    ok = true;
    msg = "Could not create an account with those details. Log in if you already have one, or try a different email.";
  }

  return (
    <AuthPage
      title="Login"
      footer={
        <p className="auth-switch">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      }
    >
      {msg ? <p className={ok ? "ok" : "err"}>{msg}</p> : null}
      <form action={login}>
        <label>
          School email
          <input className="field" name="email" type="email" placeholder="ex. jsmith@school.edu" required />
        </label>
        <label>
          Password
          <input className="field" name="password" type="password" required />
        </label>
        <button className="btn auth-submit" type="submit">
          Login
        </button>
        <p className="auth-link-row">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
      </form>
    </AuthPage>
  );
}
