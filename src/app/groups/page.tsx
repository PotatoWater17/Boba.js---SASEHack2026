import Link from "next/link";
import { redirect } from "next/navigation";
import { purgeOrphanMeetings } from "@/meeting-cleanup";
import { formatMeetDate, getMe, groupKindLabel, groupMessagePreview, prisma, timeAgo } from "@/lib";
import { serverWeekAgoMs } from "@/server-time";
import { MeetFormatBadge } from "@/meet-format-badge";

const FILTERS = [
  { id: "", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "recent", label: "Recent" },
  { id: "campus", label: "Same Campus" },
  { id: "new", label: "No Chats Yet" },
] as const;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; notice?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  await purgeOrphanMeetings();

  const { q: qRaw, filter: filterRaw, notice } = await searchParams;
  const q = (qRaw || "").trim().toLowerCase();
  const filter = FILTERS.some((f) => f.id === filterRaw) ? filterRaw || "" : "";

  const memberships = await prisma.member.findMany({
    where: { userId: me.id },
    include: {
      meeting: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } },
        },
      },
    },
  });

  const lastRead = new Map(memberships.map((mem) => [mem.meetingId, mem.lastReadAt]));
  const meetingIds = memberships.map((mem) => mem.meetingId);
  const unreadMsgs = meetingIds.length
    ? await prisma.message.findMany({
        where: { meetingId: { in: meetingIds }, userId: { not: me.id } },
        select: { meetingId: true, createdAt: true },
      })
    : [];
  const unreadByMeeting = new Map<string, number>();
  for (const msg of unreadMsgs) {
    const readAt = lastRead.get(msg.meetingId);
    if (!readAt || msg.createdAt.getTime() <= readAt.getTime()) continue;
    unreadByMeeting.set(msg.meetingId, (unreadByMeeting.get(msg.meetingId) || 0) + 1);
  }

  const weekAgo = serverWeekAgoMs();
  const rows = memberships
    .map((mem) => {
      const m = mem.meeting;
      const last = m.messages[0] || null;
      const unread = unreadByMeeting.get(m.id) || 0;
      return { m, mem, last, unread };
    })
    .filter(({ m, last, unread }) => {
      const hay = `${m.subject} ${m.topic} ${m.location} ${m.university}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (filter === "unread") return unread > 0;
      if (filter === "recent") return Boolean(last && last.createdAt.getTime() >= weekAgo);
      if (filter === "campus") {
        return Boolean(me.university && m.university && me.university === m.university);
      }
      if (filter === "new") return !last;
      return true;
    })
    .sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      const at = a.last ? a.last.createdAt.getTime() : 0;
      const bt = b.last ? b.last.createdAt.getTime() : 0;
      if (at !== bt) return bt - at;
      return (a.m.meetDate || "").localeCompare(b.m.meetDate || "");
    });

  function href(nextFilter: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextFilter) params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/groups?${qs}` : "/groups";
  }

  function emptyGroupsMessage() {
    if (q) return "Nobody matched that search.";
    if (filter === "unread") return "You're all caught up — no unread group messages.";
    if (filter === "recent") return "No group chats in the last 7 days.";
    if (filter === "campus") return "No groups on your campus.";
    if (filter === "new") return "No groups without messages yet.";
    return "Nobody matched that search.";
  }

  return (
    <div className="page chats-page" style={{ maxWidth: 640 }}>
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">My Study Buddy Groups</h1>
        <p>Study buddy groups you joined — open one to chat.</p>
      </header>

      {notice === "deleted" ? <p className="ok">Study group deleted.</p> : null}

      <div className="chat-search">
        <form method="get" className="chat-search-form">
          <input
            className="field"
            name="q"
            defaultValue={qRaw || ""}
            placeholder="Search subject, topic, location…"
            style={{ margin: 0, flex: 1 }}
            autoComplete="off"
          />
          {filter ? <input type="hidden" name="filter" value={filter} /> : null}
          <button className="btn" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="chat-filters">
        {FILTERS.map((f) => (
          <Link key={f.id || "all"} href={href(f.id)} className={`pill${filter === f.id ? " active" : ""}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {memberships.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          You haven&apos;t joined any groups yet. <Link href="/find">Find Buddies</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          {emptyGroupsMessage()}
        </div>
      ) : (
        <div className="chat-list">
          {rows.map(({ m, last, unread }) => {
            const preview = last ? groupMessagePreview(last) : "No messages yet — say hi in group chat";
            const when = last ? timeAgo(last.createdAt) : "";
            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className={`chat-row chat-row-group hover-lift${unread ? " unread" : ""}`}
              >
                <span className="avatar group-avatar">{m.subject.slice(0, 2).toUpperCase()}</span>
                <span className="chat-row-text">
                  <span className="chat-row-title">
                    {m.subject}
                    {m.topic ? `: ${m.topic.split(",")[0].trim()}` : ""}
                  </span>
                  <span className="chat-row-preview">
                    {preview}
                    {when ? <span className="chat-row-time"> · {when}</span> : null}
                  </span>
                  <div className="chat-row-foot">
                    {(m.meetDate || m.time || m.location) ? (
                      <span className="chat-row-meta">
                        {[formatMeetDate(m.meetDate), m.time, m.location].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    <span className="meet-badges">
                      <MeetFormatBadge isOnline={m.isOnline} />
                      <span className={`badge kind-${m.groupKind || "small"}`}>
                        {groupKindLabel(m.groupKind || "small")}
                      </span>
                      {m.university ? <span className="badge uni">{m.university}</span> : null}
                    </span>
                  </div>
                </span>
                {unread > 0 ? <span className="chat-badge">{unread > 99 ? "99+" : unread}</span> : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
