import { NextResponse } from "next/server";
import { getMe, prisma } from "@/lib";

export async function GET() {
  const me = await getMe();
  if (!me) return NextResponse.json({ items: [] }, { status: 401 });

  const unread = await prisma.directMessage.findMany({
    where: { toId: me.id, seen: false },
    include: {
      from: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const items: {
    fromId: string;
    msgId: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    preview: string;
    unread: number;
  }[] = [];
  const seen = new Set<string>();
  for (const msg of unread) {
    if (seen.has(msg.fromId)) {
      const row = items.find((it) => it.fromId === msg.fromId);
      if (row) row.unread += 1;
      continue;
    }
    seen.add(msg.fromId);
    items.push({
      fromId: msg.fromId,
      msgId: msg.id,
      firstName: msg.from.firstName,
      lastName: msg.from.lastName,
      photoKey: msg.from.photoKey,
      preview: msg.text || (msg.fileName ? "Sent an attachment" : "New message"),
      unread: 1,
    });
  }

  return NextResponse.json({ items });
}
