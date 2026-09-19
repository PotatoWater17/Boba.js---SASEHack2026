import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMeetDate, getMe, groupKindLabel, initials, prisma } from "@/lib";

export default async function GroupsPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  const meetings = await prisma.meeting.findMany({
    where: { members: { some: { userId: me.id } } },
    include: { members: { include: { user: true } } },
    orderBy: [{ meetDate: "asc" }, { time: "asc" }],
  });

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">My groups</h1>
        <p>Meetups you signed up for.</p>
      </header>

      <div style={{ display: "grid", gap: 14 }}>
        {meetings.length === 0 ? (
          <div className="card">
            You haven&apos;t joined any groups yet. <Link href="/find">Find buddies</Link>
          </div>
        ) : (
          meetings.map((m) => (
            <Link key={m.id} href={`/meetings/${m.id}`} className="card" style={{ display: "block" }}>
              <h3 style={{ margin: "0 0 6px" }}>{m.subject}</h3>
              <div className="meet-badges" style={{ marginBottom: 6 }}>
                <span className={`badge kind-${m.groupKind || "small"}`}>
                  {groupKindLabel(m.groupKind || "small")}
                </span>
                {m.style ? <span className="badge style">{m.style}</span> : null}
                {m.university ? <span className="badge uni">{m.university}</span> : null}
              </div>
              <div>{m.topic}</div>
              <div style={{ color: "#555", marginTop: 4 }}>
                {m.meetDate ? `${formatMeetDate(m.meetDate)} · ` : ""}
                {m.time} · {m.location}
              </div>
              {m.notes ? <p className="meeting-note">{m.notes}</p> : null}
              <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
                {m.members.map((mem) => (
                  <span key={mem.id} className="avatar">
                    {initials(mem.user.firstName, mem.user.lastName)}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
