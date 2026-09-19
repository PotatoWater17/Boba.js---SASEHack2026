import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { logout } from "@/app/actions";
import { Avatar } from "@/avatar";
import { getMe, prisma } from "@/lib";
import { NavLinks } from "@/nav";
import { MessageToasts } from "@/toasts";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyBuddyBoard",
  description: "Fuel the grind. Find study groups with classmates.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const friendNotices = me
    ? await prisma.directMessage.count({ where: { toId: me.id, seen: false } })
    : 0;

  let groupNotices = 0;
  if (me) {
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
      groupNotices = msgs.filter((msg) => msg.createdAt.getTime() > (lastRead.get(msg.meetingId) || 0)).length;
    }
  }

  return (
    <html lang="en">
      <body>
        <header className="nav">
          <Link href="/" className="nav-brand">
            <b>StudyBuddyBoard</b>
            <span className="tagline">Fuel The Grind</span>
          </Link>
          {me ? (
            <>
              <NavLinks friendNotices={friendNotices} groupNotices={groupNotices} />
              <div className="nav-user">
                <Link href={`/profile/${me.id}`} title="My profile">
                  <Avatar user={me} />
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
        {me ? <MessageToasts /> : null}
      </body>
    </html>
  );
}
