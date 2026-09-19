import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, removeFriend } from "@/app/actions";
import { DashCalendar } from "./calendar";
import { formatMeetDate, getMe, initials, prisma, ymd } from "@/lib";

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

  const friendRows = await prisma.friendship.findMany({
    where: {
      OR: [{ fromId: me.id }, { toId: me.id }],
    },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });
  const friends = friendRows
    .filter((row) => row.status === "accepted")
    .map((row) => (row.fromId === me.id ? row.to : row.from));
  const incoming = friendRows.filter((row) => row.status === "pending" && row.toId === me.id);

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
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Hey {me.firstName}</h1>
        <p>Your groups and what&apos;s coming up.</p>
      </header>

      <div className="dash-stats">
        <div className="dash-stat">
          <strong>{meetings.length}</strong>
          <span>Groups</span>
        </div>
        <div className="dash-stat">
          <strong>{upcoming.length}</strong>
          <span>Upcoming</span>
        </div>
        <div className="dash-stat">
          <strong>{thisWeek.length}</strong>
          <span>This week</span>
        </div>
        <div className="dash-stat">
          <strong>{hosting}</strong>
          <span>Hosting</span>
        </div>
      </div>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Friends</h2>
          <Link href="/friends" className="dash-hint" style={{ textDecoration: "underline" }}>
            {friends.length} connected · chats
          </Link>
        </div>
        {incoming.length > 0 ? (
          <div className="dash-meet-list" style={{ marginBottom: 14 }}>
            {incoming.map((row) => (
              <div key={row.id} className="dash-meet">
                <Link href={`/profile/${row.from.id}`} className="dash-friend-link">
                  <span className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                    {initials(row.from.firstName, row.from.lastName)}
                  </span>
                  <div className="dash-meet-main">
                    <b>
                      {row.from.firstName} {row.from.lastName}
                    </b>
                    <div className="dash-meet-meta">wants to be friends</div>
                  </div>
                </Link>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <form action={acceptFriend}>
                    <input type="hidden" name="userId" value={row.from.id} />
                    <input type="hidden" name="next" value="/dashboard" />
                    <button type="submit" className="btn">
                      Accept
                    </button>
                  </form>
                  <form action={removeFriend}>
                    <input type="hidden" name="userId" value={row.from.id} />
                    <input type="hidden" name="next" value="/dashboard" />
                    <button type="submit" className="pill">
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
            No friends yet. Open someone&apos;s profile from a meetup and hit Add friend.
          </div>
        ) : (
          <div className="dash-friends">
            {friends.map((f) => (
              <Link key={f.id} href={`/friends/${f.id}`} className="dash-friend">
                <span className="avatar">{initials(f.firstName, f.lastName)}</span>
                <b>
                  {f.firstName} {f.lastName}
                </b>
                <span>{f.university || f.major || "Study buddy"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>Next up</h2>
        </div>
        {upcoming.length === 0 ? (
          <div className="card">Nothing upcoming yet.</div>
        ) : (
          <div className="dash-meet-list">
            {upcoming.slice(0, 5).map((m) => (
              <div key={m.id} className="dash-meet">
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
                      <span key={mem.id} className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                        {initials(mem.user.firstName, mem.user.lastName)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dash-section" id="cal">
        <div className="dash-section-head">
          <h2>{monthName}</h2>
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
