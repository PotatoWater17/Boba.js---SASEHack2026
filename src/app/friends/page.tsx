import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, removeFriend } from "@/app/actions";
import { Avatar } from "@/avatar";
import { getMe, prisma, timeAgo } from "@/lib";
import { PeopleSearch } from "./search";

const FILTERS = [
  { id: "", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "recent", label: "Recent" },
  { id: "campus", label: "Same campus" },
  { id: "new", label: "No chats yet" },
] as const;

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { q: qRaw, filter: filterRaw } = await searchParams;
  const q = (qRaw || "").trim().toLowerCase();
  const filter = FILTERS.some((f) => f.id === filterRaw) ? filterRaw || "" : "";

  const friendRows = await prisma.friendship.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });
  const incoming = friendRows.filter((row) => row.status === "pending" && row.toId === me.id);
  const friends = friendRows
    .filter((row) => row.status === "accepted")
    .map((row) => (row.fromId === me.id ? row.to : row.from));

  const dms = await prisma.directMessage.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    orderBy: { createdAt: "desc" },
  });

  const known = new Map(friends.map((f) => [f.id, f]));
  const extraIds = [
    ...new Set(
      dms
        .map((m) => (m.fromId === me.id ? m.toId : m.fromId))
        .filter((id) => !known.has(id)),
    ),
  ];
  if (extraIds.length) {
    const extras = await prisma.user.findMany({ where: { id: { in: extraIds } } });
    for (const u of extras) known.set(u.id, u);
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const threads = [...known.values()]
    .map((friend) => {
      const last = dms.find(
        (m) =>
          (m.fromId === me.id && m.toId === friend.id) ||
          (m.fromId === friend.id && m.toId === me.id),
      );
      const unread = dms.filter((m) => m.fromId === friend.id && m.toId === me.id && !m.seen).length;
      return { friend, last, unread };
    })
    .filter(({ friend, last, unread }) => {
      const name = `${friend.firstName} ${friend.lastName}`.toLowerCase();
      if (q && !name.includes(q)) return false;
      if (filter === "unread") return unread > 0;
      if (filter === "recent") return Boolean(last && last.createdAt.getTime() >= weekAgo);
      if (filter === "campus") {
        return Boolean(me.university && friend.university && me.university === friend.university);
      }
      if (filter === "new") return !last;
      return true;
    })
    .sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      const at = a.last ? a.last.createdAt.getTime() : 0;
      const bt = b.last ? b.last.createdAt.getTime() : 0;
      return bt - at;
    });

  function href(nextFilter: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextFilter) params.set("filter", nextFilter);
    const qs = params.toString();
    return qs ? `/friends?${qs}` : "/friends";
  }

  return (
    <div className="page chats-page">
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">Buddies</h1>
      </header>

      <div className="chat-search">
        <form method="get" className="chat-search-form">
          <input
            className="field"
            name="q"
            defaultValue={qRaw || ""}
            placeholder="Search a name"
            style={{ margin: 0, flex: 1 }}
          />
          {filter ? <input type="hidden" name="filter" value={filter} /> : null}
          <button className="btn" type="submit">
            Search
          </button>
        </form>
        <PeopleSearch />
      </div>

      <div className="chat-filters">
        {FILTERS.map((f) => (
          <Link key={f.id || "all"} href={href(f.id)} className={`pill${filter === f.id ? " active" : ""}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {incoming.length > 0 ? (
        <div className="chat-list" style={{ marginBottom: 18 }}>
          {incoming.map((row) => (
            <div key={row.id} className="chat-row" style={{ justifyContent: "space-between" }}>
              <Link href={`/profile/${row.from.id}`} className="chat-row-main">
                <Avatar user={row.from} />
                <span className="chat-row-text">
                  <b>
                    {row.from.firstName} {row.from.lastName}
                  </b>
                  <span className="chat-row-preview"> wants to be buddies</span>
                </span>
              </Link>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <form action={acceptFriend}>
                  <input type="hidden" name="userId" value={row.from.id} />
                  <input type="hidden" name="next" value="/friends" />
                  <button type="submit" className="btn">
                    Accept
                  </button>
                </form>
                <form action={removeFriend}>
                  <input type="hidden" name="userId" value={row.from.id} />
                  <input type="hidden" name="next" value="/friends" />
                  <button type="submit" className="pill">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {known.size === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          No buddies yet. <Link href="/find/buddies">Match a buddy</Link> or add someone from a meetup.
        </div>
      ) : threads.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          Nobody matched that search.
        </div>
      ) : (
        <div className="chat-list">
          {threads.map(({ friend, last, unread }) => {
            const preview = last?.unsent
              ? "Unsent"
              : last?.text
                ? last.text
                : last?.fileName
                  ? "Sent an attachment"
                  : "Say hi";
            const when = last ? timeAgo(last.createdAt) : "";
            const mine = last && last.fromId === me.id;
            return (
              <Link
                key={friend.id}
                href={`/friends/${friend.id}`}
                className={`chat-row${unread ? " unread" : ""}`}
              >
                <Avatar user={friend} />
                <span className="chat-row-text">
                  <b>
                    {friend.firstName} {friend.lastName}:
                  </b>{" "}
                  <span className="chat-row-preview">{preview}</span>
                  {when ? <span className="chat-row-time"> - {when}</span> : null}
                </span>
                {unread > 0 ? (
                  <span className="chat-badge">{unread}</span>
                ) : mine ? (
                  <span className={`chat-status${last.seen ? " read" : ""}`}>{last.seen ? "Read" : "Sent"}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
