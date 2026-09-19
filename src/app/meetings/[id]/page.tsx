import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { joinMeeting, sendMessage } from "@/app/actions";
import { LeaveGroupButton } from "@/ui";
import { formatMeetDate, getMe, groupKindLabel, initials, prisma, splitList } from "@/lib";

export default async function MeetingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      messages: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!meeting) notFound();

  const joined = meeting.members.some((m) => m.userId === me.id);
  const topics = splitList(meeting.topic);

  return (
    <div className="page">
      {error === "full" ? <p className="err">This group is full.</p> : null}
      {error === "join" ? <p className="err">Join the group before chatting.</p> : null}

      <header className="page-header">
        <h1 className="page-title">Meet up info</h1>
      </header>
      <div className="card">
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
            <span style={{ color: "#444" }}>{meeting.notes}</span>
          </p>
        ) : null}
        <div style={{ marginTop: 14 }}>
          {joined ? (
            <LeaveGroupButton meetingId={meeting.id} />
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

      <h2>People</h2>
      <div className="card" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 12 }}>
        {meeting.members.map((mem) => (
          <Link key={mem.id} href={`/profile/${mem.userId}`} style={{ textAlign: "center" }}>
            <span className="avatar" style={{ margin: "0 auto" }}>
              {initials(mem.user.firstName, mem.user.lastName)}
            </span>
            <div style={{ marginTop: 6, fontSize: 14 }}>
              {mem.user.firstName} {mem.user.lastName[0]}.
            </div>
          </Link>
        ))}
      </div>

      <h2>Group Chat</h2>
      <div className="card">
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, minHeight: 160, marginBottom: 12 }}>
          {meeting.messages.length === 0 ? (
            <p style={{ color: "#777" }}>No messages yet.</p>
          ) : (
            meeting.messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Link href={`/profile/${msg.userId}`} className="avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                  {initials(msg.user.firstName, msg.user.lastName)}
                </Link>
                <div>
                  <b style={{ fontSize: 13 }}>
                    {msg.user.firstName}:{" "}
                  </b>
                  {msg.text}
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
          <p style={{ margin: 0, color: "#666" }}>Join to chat.</p>
        )}
      </div>
    </div>
  );
}
