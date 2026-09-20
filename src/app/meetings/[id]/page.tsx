import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unsendMessage } from "@/app/actions";
import { DmImage } from "@/app/friends/[id]/dm-image";
import { isImageMime } from "@/files";
import { CreateMeetupForm, DeleteGroupButton, LeaveGroupButton, RemoveMemberButton } from "@/ui";
import { Avatar } from "@/avatar";
import { ChatReactions } from "@/chat-reactions";
import { CopyMessageButton } from "@/copy-message-btn";
import { messageCopyText } from "@/message-copy";
import { formatMeetDate, getMe, groupKindLabel, prisma, splitList } from "@/lib";
import { packReactions } from "@/reactions";
import { GroupSeenOnOpen } from "./seen";
import { GroupChatCompose } from "./compose";
import { InviteBuddies } from "./invite";
import { JoinGroupButton } from "./join-button";
import { JoinRequestsPanel } from "./join-requests";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; edit?: string; notice?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { error, edit, notice } = await searchParams;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      host: true,
      members: { include: { user: true } },
    },
  });
  if (!meeting) notFound();

  const joined = meeting.members.some((m) => m.userId === me.id);
  const isOwner = meeting.hostId === me.id;
  const canViewMembers = joined || !meeting.isPrivate;

  const joinRequest =
    !joined && meeting.requireApproval && !meeting.isPrivate
      ? await prisma.meetingJoinRequest.findUnique({
          where: { meetingId_userId: { meetingId: id, userId: me.id } },
        })
      : null;
  const joinPending = joinRequest?.status === "pending";

  const pendingJoinRequests = isOwner
    ? await prisma.meetingJoinRequest.findMany({
        where: { meetingId: id, status: "pending" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, photoKey: true, year: true, major: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const messages = joined
    ? await prisma.message.findMany({
        where: { meetingId: id },
        include: {
          user: true,
          reactions: { include: { user: { select: { id: true, firstName: true } } } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const topics = splitList(meeting.topic);
  const full = meeting.members.length >= meeting.maxSize;
  const soloOwner = isOwner && meeting.members.length === 1;

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
  if (joined && (!meeting.isPrivate || isOwner)) {
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
            isPrivate: meeting.isPrivate,
            requireApproval: meeting.requireApproval,
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      {joined ? <GroupSeenOnOpen meetingId={meeting.id} /> : null}
      {error === "full" ? <p className="err">This group is full.</p> : null}
      {error === "owner" ? <p className="err">Group owners can&apos;t leave — delete the group instead.</p> : null}
      {error === "join" ? <p className="err">Join the group before chatting.</p> : null}
      {error === "private" ? <p className="err">This private group is invite-only — you can&apos;t request to join here.</p> : null}
      {notice === "requested" ? <p className="ok">Join request sent — the owner will review it.</p> : null}
      {notice === "pending" ? <p className="ok">Your join request is already pending.</p> : null}
      {notice === "member-removed" ? (
        <p className="ok">Member removed — their messages now show as &quot;Removed user&quot;.</p>
      ) : null}

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
        <div className="meet-badges" style={{ marginBottom: 10 }}>
          {meeting.isPrivate ? <span className="badge private">Private</span> : null}
          {meeting.requireApproval && !meeting.isPrivate ? (
            <span className="badge approval">Approval required</span>
          ) : null}
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
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {joined ? (
            isOwner ? (
              soloOwner ? (
                <LeaveGroupButton meetingId={meeting.id} soloOwner />
              ) : (
                <>
                  <span className="pill active">You&apos;re the owner</span>
                  <DeleteGroupButton meetingId={meeting.id} subject={meeting.subject} />
                </>
              )
            ) : (
              <LeaveGroupButton meetingId={meeting.id} />
            )
          ) : (
            <JoinGroupButton
              meetingId={meeting.id}
              requireApproval={meeting.requireApproval}
              pending={joinPending}
              full={full}
              isPrivate={meeting.isPrivate}
            />
          )}
        </div>
      </div>

      {isOwner && !meeting.isPrivate && meeting.requireApproval ? (
        <JoinRequestsPanel meetingId={meeting.id} requests={pendingJoinRequests} />
      ) : null}

      {joined && !full && (!meeting.isPrivate || isOwner) ? (
        <InviteBuddies
          meetingId={meeting.id}
          buddies={inviteBuddies}
          pendingIds={pendingInviteIds}
          ownerOnly={meeting.isPrivate}
        />
      ) : null}

      <h2>Group Buddies</h2>
      {canViewMembers ? (
        <div className="card meet-people-grid">
          {meeting.members.map((mem) => (
            <div key={mem.id} className="meet-person-card">
              <Link href={`/profile/${mem.userId}`} className="meet-person-link">
                <Avatar user={mem.user} style={{ margin: "0 auto" }} />
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  {mem.user.firstName} {mem.user.lastName[0]}.
                  {mem.userId === meeting.hostId ? (
                    <div style={{ fontSize: 11, color: "var(--purple)", fontWeight: 700 }}>Owner</div>
                  ) : null}
                </div>
              </Link>
              {isOwner && mem.userId !== meeting.hostId ? (
                <RemoveMemberButton
                  meetingId={meeting.id}
                  userId={mem.userId}
                  name={`${mem.user.firstName} ${mem.user.lastName}`}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="text-muted" style={{ margin: 0 }}>
            This is a private group — member profiles are visible after you join.
          </p>
        </div>
      )}

      {joined ? (
        <>
          <h2>Group Chat</h2>
          <div className="card">
            <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, minHeight: 160, marginBottom: 12 }}>
              {messages.length === 0 ? (
                <p className="text-muted">No messages yet.</p>
              ) : (
                messages.map((msg) => {
                  const removed = msg.authorRemoved;
                  const copyText = !msg.unsent && !removed ? messageCopyText(msg) : "";
                  return (
                  <div key={msg.id} className="group-chat-row" style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    {removed ? (
                      <span
                        className="avatar removed-user-avatar"
                        style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}
                        aria-hidden
                      >
                        ?
                      </span>
                    ) : (
                      <Link href={`/profile/${msg.userId}`}>
                        <Avatar user={msg.user} style={{ width: 28, height: 28, fontSize: 10 }} />
                      </Link>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 13 }}>{removed ? "Removed user" : `${msg.user.firstName}:`}</b>
                        {!msg.unsent && !removed && (copyText || msg.userId === me.id) ? (
                          <div className="dm-bubble-actions">
                            {copyText ? <CopyMessageButton text={copyText} /> : null}
                            {msg.userId === me.id ? (
                              <form action={unsendMessage} className="dm-unsend-form">
                                <input type="hidden" name="messageId" value={msg.id} />
                                <input type="hidden" name="meetingId" value={meeting.id} />
                                <button type="submit" className="dm-unsend-btn">
                                  Unsend
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {msg.unsent ? (
                        <div className="msg-unsent">Unsent</div>
                      ) : removed ? (
                        <div className="msg-removed-user">Removed user</div>
                      ) : (
                        <>
                          {msg.text ? <div className="dm-text">{msg.text}</div> : null}
                          {msg.fileKey ? (
                            isImageMime(msg.fileMime) ? (
                              <DmImage src={`/api/files/${msg.id}`} alt={msg.fileName || "Photo"} />
                            ) : (
                              <a className="dm-file" href={`/api/files/${msg.id}`}>
                                {msg.fileName || "Attachment"}
                              </a>
                            )
                          ) : null}
                          <ChatReactions
                            kind="group"
                            messageId={msg.id}
                            meId={me.id}
                            initial={packReactions(msg.reactions ?? [], me.id)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
            {error === "empty" ? <p className="err">Add a message or attachment.</p> : null}
            {error === "type" ? <p className="err">That file type isn&apos;t supported.</p> : null}
            {error === "size" ? <p className="err">File must be 8 MB or smaller.</p> : null}
            <GroupChatCompose meetingId={meeting.id} />
          </div>
        </>
      ) : null}
    </div>
  );
}
