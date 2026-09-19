import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/avatar";
import { formatMeetDate, getMe, groupKindLabel, prisma, timeAgo } from "@/lib";

const FILTERS = [
  { id: "", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "recent", label: "Recent" },
  { id: "campus", label: "Same campus" },
  { id: "new", label: "No chats yet" },
] as const;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { q: qRaw, filter: filterRaw } = await searchParams;
  const q = (qRaw || "").trim().toLowerCase();
  const filter = FILTERS.some((f) => f.id === filterRaw) ? filterRaw || "" : "";

  const memberships = await prisma.member.findMany({
    where: { userId: me.id },
    include: {
      meeting: {
        include: {
          members: { include: { user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 40, include: { user: true } },
        },
      },
    },
  });

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = memberships
    .map((mem) => {
      const m = mem.meeting;
      const last = m.messages[0] || null;
      const unread = m.messages.filter(
        (msg) => msg.userId !== me.id && msg.createdAt.getTime() > mem.lastReadAt.getTime(),
      ).length;
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

  return (
    <div className="page chats-page" style={{ maxWidth: 640 }}>
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">My groups</h1>
        <p>Meetups you signed up for — open one to chat.</p>
      </header>

      <div className="chat-search">
        <form method="get" className="chat-search-form">
          <input
            className="field"
            name="q"
            defaultValue={qRaw || ""}
            placeholder="Search subject, topic, location…"
            style={{ margin: 0, flex: 1 }}
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
          You haven&apos;t joined any groups yet. <Link href="/find">Find buddies</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          Nobody matched that search.
        </div>
      ) : (
        <div className="chat-list">
          {rows.map(({ m, last, unread }) => {
            const preview = last
              ? `${last.user.firstName}: ${last.text}`
              : "No messages yet — say hi in group chat";
            const when = last ? timeAgo(last.createdAt) : "";
            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className={`chat-row${unread ? " unread" : ""}`}
              >
                <span className="avatar group-avatar">{m.subject.slice(0, 2).toUpperCase()}</span>
                <span className="chat-row-text">
                  <b>
                    {m.subject}
                    {m.topic ? `: ${m.topic.split(",")[0].trim()}` : ""}
                  </b>{" "}
                  <span className="chat-row-preview">{preview}</span>
                  <span className="chat-row-meta">
                    {m.meetDate ? `${formatMeetDate(m.meetDate)} · ` : ""}
                    {m.time} · {m.location}
                    {when ? ` · ${when}` : ""}
                  </span>
                  <span className="meet-badges" style={{ marginTop: 6 }}>
                    <span className={`badge kind-${m.groupKind || "small"}`}>
                      {groupKindLabel(m.groupKind || "small")}
                    </span>
                    {m.university ? <span className="badge uni">{m.university}</span> : null}
                  </span>
                  <span className="dash-meet-avs" style={{ marginTop: 8 }}>
                    {m.members.slice(0, 5).map((mem) => (
                      <Avatar key={mem.id} user={mem.user} style={{ width: 28, height: 28, fontSize: 10 }} />
                    ))}
                  </span>
                </span>
                {unread > 0 ? <span className="chat-badge">{unread}</span> : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
