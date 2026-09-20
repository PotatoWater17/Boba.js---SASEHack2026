import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/avatar";
import { isImageMime } from "@/files";
import { ChatReactions } from "@/chat-reactions";
import { CopyMessageButton } from "@/copy-message-btn";
import { messageCopyText } from "@/message-copy";
import { getMe, isBlockedBetween, prisma, timeAgo } from "@/lib";
import { packReactions } from "@/reactions";
import { unsendDm } from "@/app/actions";
import { DmCompose } from "./compose";
import { DmThread } from "./thread";
import { SeenOnOpen } from "./seen";
import { DmImage } from "./dm-image";
import { InviteCard } from "./invite-card";

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
  if (await isBlockedBetween(me.id, friend.id)) redirect("/friends?error=blocked");

  const bond = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { fromId: me.id, toId: friend.id },
        { fromId: friend.id, toId: me.id },
      ],
    },
  });
  if (!bond) notFound();

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: friend.id },
        { fromId: friend.id, toId: me.id },
      ],
    },
    include: {
      from: true,
      reactions: { include: { user: { select: { id: true, firstName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const inviteIds = [...new Set(messages.map((m) => m.inviteId).filter(Boolean))];
  const invites = inviteIds.length
    ? await prisma.meetupInvite.findMany({
        where: { id: { in: inviteIds } },
        include: { meeting: true },
      })
    : [];
  const inviteMap = new Map(invites.map((i) => [i.id, i]));

  return (
    <div className="page chats-page chat-room">
      <SeenOnOpen userId={friend.id} />
      <header className="page-header">
        <Link href="/friends" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Chats
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/profile/${friend.id}`}>
            <Avatar user={friend} />
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
      {error === "full" ? <p className="err">That meetup is full.</p> : null}
      {error === "blocked" ? <p className="err">You can&apos;t message this user.</p> : null}

      <div className="card">
        <DmThread messageCount={messages.length}>
          {messages.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>No messages yet. Say hi.</p>
          ) : (
            messages.map((msg) => {
              const invite = msg.inviteId ? inviteMap.get(msg.inviteId) : null;
              const copyText = !msg.unsent && !invite ? messageCopyText(msg) : "";
              return (
                <div key={msg.id} className={`dm-bubble${msg.fromId === me.id ? " mine" : ""}`}>
                  <div className="dm-bubble-meta">
                    {msg.from.firstName} · {timeAgo(msg.createdAt)}
                    {!msg.unsent && (copyText || (msg.fromId === me.id && !invite)) ? (
                      <div className="dm-bubble-actions">
                        {copyText ? <CopyMessageButton text={copyText} /> : null}
                        {msg.fromId === me.id && !invite ? (
                          <form action={unsendDm} className="dm-unsend-form">
                            <input type="hidden" name="messageId" value={msg.id} />
                            <input type="hidden" name="userId" value={friend.id} />
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
                  ) : (
                    <>
                      {invite ? (
                        <InviteCard invite={invite} mine={msg.fromId === me.id} />
                      ) : msg.text ? (
                        <div className="dm-text">{msg.text}</div>
                      ) : null}
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
                        kind="dm"
                        messageId={msg.id}
                        meId={me.id}
                        initial={packReactions(msg.reactions, me.id)}
                      />
                    </>
                  )}
                </div>
              );
            })
          )}
        </DmThread>
        <DmCompose userId={friend.id} />
      </div>
    </div>
  );
}
