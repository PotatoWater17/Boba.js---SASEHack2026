import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, removeFriend, unblockUser } from "@/app/actions";
import { Avatar } from "@/avatar";
import { blockedUserIds, getMe, prisma, timeAgo, usersBlockedByMe } from "@/lib";
import { serverWeekAgoMs } from "@/server-time";
import { PeopleSearch } from "./search";

const FILTERS = [
  { id: "", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "recent", label: "Recent" },
  { id: "campus", label: "Same Campus" },
  { id: "new", label: "No Chats Yet" },
  { id: "blocked", label: "Blocked" },
] as const;

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; error?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { q: qRaw, filter: filterRaw, error } = await searchParams;
  const blocked = await blockedUserIds(me.id);
  const q = (qRaw || "").trim().toLowerCase();
  const filter = FILTERS.some((f) => f.id === filterRaw) ? filterRaw || "" : "";

  const friendRows = await prisma.friendship.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });
  const incoming =
    filter === "blocked"
      ? []
      : friendRows.filter(
          (row) => row.status === "pending" && row.toId === me.id && !blocked.has(row.fromId),
        );
  const friends = friendRows
    .filter((row) => row.status === "accepted")
    .map((row) => (row.fromId === me.id ? row.to : row.from))
    .filter((u) => !blocked.has(u.id));

  const dms = await prisma.directMessage.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    orderBy: { createdAt: "desc" },
  });

  const known = new Map(friends.map((f) => [f.id, f]));

  const blockedByMe = filter === "blocked" ? await usersBlockedByMe(me.id) : [];
  const blockedMatches = blockedByMe.filter((user) => {
    if (!q) return true;
    return `${user.firstName} ${user.lastName}`.toLowerCase().includes(q);
  });

  const weekAgo = serverWeekAgoMs();
  const threads = [...known.values()]
    .map((friend) => {
      const last = dms.find(
        (m) =>
          (m.fromId === me.id && m.toId === friend.id) ||
          (m.fromId === friend.id && m.toId === me.id),
      );
      const unread = dms.filter(
        (m) => m.fromId === friend.id && m.toId === me.id && !m.seen && !m.unsent,
      ).length;
      return { friend, last, unread };
    })
    .filter(({ friend, last, unread }) => {
      if (blocked.has(friend.id)) return false;
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

  function emptyThreadsMessage() {
    if (q) return "Nobody matched that search.";
    if (filter === "unread") return "You've read all messages.";
    if (filter === "recent") return "No chats in the last 7 days.";
    if (filter === "campus") return "No buddies at your campus.";
    if (filter === "new") return "No buddies without messages yet.";
    if (filter === "blocked") return "You haven't blocked anyone.";
    return "Nobody matched that search.";
  }

  return (
    <div className="page chats-page">
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">My Buddies</h1>
      </header>

      {error === "blocked" ? <p className="err">You can&apos;t message that buddy.</p> : null}

      <div className="chat-search">
        <form method="get" className="chat-search-form">
          <input
            className="field"
            name="q"
            defaultValue={qRaw || ""}
            placeholder="Search a name"
            style={{ margin: 0, flex: 1 }}
            autoComplete="off"
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
              <div className="action-btns">
                <form action={acceptFriend}>
                  <input type="hidden" name="userId" value={row.from.id} />
                  <input type="hidden" name="next" value="/friends" />
                  <button type="submit" className="btn action-btn">
                    Accept Buddy
                  </button>
                </form>
                <form action={removeFriend}>
                  <input type="hidden" name="userId" value={row.from.id} />
                  <input type="hidden" name="next" value="/friends" />
                  <button type="submit" className="btn-ghost action-btn">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {filter === "blocked" ? (
        blockedByMe.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            You haven&apos;t blocked anyone.
          </div>
        ) : blockedMatches.length === 0 ? (
          <div className="card" style={{ textAlign: "center" }}>
            Nobody matched that search.
          </div>
        ) : (
          <div className="chat-list">
            {blockedMatches.map((user) => (
              <div key={user.id} className="chat-row" style={{ justifyContent: "space-between" }}>
                <Link href={`/profile/${user.id}`} className="chat-row-main">
                  <Avatar user={user} />
                  <span className="chat-row-text">
                    <b>
                      {user.firstName} {user.lastName}
                    </b>
                    <span className="chat-row-preview">
                      {[user.year, user.university].filter(Boolean).join(" · ") || "Blocked"}
                    </span>
                  </span>
                </Link>
                <form action={unblockUser} style={{ flexShrink: 0 }}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="next" value="/friends?filter=blocked" />
                  <button type="submit" className="btn">
                    Unblock
                  </button>
                </form>
              </div>
            ))}
          </div>
        )
      ) : known.size === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          No buddies yet. <Link href="/find/buddies">Find a Buddy!</Link>
        </div>
      ) : threads.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          {emptyThreadsMessage()}
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
                className={`chat-row hover-lift${unread ? " unread" : ""}`}
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
