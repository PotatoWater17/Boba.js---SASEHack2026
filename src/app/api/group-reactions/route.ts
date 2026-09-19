import { NextResponse } from "next/server";
import { getMe, prisma } from "@/lib";
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

  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg || msg.unsent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.member.findUnique({
    where: { meetingId_userId: { meetingId: msg.meetingId, userId: me.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: me.id, emoji } },
  });
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: me.id, emoji } });
    if (msg.userId !== me.id) {
      await prisma.reactionNotice.create({
        data: {
          userId: msg.userId,
          actorId: me.id,
          emoji,
          messageId,
          meetingId: msg.meetingId,
        },
      });
    }
  }

  const rows = await prisma.messageReaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, firstName: true } } },
  });

  return NextResponse.json({ reactions: packReactions(rows, me.id) });
}
