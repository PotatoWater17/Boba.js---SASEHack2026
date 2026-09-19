import Image from "next/image";
import { redirect } from "next/navigation";
import { login, signup } from "@/app/actions";
import { getMe } from "@/lib";
import { UniversityPicker } from "@/ui";

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
  if (error === "exists") msg = "That email is already signed up. Login instead.";
  if (error === "match") msg = "Passwords do not match.";
  if (error === "weak") {
    msg = "Password needs 8+ characters with upper, lower, a number, and a special character.";
  }
  if (error === "fill") msg = "Please fill out all fields.";

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      {msg ? <p className="err">{msg}</p> : null}

      <header className="page-header" id="login">
        <h1 className="page-title">Login</h1>
      </header>
      <div className="box" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <Image
            src="/teddy-bear-face.jpg"
            alt=""
            width={140}
            height={140}
            style={{ borderRadius: 12, display: "block" }}
          />
          <div className="tagline" style={{ margin: "8px 0 0" }}>
            Fuel The Grind
          </div>
        </div>
        <form action={login} style={{ flex: 1 }}>
          <label>
            School email
            <input className="field" name="email" type="email" placeholder="ex. jsmith@school.edu" required />
          </label>
          <label>
            Password
            <input className="field" name="password" type="password" required />
          </label>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Login
          </button>
          <p style={{ fontSize: 13, marginTop: 10, marginBottom: 0 }}>
            Devs: ryanh@auburn.edu / RyanH · aidenb@auburn.edu / AidenB · bryanm@auburn.edu / BryanM ·
            danielk@auburn.edu / DanielK
          </p>
        </form>
      </div>

      <header className="page-header" style={{ marginTop: 28 }}>
        <h1 className="page-title">Sign up</h1>
      </header>
      <div className="box">
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
          <p style={{ fontSize: 13, color: "#666", marginTop: -6, marginBottom: 12 }}>
            Must be 8+ characters and include uppercase, lowercase, a number, and a special character.
          </p>
          <label>
            Confirm password
            <input className="field" name="confirm" type="password" required minLength={8} />
          </label>
          <button className="btn" type="submit" style={{ width: "100%" }}>
            Sign up
          </button>
        </form>
        <p style={{ marginBottom: 0 }}>
          Already have an account? <a href="#login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
