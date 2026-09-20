import Link from "next/link";
import { redirect } from "next/navigation";
import { signup } from "@/app/actions";
import { AuthPage } from "@/auth-ui";
import { getMe } from "@/lib";
import { UniversityPicker } from "@/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getMe();
  if (me) redirect("/dashboard");

  const { error } = await searchParams;
  let msg: string | null = null;
  if (error === "match") msg = "Passwords do not match.";
  if (error === "weak") {
    msg = "Password needs 8+ characters with upper, lower, a number, and a special character.";
  }
  if (error === "fill") msg = "Please fill out all fields.";

  return (
    <AuthPage
      title="Sign Up"
      footer={
        <p className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      }
    >
      {msg ? <p className="err">{msg}</p> : null}
      <form action={signup}>
        <label>
          First Name
          <input className="field" name="firstName" required />
        </label>
        <label>
          Last Name
          <input className="field" name="lastName" required />
        </label>
        <UniversityPicker />
        <label>
          Enter your school email
          <input className="field" name="email" type="email" placeholder="ex. jsmith@school.edu" required />
        </label>
        <label>
          Enter your password
          <input className="field" name="password" type="password" required minLength={8} />
        </label>
        <p className="auth-password-hint">
          Must be 8+ characters and include uppercase, lowercase, a number, and a special character.
        </p>
        <label>
          Confirm password
          <input className="field" name="confirm" type="password" required minLength={8} />
        </label>
        <button className="btn auth-submit" type="submit">
          Sign Up
        </button>
      </form>
    </AuthPage>
  );
}
