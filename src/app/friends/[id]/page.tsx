import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import { Avatar } from "@/avatar";
import { getMe, isBlockedBetween, prisma } from "@/lib";
import { FriendChatPanel } from "./friend-chat-panel";
import { loadDmLines } from "@/load-chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FriendChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  noStore();
  await connection();
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
  if (!bond) redirect(`/profile/${friend.id}?reconnect=1`);

  const lines = await loadDmLines(me.id, friend.id);

  return (
    <div className="page chats-page chat-room">
      <header className="page-header">
        <Link href="/friends" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← My Buddies
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/profile/${friend.id}`}>
            <Avatar user={friend} />
          </Link>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>
              {friend.firstName} {friend.lastName}
            </h1>
            <p style={{ margin: "2px 0 0" }}>{friend.university || friend.major || "Study Buddy"}</p>
          </div>
        </div>
      </header>

      {error === "type" ? <p className="err">That file type isn&apos;t allowed.</p> : null}
      {error === "size" ? <p className="err">Keep attachments under 8 MB.</p> : null}
      {error === "empty" ? <p className="err">Type a message or attach a file.</p> : null}
      {error === "full" ? <p className="err">That study buddy group is full.</p> : null}
      {error === "blocked" ? <p className="err">You can&apos;t message this buddy.</p> : null}
      {error === "buddy" ? (
        <p className="err">You&apos;re no longer buddies — reconnect from their profile.</p>
      ) : null}

      <FriendChatPanel friendId={friend.id} meId={me.id} meName={me.firstName} messages={lines} />
    </div>
  );
}
