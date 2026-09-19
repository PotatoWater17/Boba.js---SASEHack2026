import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { getMe, initials } from "@/lib";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyBuddyBoard",
  description: "Find study groups with classmates",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();

  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/">
            <b>StudyBuddyBoard</b>
          </Link>
          {me ? (
            <>
              <div className="nav-links">
                <Link className="pill" href="/">
                  About
                </Link>
                <Link className="pill" href="/dashboard">
                  Dashboard
                </Link>
                <Link className="pill" href="/profile/me">
                  Profile
                </Link>
                <Link className="pill" href="/find">
                  Find buddies
                </Link>
                <Link className="pill" href="/groups">
                  Groups I&apos;m in
                </Link>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link href={`/profile/${me.id}`} className="avatar" title="My profile">
                  {initials(me.firstName, me.lastName)}
                </Link>
                <form action={logout}>
                  <button type="submit" className="pill">
                    Log out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link className="btn" href="/login">
              Login / Sign up
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
