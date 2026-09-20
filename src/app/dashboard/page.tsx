import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, removeFriend } from "@/app/actions";
import { Avatar } from "@/avatar";
import { DashCalendar } from "./calendar";
import { blockedUserIds, formatMeetDate, getMe, prisma, ymd } from "@/lib";

function calHref(year: number, month: number) {
  const d = new Date(year, month, 1);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
    return "/dashboard#cal";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `/dashboard?cal=${y}-${m}#cal`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetings = await prisma.meeting.findMany({
    where: { members: { some: { userId: me.id } } },
    include: { members: { include: { user: true } } },
    orderBy: [{ meetDate: "asc" }, { time: "asc" }],
  });

  const now = new Date();
  const today = ymd(now);
  const upcoming = meetings.filter((m) => !m.meetDate || m.meetDate >= today);
  const hosting = meetings.filter((m) => m.hostId === me.id).length;

  // this week = today through next 6 days
  const weekEndDate = new Date(now);
  weekEndDate.setDate(now.getDate() + 6);
  const weekEnd = ymd(weekEndDate);
  const thisWeek = upcoming.filter((m) => m.meetDate && m.meetDate <= weekEnd);

  const blocked = await blockedUserIds(me.id);
  const friendRows = await prisma.friendship.findMany({
    where: {
      OR: [{ fromId: me.id }, { toId: me.id }],
    },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });
  const friends = friendRows
    .filter((row) => row.status === "accepted")
    .map((row) => (row.fromId === me.id ? row.to : row.from))
    .filter((u) => !blocked.has(u.id));
  const incoming = friendRows.filter(
    (row) => row.status === "pending" && row.toId === me.id && !blocked.has(row.fromId),
  );

  const friendIds = friends.map((f) => f.id);
  const interactionScore = new Map<string, number>();
  for (const id of friendIds) interactionScore.set(id, 0);

  if (friendIds.length) {
    const dms = await prisma.directMessage.findMany({
      where: {
        OR: [
          { fromId: me.id, toId: { in: friendIds } },
          { fromId: { in: friendIds }, toId: me.id },
        ],
      },
      select: { id: true, fromId: true, toId: true },
    });
    for (const dm of dms) {
      const otherId = dm.fromId === me.id ? dm.toId : dm.fromId;
      interactionScore.set(otherId, (interactionScore.get(otherId) || 0) + 1);
    }

    const dmIds = dms.map((d) => d.id);
    if (dmIds.length) {
      const reacts = await prisma.dmReaction.findMany({
        where: { dmId: { in: dmIds } },
        include: { dm: { select: { fromId: true, toId: true } } },
      });
      for (const r of reacts) {
        const otherId = r.dm.fromId === me.id ? r.dm.toId : r.dm.fromId;
        if (friendIds.includes(otherId)) {
          interactionScore.set(otherId, (interactionScore.get(otherId) || 0) + 1);
        }
      }
    }
  }

  const topFriends = [...friends]
    .sort((a, b) => {
      const diff = (interactionScore.get(b.id) || 0) - (interactionScore.get(a.id) || 0);
      if (diff !== 0) return diff;
      return a.firstName.localeCompare(b.firstName);
    })
    .slice(0, 5);

  const { cal } = await searchParams;
  const calMatch = /^(\d{4})-(\d{2})$/.exec(cal || "");
  let year = now.getFullYear();
  let month = now.getMonth();
  if (calMatch) {
    const y = Number(calMatch[1]);
    const m = Number(calMatch[2]) - 1;
    if (m >= 0 && m <= 11 && y >= 2020 && y <= now.getFullYear() + 3) {
      year = y;
      month = m;
    }
  }
  const viewing = new Date(year, month, 1);
  const isThisMonth = year === now.getFullYear() && month === now.getMonth();
  const monthName = viewing.toLocaleString("en-US", { month: "long", year: "numeric" });
  const calMeets = meetings
    .filter((m) => m.meetDate)
    .map((m) => ({
      id: m.id,
      subject: m.subject,
      topic: m.topic || "",
      meetDate: m.meetDate,
      time: m.time,
      location: m.location,
      size: m.members.length,
      maxSize: m.maxSize,
    }));

  return (
    <div className="page motion-page-enter">
      <header className="page-header">
        <h1 className="page-title">Hey {me.firstName}</h1>
        <p>Your study buddy groups and what&apos;s coming up.</p>
      </header>

      <div className="dash-stats">
        <div className="dash-stat">
          <strong>{meetings.length}</strong>
          <span>Buddy Groups</span>
        </div>
        <div className="dash-stat">
          <strong>{upcoming.length}</strong>
          <span>Upcoming</span>
        </div>
        <div className="dash-stat">
          <strong>{thisWeek.length}</strong>
          <span>This Week</span>
        </div>
        <div className="dash-stat">
          <strong>{hosting}</strong>
          <span>Hosting</span>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="page-section-title">My Buddies</h2>
          <Link href="/friends" className="dash-hint" style={{ textDecoration: "underline" }}>
            {friends.length} buddies · View All Chats
          </Link>
        </div>
        {incoming.length > 0 ? (
          <div className="dash-meet-list" style={{ marginBottom: 14 }}>
            {incoming.map((row, i) => (
              <div
                key={row.id}
                className="dash-meet motion-stagger-item"
                style={{ ["--motion-delay" as string]: `${i * 45}ms` }}
              >
                <Link href={`/profile/${row.from.id}`} className="dash-friend-link">
                  <Avatar user={row.from} style={{ width: 36, height: 36, fontSize: 12 }} />
                  <div className="dash-meet-main">
                    <b>
                      {row.from.firstName} {row.from.lastName}
                    </b>
                    <div className="dash-meet-meta">wants to be buddies</div>
                  </div>
                </Link>
                <div className="action-btns">
                  <form action={acceptFriend}>
                    <input type="hidden" name="userId" value={row.from.id} />
                    <input type="hidden" name="next" value="/dashboard" />
                    <button type="submit" className="btn action-btn">
                      Accept Buddy
                    </button>
                  </form>
                  <form action={removeFriend}>
                    <input type="hidden" name="userId" value={row.from.id} />
                    <input type="hidden" name="next" value="/dashboard" />
                    <button type="submit" className="btn-ghost action-btn">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {friends.length === 0 ? (
          <div className="card">
            No buddies yet. Open someone&apos;s profile from a study buddy group and hit Add Buddy.
          </div>
        ) : (
          <>
            <div className="dash-friends">
              {topFriends.map((f, i) => (
                <Link
                  key={f.id}
                  href={`/friends/${f.id}`}
                  className="dash-friend hover-lift motion-stagger-item"
                  style={{ ["--motion-delay" as string]: `${i * 45}ms` }}
                >
                  <Avatar user={f} />
                  <b>
                    {f.firstName} {f.lastName}
                  </b>
                  <span>{f.university || f.major || "Study Buddy"}</span>
                </Link>
              ))}
            </div>
            {friends.length > 5 ? (
              <p className="dash-hint" style={{ marginTop: 12 }}>
                Showing your top 5 by recent chats.{" "}
                <Link href="/friends" style={{ textDecoration: "underline" }}>
                  See All {friends.length} Buddies
                </Link>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="page-section-title">Next Up</h2>
        </div>
        {upcoming.length === 0 ? (
          <div className="card">Nothing upcoming yet.</div>
        ) : (
          <div className="dash-meet-list">
            {upcoming.slice(0, 5).map((m) => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="dash-meet hover-lift">
                <div className="dash-meet-main">
                  <b>
                    {m.subject}
                    {m.topic ? ` — ${m.topic}` : ""}
                  </b>
                  <div className="dash-meet-meta">
                    {m.meetDate ? formatMeetDate(m.meetDate) : "Date TBD"} · {m.time} · {m.location}
                    {m.university ? ` · ${m.university}` : ""}
                  </div>
                </div>
                <div className="dash-meet-side">
                  <span className="dash-meet-count">
                    {m.members.length}/{m.maxSize}
                  </span>
                  <div className="dash-meet-avs">
                    {m.members.slice(0, 3).map((mem) => (
                      <Avatar key={mem.id} user={mem.user} style={{ width: 28, height: 28, fontSize: 10 }} />
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section" id="cal">
        <div className="dash-section-head">
          <h2 className="page-section-title">{monthName}</h2>
          <div className="cal-nav">
            <Link className="pill" href={calHref(year, month - 1)} aria-label="Previous month">
              ←
            </Link>
            {!isThisMonth ? (
              <Link className="pill" href="/dashboard#cal">
                This month
              </Link>
            ) : null}
            <Link className="pill" href={calHref(year, month + 1)} aria-label="Next month">
              →
            </Link>
          </div>
        </div>
        <DashCalendar year={year} month={month} today={today} meetings={calMeets} />
      </section>
    </div>
  );
}
