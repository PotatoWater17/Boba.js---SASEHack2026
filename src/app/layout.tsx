import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { logout } from "@/app/actions";
import { Avatar } from "@/avatar";
import { isUserAdmin } from "@/admin";
import { emptyInbox } from "@/inbox-types";
import { loadInbox } from "@/inbox";
import { InboxLive } from "@/inbox-live";
import { getMe } from "@/lib";
import { BrandLockup } from "@/brand-lockup";
import { NavLinks } from "@/nav";
import { NavBell } from "@/nav-bell";
import { NavHeightSync } from "@/nav-height";
import { ThemeInit, ThemeToggle } from "@/theme";
import { MessageToasts } from "@/toasts";
import "./globals.css";
import "../motion/motion.css";

export const metadata: Metadata = {
  title: "StudyBuddyBoard",
  description:
    "StudyBuddyBoard matches students by course, campus, and study style. Targeted groups, native chat, shared goals. Same exam. Same grind. Max efficiency.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeCookie = (await cookies()).get("theme")?.value;
  const me = await getMe();
  const isAdmin = me ? isUserAdmin(me) : false;
  const inbox = me ? await loadInbox(me.id) : emptyInbox();

  return (
    <html lang="en" suppressHydrationWarning data-theme={themeCookie === "dark" ? "dark" : undefined}>
      <body suppressHydrationWarning>
        <ThemeInit />
        <NavHeightSync />
        <InboxLive initial={inbox} enabled={Boolean(me)}>
          <header className="nav">
            <div className="nav-bar">
              <Link href="/" className="nav-brand">
                <BrandLockup size="sm" />
              </Link>
              <div className="nav-actions">
                {me ? <NavBell /> : null}
                <ThemeToggle />
                {me ? (
                  <div className="nav-user">
                    <Link href={`/profile/${me.id}`} title="My profile">
                      <Avatar user={me} />
                    </Link>
                    <form action={logout}>
                      <button type="submit" className="pill nav-logout" aria-label="Log out">
                        <span className="nav-logout-full">Log out</span>
                        <span className="nav-logout-short" aria-hidden="true">
                          Out
                        </span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="nav-auth-links">
                    <Link className="btn btn-ghost nav-auth-login" href="/login">
                      Log In
                    </Link>
                    <Link className="btn nav-auth-signup" href="/signup">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
            {me ? <NavLinks isAdmin={isAdmin} /> : null}
          </header>
        </InboxLive>
        <main className="site-main">{children}</main>
        {me ? <MessageToasts /> : null}
      </body>
    </html>
  );
}
