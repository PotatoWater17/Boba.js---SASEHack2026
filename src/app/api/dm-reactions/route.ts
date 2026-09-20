import { NextResponse } from "next/server";
import { areFriends, getMe, isBlockedBetween, prisma } from "@/lib";
import { normalizeReactionEmoji, packReactions } from "@/reactions";

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { messageId?: string; emoji?: string };
  const messageId = String(body.messageId || "");
  const emoji = normalizeReactionEmoji(String(body.emoji || ""));
  if (!messageId || !emoji) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const dm = await prisma.directMessage.findUnique({ where: { id: messageId } });
  if (!dm || dm.unsent || (dm.fromId !== me.id && dm.toId !== me.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (await isBlockedBetween(dm.fromId, dm.toId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!(await areFriends(dm.fromId, dm.toId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.dmReaction.findUnique({
    where: { dmId_userId_emoji: { dmId: messageId, userId: me.id, emoji } },
  });
  if (existing) {
    await prisma.dmReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.dmReaction.create({ data: { dmId: messageId, userId: me.id, emoji } });
    if (dm.fromId !== me.id) {
      await prisma.reactionNotice.create({
        data: {
          userId: dm.fromId,
          actorId: me.id,
          emoji,
          dmId: messageId,
        },
      });
    }
  }

  const rows = await prisma.dmReaction.findMany({
    where: { dmId: messageId },
    include: { user: { select: { id: true, firstName: true } } },
  });

  return NextResponse.json({ reactions: packReactions(rows, me.id) });
}
