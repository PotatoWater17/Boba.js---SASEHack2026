import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClassBubbles, UniversityPicker } from "@/ui";
import { acceptFriend, addFriend, removeFriend, updateProfile } from "@/app/actions";
import { getMe, initials, prisma, splitList } from "@/lib";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { edit } = await searchParams;
  const userId = id === "me" ? me.id : id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const isMe = me.id === user.id;
  const editing = isMe && edit === "1";
  const need = splitList(user.needHelp);
  const help = splitList(user.canHelp);
  const friendship = isMe
    ? null
    : await prisma.friendship.findFirst({
        where: {
          OR: [
            { fromId: me.id, toId: user.id },
            { fromId: user.id, toId: me.id },
          ],
        },
      });
  const friends = friendship?.status === "accepted";
  const iSent = friendship?.status === "pending" && friendship.fromId === me.id;
  const theySent = friendship?.status === "pending" && friendship.toId === me.id;

  if (editing) {
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <header className="page-header">
          <h1 className="page-title">Edit profile</h1>
        </header>
        <form action={updateProfile} className="box">
          <label>
            First name
            <input className="field" name="firstName" defaultValue={user.firstName} required />
          </label>
          <label>
            Last name
            <input className="field" name="lastName" defaultValue={user.lastName} required />
          </label>
          <label>
            Pronouns
            <input className="field" name="pronouns" defaultValue={user.pronouns} />
          </label>
          <label>
            Year
            <input className="field" name="year" defaultValue={user.year} placeholder="Sophomore" />
          </label>
          <UniversityPicker defaultValue={user.university} />
          <label>
            Major
            <input className="field" name="major" defaultValue={user.major} />
          </label>
          <label>
            Bio
            <textarea
              className="field"
              name="bio"
              rows={4}
              maxLength={400}
              defaultValue={user.bio}
              placeholder="A little about you — how you like to study, what you're grinding on."
            />
          </label>
          <ClassBubbles label="Classes Need help in" name="needHelp" initial={need} />
          <ClassBubbles label="Classes Could help in" name="canHelp" initial={help} />
          <button className="btn" type="submit">
            Save
          </button>{" "}
          <Link className="pill" href={`/profile/${user.id}`}>
            Cancel
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 520, textAlign: "center" }}>
      <header className="page-header" style={{ textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            Profile
          </h1>
          {isMe ? (
            <Link href={`/profile/${user.id}?edit=1`} title="edit profile" style={{ fontSize: 22 }}>
              ✎
            </Link>
          ) : null}
        </div>
      </header>

      <div className="avatar avatar-lg" style={{ margin: "20px auto" }}>
        {initials(user.firstName, user.lastName)}
      </div>
      <h2 style={{ marginBottom: 4 }}>
        {user.firstName} {user.lastName}{" "}
        <span style={{ fontSize: 16, fontWeight: 400, color: "#666" }}>{user.pronouns}</span>
      </h2>
      <p style={{ margin: "4px 0" }}>{user.university || "University not set"}</p>
      <p style={{ margin: "4px 0" }}>{user.year || "Year not set"}</p>
      <p style={{ margin: "4px 0 16px" }}>{user.major || "Major not set"}</p>

      {!isMe ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          {friends ? (
            <>
              <span className="pill active">Friends</span>
              <form action={removeFriend}>
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="pill">
                  Unfriend
                </button>
              </form>
            </>
          ) : theySent ? (
            <>
              <form action={acceptFriend}>
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="btn">
                  Accept request
                </button>
              </form>
              <form action={removeFriend}>
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="pill">
                  Decline
                </button>
              </form>
            </>
          ) : iSent ? (
            <>
              <span className="pill">Request sent</span>
              <form action={removeFriend}>
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="pill">
                  Cancel
                </button>
              </form>
            </>
          ) : (
            <form action={addFriend}>
              <input type="hidden" name="userId" value={user.id} />
              <button type="submit" className="btn">
                Add friend
              </button>
            </form>
          )}
        </div>
      ) : null}

      <div style={{ textAlign: "left" }}>
        <h3>Bio</h3>
        <p style={{ color: user.bio ? "#444" : "#777", whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
          {user.bio || "No bio yet."}
        </p>
        <h3>Classes Need help in</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {need.length ? need.map((c) => <span key={c} className="bubble">{c}</span>) : <span style={{ color: "#777" }}>None listed</span>}
        </div>
        <h3>Classes Could help in</h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {help.length ? help.map((c) => <span key={c} className="bubble">{c}</span>) : <span style={{ color: "#777" }}>None listed</span>}
        </div>
      </div>
    </div>
  );
}
