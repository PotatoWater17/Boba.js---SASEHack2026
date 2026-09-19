import { redirect } from "next/navigation";
import { formatMeetDate, getMe, initials, prisma, ymd } from "@/lib";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function DashboardPage() {
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

  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDate = new Map<string, number>();
  for (const m of meetings) {
    if (!m.meetDate) continue;
    byDate.set(m.meetDate, (byDate.get(m.meetDate) || 0) + 1);
  }

  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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

      <section className="dash-section">
        <div className="dash-section-head">
          <h2>{monthName}</h2>
          <span className="dash-hint">yellow = you have a meetup</span>
        </div>
        <div className="cal">
          <div className="cal-grid">
            {DAYS.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {blanks.map((_, i) => (
              <div key={`e${i}`} className="cal-day empty" />
            ))}
            {days.map((day) => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const count = byDate.get(dateStr) || 0;
              return (
                <div
                  key={day}
                  className={`cal-day compact${count ? " has-meet" : ""}${dateStr === today ? " today" : ""}`}
                >
                  <div className="cal-day-num">{day}</div>
                  {count > 0 ? <div className="cal-dot">{count}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
