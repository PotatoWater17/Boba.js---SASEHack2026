import Link from "next/link";
import { Avatar } from "@/avatar";
import { requireAdmin } from "@/admin";
import { prisma } from "@/lib";
import { DeleteUserButton } from "./delete-user";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}) {
  const admin = await requireAdmin();
  const { error, deleted } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      university: true,
      major: true,
      year: true,
      photoKey: true,
      isAdmin: true,
      createdAt: true,
    },
  });

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h1 className="page-title">Admin Portal</h1>
        <p>View accounts and remove users from the platform.</p>
      </header>

      {deleted === "1" ? <p className="ok">User deleted.</p> : null}
      {error === "self" ? <p className="err">You cannot delete your own account here.</p> : null}
      {error === "missing" ? <p className="err">That user no longer exists.</p> : null}

      <div className="card">
        <p style={{ margin: "0 0 14px", fontWeight: 700 }}>
          {users.length} user{users.length === 1 ? "" : "s"}
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Email</th>
                <th>School / major</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const name = `${user.firstName} ${user.lastName}`;
                const isSelf = user.id === admin.id;
                return (
                  <tr key={user.id}>
                    <td>
                      <Link href={`/profile/${user.id}`} title="View profile">
                        <Avatar user={user} style={{ width: 40, height: 40, fontSize: 14 }} />
                      </Link>
                    </td>
                    <td>
                      <Link href={`/profile/${user.id}`} className="admin-name-link">
                        {name}
                      </Link>
                      {user.isAdmin ? <span className="admin-badge">Admin</span> : null}
                      {isSelf ? <span className="admin-badge you">You</span> : null}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <div>{user.university || "—"}</div>
                      <div className="admin-sub">{[user.year, user.major].filter(Boolean).join(" · ") || "—"}</div>
                    </td>
                    <td className="admin-actions">
                      <Link href={`/profile/${user.id}`} className="pill">
                        View
                      </Link>
                      {isSelf ? null : <DeleteUserButton userId={user.id} name={name} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
