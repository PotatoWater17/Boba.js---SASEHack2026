import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, photoSrc } from "@/avatar";
import { ClassBubbles, MajorPicker, UniversityPicker } from "@/ui";
import { acceptFriend, addFriend, removeFriend, updateProfile } from "@/app/actions";
import { getMe, initials, prisma, splitList } from "@/lib";
import { PhotoField } from "./photo";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { edit, error } = await searchParams;
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
          {error === "type" ? <p className="err">Use a jpg, png, gif, or webp.</p> : null}
          {error === "size" ? <p className="err">Keep photos under 4 MB.</p> : null}
          <PhotoField src={photoSrc(user)} fallback={initials(user.firstName, user.lastName)} />
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
          <MajorPicker defaultValue={user.major} />
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

      <Avatar user={user} className="avatar avatar-lg" style={{ margin: "20px auto" }} />
      <h2 style={{ marginBottom: 4 }}>
        {user.firstName} {user.lastName}{" "}
        <span style={{ fontSize: 16, fontWeight: 400, color: "#666" }}>{user.pronouns}</span>
      </h2>
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "4px 0" }}>{user.university || "University not set"}</p>
        {user.year ? <p style={{ margin: "4px 0" }}>{user.year}</p> : null}
        {user.major ? <p style={{ margin: "4px 0" }}>{user.major}</p> : null}
      </div>

      {!isMe ? (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <Link className="btn" href={`/friends/${user.id}`}>
            Message
          </Link>
          {friends ? (
            <>
              <span className="pill active">Buddies</span>
              <form action={removeFriend}>
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="pill">
                  Remove buddy
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
              <button type="submit" className="pill">
                Add buddy
              </button>
            </form>
          )}
        </div>
      ) : null}

      <div className="profile-bits">
        <section>
          <h3>Bio</h3>
          <p style={{ color: user.bio ? "var(--ink)" : "#777" }}>{user.bio || "No bio yet."}</p>
        </section>
        <section>
          <h3>Classes Need help in</h3>
          <div className="profile-bubbles">
            {need.length ? need.map((c) => <span key={c} className="bubble">{c}</span>) : <span style={{ color: "#777" }}>None listed</span>}
          </div>
        </section>
        <section>
          <h3>Classes Could help in</h3>
          <div className="profile-bubbles">
            {help.length ? help.map((c) => <span key={c} className="bubble">{c}</span>) : <span style={{ color: "#777" }}>None listed</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
