import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { joinMeeting, sendMessage, unsendMessage } from "@/app/actions";
import { CreateMeetupForm, LeaveGroupButton } from "@/ui";
import { Avatar } from "@/avatar";
import { ChatReactions } from "@/chat-reactions";
import { formatMeetDate, getMe, groupKindLabel, prisma, splitList } from "@/lib";
import { packReactions } from "@/reactions";
import { GroupSeenOnOpen } from "./seen";
import { InviteBuddies } from "./invite";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { error, edit } = await searchParams;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      host: true,
      members: { include: { user: true } },
      messages: {
        include: {
          user: true,
          reactions: { include: { user: { select: { id: true, firstName: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!meeting) notFound();

  const joined = meeting.members.some((m) => m.userId === me.id);
  const isOwner = meeting.hostId === me.id;
  const topics = splitList(meeting.topic);

  const memberIds = new Set(meeting.members.map((m) => m.userId));
  const invites = joined
    ? await prisma.meetupInvite.findMany({ where: { meetingId: meeting.id } })
    : [];
  const pendingInviteIds = invites.filter((i) => i.status === "pending").map((i) => i.toId);

  let inviteBuddies: {
    id: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    year: string;
    major: string;
  }[] = [];
  if (joined) {
    const bonds = await prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ fromId: me.id }, { toId: me.id }],
      },
      include: { from: true, to: true },
    });
    inviteBuddies = bonds
      .map((b) => (b.fromId === me.id ? b.to : b.from))
      .filter((u) => !memberIds.has(u.id))
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);
  }

  if (isOwner && edit === "1") {
    return (
      <div className="page" style={{ maxWidth: 640 }}>
        <header className="page-header">
          <Link href={`/meetings/${meeting.id}`} className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
            ← Back
          </Link>
          <h1 className="page-title">Edit Meetup</h1>
          <p>Update the details for your study session.</p>
        </header>
        <CreateMeetupForm
          defaultUniversity={meeting.university || me.university}
          meeting={{
            id: meeting.id,
            subject: meeting.subject,
            topic: meeting.topic,
            meetDate: meeting.meetDate,
            time: meeting.time,
            location: meeting.location,
            university: meeting.university,
            notes: meeting.notes,
            groupKind: meeting.groupKind,
            style: meeting.style,
            maxSize: meeting.maxSize,
            memberCount: meeting.members.length,
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      {joined ? <GroupSeenOnOpen meetingId={meeting.id} /> : null}
      {error === "full" ? <p className="err">This group is full.</p> : null}
      {error === "join" ? <p className="err">Join the group before chatting.</p> : null}

      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Meetup Info
        </h1>
        {isOwner ? (
          <Link href={`/meetings/${meeting.id}?edit=1`} className="btn" title="Edit meetup">
            Edit details
          </Link>
        ) : null}
      </header>
      <div className="card">
        <div className="meet-owner">
          <Link href={`/profile/${meeting.host.id}`} className="meet-owner-link">
            <Avatar user={meeting.host} style={{ width: 36, height: 36, fontSize: 12 }} />
            <span>
              <span className="meet-owner-label">Meetup owner</span>
              <b>
                {meeting.host.firstName} {meeting.host.lastName}
                {isOwner ? " (you)" : ""}
              </b>
            </span>
          </Link>
        </div>
        <p>
          <b>Subject:</b> {meeting.subject}
        </p>
        <p>
          <b>University:</b> {meeting.university || "Not set"}
        </p>
        <p>
          <b>Date:</b> {meeting.meetDate ? formatMeetDate(meeting.meetDate) : "Not set"}
        </p>
        <p>
          <b>Meeting time:</b> {meeting.time}
        </p>
        <p>
          <b>Location:</b> {meeting.location}
        </p>
        <p>
          <b>Group type:</b> {groupKindLabel(meeting.groupKind)}
        </p>
        <p>
          <b>Meetup style:</b> {meeting.style}
        </p>
        <p>
          <b>Group Size:</b> {meeting.members.length} / {meeting.maxSize}
        </p>
        <p style={{ marginBottom: 6 }}>
          <b>Topics covering:</b>
        </p>
        <div>
          {topics.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
        {meeting.notes ? (
          <p style={{ marginTop: 14 }}>
            <b>Notes / additional info:</b>
            <br />
            <span style={{ color: "var(--ink)" }}>{meeting.notes}</span>
          </p>
        ) : null}
        <div style={{ marginTop: 14 }}>
          {joined ? (
            isOwner ? (
              <span className="pill active">You&apos;re the owner</span>
            ) : (
              <LeaveGroupButton meetingId={meeting.id} />
            )
          ) : (
            <form action={joinMeeting}>
              <input type="hidden" name="meetingId" value={meeting.id} />
              <button className="btn" type="submit">
                Join group
              </button>
            </form>
          )}
        </div>
      </div>

      {joined ? (
        <InviteBuddies
          meetingId={meeting.id}
          buddies={inviteBuddies}
          pendingIds={pendingInviteIds}
        />
      ) : null}

      <h2>People</h2>
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 12 }}>
        {meeting.members.map((mem) => (
          <Link key={mem.id} href={`/profile/${mem.userId}`} style={{ textAlign: "center" }}>
            <Avatar user={mem.user} style={{ margin: "0 auto" }} />
            <div style={{ marginTop: 6, fontSize: 14 }}>
              {mem.user.firstName} {mem.user.lastName[0]}.
              {mem.userId === meeting.hostId ? (
                <div style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700 }}>Owner</div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      <h2>Group Chat</h2>
      <div className="card">
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, minHeight: 160, marginBottom: 12 }}>
          {meeting.messages.length === 0 ? (
            <p className="text-muted">No messages yet.</p>
          ) : (
            meeting.messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Link href={`/profile/${msg.userId}`}>
                  <Avatar user={msg.user} style={{ width: 28, height: 28, fontSize: 10 }} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13 }}>{msg.user.firstName}:</b>
                    {msg.userId === me.id && !msg.unsent ? (
                      <form action={unsendMessage} className="dm-unsend-form">
                        <input type="hidden" name="messageId" value={msg.id} />
                        <input type="hidden" name="meetingId" value={meeting.id} />
                        <button type="submit" className="dm-unsend-btn">
                          Unsend
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {msg.unsent ? (
                    <div className="msg-unsent">Unsent</div>
                  ) : (
                    <>
                      {msg.text}
                      <ChatReactions
                        kind="group"
                        messageId={msg.id}
                        meId={me.id}
                        initial={packReactions(msg.reactions, me.id)}
                      />
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {joined ? (
          <form action={sendMessage} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="meetingId" value={meeting.id} />
            <input className="field" name="text" placeholder="Type a chat..." style={{ margin: 0 }} required />
            <button className="btn" type="submit">
              Send
            </button>
          </form>
        ) : (
          <p className="text-muted" style={{ margin: 0 }}>Join to chat.</p>
        )}
      </div>
    </div>
  );
}
