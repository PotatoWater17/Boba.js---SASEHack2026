import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { logout } from "@/app/actions";
import { Avatar } from "@/avatar";
import { isUserAdmin } from "@/admin";
import { getMe, prisma } from "@/lib";
import { BrandLockup } from "@/brand-lockup";
import { NavLinks } from "@/nav";
import { NavHeightSync } from "@/nav-height";
import { ThemeInit, ThemeToggle } from "@/theme";
import { MessageToasts } from "@/toasts";
import "./globals.css";
import "../motion/motion.css";

export const metadata: Metadata = {
  title: "StudyBuddyBoard",
  description: "Fuel the grind. Find study groups and buddies on campus.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeCookie = (await cookies()).get("theme")?.value;
  const me = await getMe();
  const isAdmin = me ? isUserAdmin(me) : false;
  const friendNotices = me
    ? (await prisma.directMessage.count({ where: { toId: me.id, seen: false } })) +
      (await prisma.reactionNotice.count({ where: { userId: me.id, seen: false, dmId: { not: "" } } }))
    : 0;

  let groupNotices = 0;
  if (me) {
    groupNotices = await prisma.reactionNotice.count({
      where: { userId: me.id, seen: false, meetingId: { not: "" } },
    });
    const memberships = await prisma.member.findMany({
      where: { userId: me.id },
      select: { meetingId: true, lastReadAt: true },
    });
    if (memberships.length) {
      const msgs = await prisma.message.findMany({
        where: {
          meetingId: { in: memberships.map((m) => m.meetingId) },
          userId: { not: me.id },
        },
        select: { meetingId: true, createdAt: true },
      });
      const lastRead = new Map(memberships.map((m) => [m.meetingId, m.lastReadAt.getTime()]));
      groupNotices += msgs.filter((msg) => msg.createdAt.getTime() > (lastRead.get(msg.meetingId) || 0)).length;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning data-theme={themeCookie === "dark" ? "dark" : undefined}>
      <body suppressHydrationWarning>
        <ThemeInit />
        <NavHeightSync />
        <header className="nav">
          <div className="nav-bar">
            <Link href="/" className="nav-brand">
              <BrandLockup size="sm" />
            </Link>
            <div className="nav-actions">
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
                    Log in
                  </Link>
                  <Link className="btn nav-auth-signup" href="/signup">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
          {me ? (
            <NavLinks friendNotices={friendNotices} groupNotices={groupNotices} isAdmin={isAdmin} />
          ) : null}
        </header>
        <main className="site-main">{children}</main>
        {me ? <MessageToasts /> : null}
      </body>
    </html>
  );
}
