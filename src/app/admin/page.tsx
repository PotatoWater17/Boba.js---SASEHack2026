import Link from "next/link";
import { Avatar } from "@/avatar";
import { backfillAccountNumbers, formatAccountId, parseAccountQuery } from "@/account-id";
import { requireAdmin } from "@/admin";
import { prisma, timeAgo } from "@/lib";
import type { Prisma } from "@prisma/client";
import { DeleteUserButton } from "./delete-user";
import { PasswordResetQueue } from "./password-resets";

const PAGE_SIZE = 25;

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function adminHref(params: { q?: string; sort?: string; page?: number; role?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
  if (params.role && params.role !== "all") sp.set("role", params.role);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin?${qs}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    deleted?: string;
    pwreset?: string;
    q?: string;
    sort?: string;
    page?: string;
    role?: string;
  }>;
}) {
  const admin = await requireAdmin();
  await backfillAccountNumbers();
  const { error, deleted, pwreset, q: qRaw = "", sort = "newest", page: pageRaw, role = "all" } =
    await searchParams;
  const q = qRaw.trim();
  const page = Math.max(1, Number(pageRaw) || 1);
  const accountNo = parseAccountQuery(q);

  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const where: Prisma.UserWhereInput = {};
  if (role === "admin") where.isAdmin = true;
  if (role === "member") where.isAdmin = false;

  if (accountNo) {
    where.accountNo = accountNo;
  } else if (q) {
    where.OR = [
      { email: { contains: q } },
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { university: { contains: q } },
      { major: { contains: q } },
    ];
  }

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "name"
      ? [{ lastName: "asc" }, { firstName: "asc" }]
      : sort === "school"
        ? [{ university: "asc" }, { lastName: "asc" }]
        : [{ createdAt: "desc" }];

  const [
    totalUsers,
    admins,
    signupsToday,
    signupsWeek,
    signupsPrevWeek,
    signupsMonth,
    friendships,
    pendingFriends,
    meetups,
    memberships,
    dmTotal,
    dmToday,
    groupMsgs,
    groupMsgsToday,
    unsentDms,
    reactionNotices,
    userTotal,
    users,
    topSchools,
    recentUsers,
    passwordResetRequests,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.friendship.count({ where: { status: "accepted" } }),
    prisma.friendship.count({ where: { status: "pending" } }),
    prisma.meeting.count(),
    prisma.member.count(),
    prisma.directMessage.count(),
    prisma.directMessage.count({ where: { createdAt: { gte: dayAgo }, unsent: false } }),
    prisma.message.count(),
    prisma.message.count({ where: { createdAt: { gte: dayAgo }, unsent: false } }),
    prisma.directMessage.count({ where: { unsent: true } }),
    prisma.reactionNotice.count(),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        accountNo: true,
        email: true,
        firstName: true,
        lastName: true,
        university: true,
        major: true,
        year: true,
        photoKey: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            dmsFrom: true,
            dmsTo: true,
            members: true,
            meetings: true,
          },
        },
      },
    }),
    prisma.user.groupBy({
      by: ["university"],
      where: { university: { not: "" } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        accountNo: true,
        firstName: true,
        lastName: true,
        university: true,
        createdAt: true,
      },
    }),
    prisma.passwordResetRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            accountNo: true,
          },
        },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(userTotal / PAGE_SIZE));
  const weekGrowth = pctChange(signupsWeek, signupsPrevWeek);
  const msgsToday = dmToday + groupMsgsToday;

  return (
    <div className="page admin-page">
      <header className="page-header admin-header">
        <div>
          <h1 className="page-title">Admin Buddies</h1>
          <p>Platform health, user lookup, and moderation tools.</p>
        </div>
        <div className="admin-header-meta">
          <span className="admin-badge">Admin</span>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {formatAccountId(admin.accountNo)}
          </span>
        </div>
      </header>

      {deleted === "1" ? <p className="ok">User deleted.</p> : null}
      {pwreset === "done" ? <p className="ok">Password updated and request closed.</p> : null}
      {pwreset === "dismissed" ? <p className="ok">Password reset request dismissed.</p> : null}
      {error === "self" ? <p className="err">You cannot delete your own account here.</p> : null}
      {error === "missing" ? <p className="err">That user no longer exists.</p> : null}
      {error === "pwreset" ? <p className="err">That password reset request is no longer open.</p> : null}
      {error === "pwmatch" ? <p className="err">New passwords do not match.</p> : null}
      {error === "pwweak" ? (
        <p className="err">Password needs 8+ characters with upper, lower, a number, and a special character.</p>
      ) : null}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total users</div>
          <div className="admin-stat-value">{totalUsers.toLocaleString()}</div>
          <div className="admin-stat-sub">+{signupsToday} today · +{signupsWeek} this week</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Weekly growth</div>
          <div className={`admin-stat-value${weekGrowth >= 0 ? " up" : " down"}`}>
            {weekGrowth >= 0 ? "+" : ""}
            {weekGrowth}%
          </div>
          <div className="admin-stat-sub">{signupsMonth} signups in 30 days</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Messages today</div>
          <div className="admin-stat-value">{msgsToday.toLocaleString()}</div>
          <div className="admin-stat-sub">
            {dmTotal.toLocaleString()} DMs · {groupMsgs.toLocaleString()} group
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Buddy links</div>
          <div className="admin-stat-value">{friendships.toLocaleString()}</div>
          <div className="admin-stat-sub">{pendingFriends} pending buddy requests</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Study groups</div>
          <div className="admin-stat-value">{meetups.toLocaleString()}</div>
          <div className="admin-stat-sub">{memberships.toLocaleString()} memberships</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Moderation</div>
          <div className="admin-stat-value">{unsentDms + reactionNotices}</div>
          <div className="admin-stat-sub">
            {unsentDms} unsent · {reactionNotices} reaction alerts · {admins} admins
          </div>
        </div>
      </div>

      <div className="admin-panels">
        <div className="card admin-panel">
          <h2 className="admin-panel-title">Top campuses</h2>
          {topSchools.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>No university data yet.</p>
          ) : (
            <ul className="admin-rank-list">
              {topSchools.map((row, i) => (
                <li key={row.university}>
                  <span className="admin-rank-num">{i + 1}</span>
                  <span className="admin-rank-name">{row.university}</span>
                  <span className="admin-rank-count">{row._count.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card admin-panel">
          <h2 className="admin-panel-title">Recent signups</h2>
          <ul className="admin-rank-list">
            {recentUsers.map((u) => (
              <li key={u.id} className="admin-recent-item">
                <Link href={`/profile/${u.id}`} className="admin-name-link">
                  {u.firstName} {u.lastName}
                </Link>
                <span className="admin-sub">
                  {formatAccountId(u.accountNo)} · {timeAgo(u.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card admin-panel admin-reset-panel">
        <div className="admin-directory-head">
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            Password reset requests
          </h2>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {passwordResetRequests.length} open
          </span>
        </div>
        <PasswordResetQueue
          requests={passwordResetRequests.map((req) => ({
            id: req.id,
            note: req.note,
            createdLabel: timeAgo(req.createdAt),
            user: {
              id: req.user.id,
              email: req.user.email,
              name: `${req.user.firstName} ${req.user.lastName}`,
              accountLabel: formatAccountId(req.user.accountNo),
            },
          }))}
        />
      </div>

      <div className="card admin-directory">
        <div className="admin-directory-head">
          <h2 className="admin-panel-title" style={{ margin: 0 }}>
            User directory
          </h2>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {userTotal.toLocaleString()} match{userTotal === 1 ? "" : "es"}
          </span>
        </div>

        <form method="get" className="admin-search-bar">
          <input
            className="field"
            name="q"
            defaultValue={q}
            placeholder="Search name, email, SB-000123, school, major…"
            style={{ margin: 0, flex: 1 }}
          />
          <select className="field admin-select" name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="school">School A–Z</option>
          </select>
          <select className="field admin-select" name="role" defaultValue={role}>
            <option value="all">All roles</option>
            <option value="admin">Admins only</option>
            <option value="member">Members only</option>
          </select>
          <button className="btn" type="submit">
            Search
          </button>
          {q || sort !== "newest" || role !== "all" ? (
            <Link className="pill" href="/admin">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>User</th>
                <th>Email</th>
                <th>School / major</th>
                <th>Activity</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted" style={{ textAlign: "center", padding: 24 }}>
                    No users match that search.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const name = `${user.firstName} ${user.lastName}`;
                  const isSelf = user.id === admin.id;
                  const activity =
                    user._count.dmsFrom +
                    user._count.dmsTo +
                    user._count.members +
                    user._count.meetings;
                  return (
                    <tr key={user.id}>
                      <td>
                        <code className="admin-account-id">{formatAccountId(user.accountNo)}</code>
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <Link href={`/profile/${user.id}`}>
                            <Avatar user={user} style={{ width: 36, height: 36, fontSize: 12 }} />
                          </Link>
                          <div>
                            <Link href={`/profile/${user.id}`} className="admin-name-link">
                              {name}
                            </Link>
                            {user.isAdmin ? <span className="admin-badge">Admin</span> : null}
                            {isSelf ? <span className="admin-badge you">You</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <div>{user.university || "—"}</div>
                        <div className="admin-sub">
                          {[user.year, user.major].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="admin-sub">{activity} actions</td>
                      <td className="admin-sub">{timeAgo(user.createdAt)}</td>
                      <td className="admin-actions">
                        <Link href={`/profile/${user.id}`} className="pill">
                          View
                        </Link>
                        {isSelf ? null : <DeleteUserButton userId={user.id} name={name} />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="admin-pagination">
            {page > 1 ? (
              <Link className="pill" href={adminHref({ q, sort, role, page: page - 1 })}>
                ← Prev
              </Link>
            ) : null}
            <span className="text-muted" style={{ fontSize: 13 }}>
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link className="pill" href={adminHref({ q, sort, role, page: page + 1 })}>
                Next →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
