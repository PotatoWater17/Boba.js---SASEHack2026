import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { getMe, initials } from "@/lib";
import { NavLinks } from "@/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyBuddyBoard",
  description: "Fuel the grind. Find study groups with classmates.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();

  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="nav-brand">
            <b>StudyBuddyBoard</b>
            <span className="tagline">Fuel the grind</span>
          </Link>
          {me ? (
            <>
              <NavLinks />
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
