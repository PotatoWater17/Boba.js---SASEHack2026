import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { AuthPage } from "@/auth-ui";
import { getMe } from "@/lib";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getMe();
  if (me) redirect("/dashboard");

  const { error } = await searchParams;
  let msg: string | null = null;
  if (error === "bad") msg = "Wrong email or password.";
  if (error === "exists") msg = "That email is already signed up.";
  if (error === "fill") msg = "Please fill out all fields.";

  return (
    <AuthPage
      brand="lockup"
      title="Login"
      footer={
        <p className="auth-switch">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </p>
      }
    >
      {msg ? <p className="err">{msg}</p> : null}
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
        <p className="auth-dev-hint">
          Devs: ryanh@auburn.edu / RyanH · aidenb@auburn.edu / AidenB · bryanm@auburn.edu / BryanM ·
          danielk@auburn.edu / DanielK
        </p>
      </form>
    </AuthPage>
  );
}
