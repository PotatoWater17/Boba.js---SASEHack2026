import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sendDm } from "@/app/actions";
import { isImageMime } from "@/files";
import { getMe, initials, prisma, timeAgo } from "@/lib";

export default async function FriendChatPage({
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
  const friend = await prisma.user.findUnique({ where: { id } });
  if (!friend || friend.id === me.id) notFound();

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: friend.id },
        { fromId: friend.id, toId: me.id },
      ],
    },
    include: { from: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="page chats-page">
      <header className="page-header">
        <Link href="/friends" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Chats
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/profile/${friend.id}`} className="avatar">
            {initials(friend.firstName, friend.lastName)}
          </Link>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              {friend.firstName} {friend.lastName}
            </h1>
            <p style={{ margin: "2px 0 0" }}>{friend.university || friend.major || "Study buddy"}</p>
          </div>
        </div>
      </header>

      {error === "type" ? <p className="err">That file type isn&apos;t allowed.</p> : null}
      {error === "size" ? <p className="err">Keep attachments under 8 MB.</p> : null}
      {error === "empty" ? <p className="err">Type a message or attach a file.</p> : null}

      <div className="card">
        <div className="dm-thread">
          {messages.length === 0 ? (
            <p style={{ color: "#777", margin: 0 }}>No messages yet. Say hi.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`dm-bubble${msg.fromId === me.id ? " mine" : ""}`}>
                <div className="dm-bubble-meta">
                  {msg.from.firstName} · {timeAgo(msg.createdAt)}
                </div>
                {msg.text ? <div>{msg.text}</div> : null}
                {msg.fileKey ? (
                  isImageMime(msg.fileMime) ? (
                    <a href={`/api/files/${msg.id}`} target="_blank" rel="noreferrer">
                      <img className="dm-pic" src={`/api/files/${msg.id}`} alt={msg.fileName || "Photo"} />
                    </a>
                  ) : (
                    <a className="dm-file" href={`/api/files/${msg.id}`}>
                      {msg.fileName || "Attachment"}
                    </a>
                  )
                ) : null}
              </div>
            ))
          )}
        </div>
        <form action={sendDm} className="dm-compose" encType="multipart/form-data">
          <input type="hidden" name="userId" value={friend.id} />
          <input className="field" name="text" placeholder="Type a message..." style={{ margin: 0, flex: 1 }} />
          <label className="pill dm-attach">
            Attach
            <input
              type="file"
              name="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/*"
            />
          </label>
          <button className="btn" type="submit">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
