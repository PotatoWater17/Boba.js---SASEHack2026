import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar, photoSrc } from "@/avatar";
import { ClassBubbles, ExamPrepFields, MajorPicker, UniversityPicker, YearPicker } from "@/ui";
import { acceptFriend, addFriend, blockUser, changePassword, removeFriend, unblockUser, updateProfile } from "@/app/actions";
import { formatAccountId } from "@/account-id";
import { isUserAdmin } from "@/admin";
import {
  blockedByMe,
  blockedUserIds,
  formatMeetDate,
  getMe,
  initials,
  isBlockedBetween,
  mutualConnections,
  prisma,
  splitList,
} from "@/lib";
import { MutualConnectionsButton } from "./mutual-connections";
import { PhotoField } from "./photo";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; error?: string; pw?: string; blocked?: string; reconnect?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { edit, error, pw, blocked: blockedNotice, reconnect } = await searchParams;
  const userId = id === "me" ? me.id : id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const isMe = me.id === user.id;
  const adminView = isUserAdmin(me);
  const editing = isMe && edit === "1";
  const need = splitList(user.needHelp);
  const help = splitList(user.canHelp);
  const examTopics = splitList(user.examTopics);
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
  const iBlocked = isMe ? false : await blockedByMe(me.id, user.id);
  const blocked = isMe ? false : await isBlockedBetween(me.id, user.id);
  let visibleMutuals: Awaited<ReturnType<typeof mutualConnections>> = [];
  if (friends && !blocked) {
    const blockedIds = await blockedUserIds(me.id);
    visibleMutuals = (await mutualConnections(me.id, user.id)).filter((person) => !blockedIds.has(person.id));
  }

  if (editing) {
    return (
      <div className="page motion-page-enter" style={{ maxWidth: 560 }}>
        <header className="page-header">
          <h1 className="page-title">Edit Profile</h1>
        </header>
        <form action={updateProfile} className="box" encType="multipart/form-data">
          {error === "save" ? (
            <p className="err">Could not save profile. Restart the dev server and run npx prisma generate, then try again.</p>
          ) : null}
          {error === "type" ? <p className="err">Use a jpg, png, gif, or webp.</p> : null}
          {error === "size" ? <p className="err">Keep photos under 4 MB.</p> : null}
          {error === "pwfill" ? <p className="err">Fill out all password fields.</p> : null}
          {error === "pwbad" ? <p className="err">Current password is incorrect.</p> : null}
          {error === "pwmatch" ? <p className="err">New passwords do not match.</p> : null}
          {error === "pwweak" ? (
            <p className="err">Password needs 8+ characters with upper, lower, a number, and a special character.</p>
          ) : null}
          {pw === "changed" ? <p className="ok">Password updated.</p> : null}
          <PhotoField src={photoSrc(user)} fallback={initials(user.firstName, user.lastName)} />
          <label>
            First Name
            <input className="field" name="firstName" defaultValue={user.firstName} required />
          </label>
          <label>
            Last Name
            <input className="field" name="lastName" defaultValue={user.lastName} required />
          </label>
          <label>
            Pronouns
            <input className="field" name="pronouns" defaultValue={user.pronouns} />
          </label>
          <YearPicker defaultValue={user.year} />
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
          <ClassBubbles label="Classes I Need Help With" name="needHelp" initial={need} />
          <ClassBubbles label="Classes I Can Help With" name="canHelp" initial={help} />
          <ExamPrepFields
            defaultCourse={user.examCourse}
            defaultDate={user.examDate}
            defaultTopics={splitList(user.examTopics)}
            defaultStyle={user.studyStyle}
            allowPastExamDate
          />
          <div className="profile-email-setting">
            <p style={{ margin: "0 0 8px", fontSize: 14 }}>
              Email: <b>{user.email}</b>
            </p>
            <label className="profile-email-toggle">
              <input type="checkbox" name="showEmail" value="1" defaultChecked={user.showEmail} />
              Show my email on my profile
            </label>
          </div>
          <button className="btn" type="submit">
            Save
          </button>{" "}
          <Link className="pill" href={`/profile/${user.id}`}>
            Cancel
          </Link>
        </form>

        <div className="box profile-password-box">
          <h2 className="profile-password-title">Change Password</h2>
          <form action={changePassword}>
            <label>
              Current password
              <input className="field" name="currentPassword" type="password" required autoComplete="current-password" />
            </label>
            <label>
              New password
              <input className="field" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              Confirm new password
              <input className="field" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <p className="profile-password-hint">
              Must be 8+ characters and include uppercase, lowercase, a number, and a special character.
            </p>
            <button className="btn" type="submit">
              Update password
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page motion-page-enter" style={{ maxWidth: 520, textAlign: "center" }}>
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
        <span className="text-muted" style={{ fontSize: 16, fontWeight: 400 }}>{user.pronouns}</span>
      </h2>
      <dl className="profile-meta">
        {adminView ? (
          <div className="profile-meta-row">
            <dt>Account ID</dt>
            <dd>{formatAccountId(user.accountNo)}</dd>
          </div>
        ) : null}
        <div className="profile-meta-row">
          <dt>University</dt>
          <dd>{user.university || "Not set"}</dd>
        </div>
        {user.year ? (
          <div className="profile-meta-row">
            <dt>Year</dt>
            <dd>{user.year}</dd>
          </div>
        ) : null}
        {user.major ? (
          <div className="profile-meta-row">
            <dt>Major</dt>
            <dd>{user.major}</dd>
          </div>
        ) : null}
        {isMe || user.showEmail ? (
          <div className="profile-meta-row">
            <dt>Email</dt>
            <dd>
              {user.email}
              {isMe && !user.showEmail ? (
                <span className="profile-meta-note">Hidden from others</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {!isMe && blockedNotice === "1" ? <p className="ok">Buddy blocked.</p> : null}
      {!isMe && reconnect === "1" ? (
        <p className="err">You&apos;re not buddies anymore. Add them again to open your chat.</p>
      ) : null}
      {!isMe && error === "blocked" ? <p className="err">You can&apos;t interact with this buddy.</p> : null}

      {!isMe ? (
        <div className="profile-actions">
          {iBlocked ? (
            <>
              <span className="action-status active profile-action-btn">Blocked</span>
              <form action={unblockUser} className="profile-action-form">
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="btn-ghost profile-action-btn">
                  Unblock
                </button>
              </form>
            </>
          ) : blocked ? (
            <p className="err" style={{ margin: 0 }}>
              You can&apos;t interact with this buddy.
            </p>
          ) : (
            <>
              <Link className="btn profile-action-btn" href={`/friends/${user.id}`}>
                Message
              </Link>
              {friends ? (
                <>
                  <MutualConnectionsButton
                    profileName={user.firstName}
                    mutuals={visibleMutuals}
                  />
                  <form action={removeFriend} className="profile-action-form">
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="btn-ghost profile-action-btn">
                      Remove Buddy
                    </button>
                  </form>
                </>
              ) : theySent ? (
                <>
                  <form action={acceptFriend} className="profile-action-form">
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="btn profile-action-btn">
                      Accept Buddy
                    </button>
                  </form>
                  <form action={removeFriend} className="profile-action-form">
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="btn-ghost profile-action-btn">
                      Decline
                    </button>
                  </form>
                </>
              ) : iSent ? (
                <>
                  <span className="action-status profile-action-btn">Request Sent</span>
                  <form action={removeFriend} className="profile-action-form">
                    <input type="hidden" name="userId" value={user.id} />
                    <button type="submit" className="btn-ghost profile-action-btn">
                      Cancel
                    </button>
                  </form>
                </>
              ) : (
                <form action={addFriend} className="profile-action-form">
                  <input type="hidden" name="userId" value={user.id} />
                  <button type="submit" className="btn profile-action-btn">
                    Add Buddy
                  </button>
                </form>
              )}
              <form action={blockUser} className="profile-action-form">
                <input type="hidden" name="userId" value={user.id} />
                <button type="submit" className="btn-ghost profile-action-btn">
                  Block
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}

      <div className="profile-bits">
        <section>
          <h3 className="card-section-title">Bio</h3>
          <p className={user.bio ? undefined : "text-muted"} style={{ color: user.bio ? "var(--ink)" : undefined }}>{user.bio || "No bio yet."}</p>
        </section>
        <section>
          <h3 className="card-section-title">Classes I Need Help With</h3>
          <div className="profile-bubbles">
            {need.length ? need.map((c) => <span key={c} className="bubble">{c}</span>) : <span className="text-muted">None listed</span>}
          </div>
        </section>
        <section>
          <h3 className="card-section-title">Classes I Can Help With</h3>
          <div className="profile-bubbles">
            {help.length ? help.map((c) => <span key={c} className="bubble bubble-help">{c}</span>) : <span className="text-muted">None listed</span>}
          </div>
        </section>
        {user.examCourse || user.examDate || examTopics.length || user.studyStyle ? (
          <section>
            <h3 className="card-section-title">Exam Prep</h3>
            {user.examCourse ? (
              <p style={{ margin: "0 0 6px" }}>
                <b>Subject:</b> {user.examCourse}
              </p>
            ) : null}
            {examTopics.length && user.examCourse ? (
              <>
                <p style={{ margin: "0 0 6px" }}>
                  <b>Topics for {user.examCourse}:</b>
                </p>
                <div className="profile-bubbles">
                  {examTopics.map((t) => (
                    <span key={t} className="bubble">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            {user.examDate ? (
              <p style={{ margin: "0 0 6px" }}>
                <b>Exam date:</b> {formatMeetDate(user.examDate)}
              </p>
            ) : null}
            {user.studyStyle ? (
              <p style={{ margin: "0 0 6px" }}>
                <b>Study style:</b> {user.studyStyle}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
