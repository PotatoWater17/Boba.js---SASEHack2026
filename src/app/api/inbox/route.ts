import { NextResponse } from "next/server";
import { blockedUserIds, getMe, groupMessagePreview, prisma } from "@/lib";

export async function GET() {
  const me = await getMe();
  if (!me) {
    return NextResponse.json(
      { dms: [], groups: [], dmReacts: [], groupReacts: [], friendNotices: 0, groupNotices: 0 },
      { status: 401 },
    );
  }

  const blocked = await blockedUserIds(me.id);

  const unread = await prisma.directMessage.findMany({
    where: {
      toId: me.id,
      seen: false,
      ...(blocked.size ? { fromId: { notIn: [...blocked] } } : {}),
    },
    include: {
      from: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const dms: {
    fromId: string;
    msgId: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    preview: string;
    unread: number;
  }[] = [];
  const seenDm = new Set<string>();
  for (const msg of unread) {
    if (seenDm.has(msg.fromId)) {
      const row = dms.find((it) => it.fromId === msg.fromId);
      if (row) row.unread += 1;
      continue;
    }
    seenDm.add(msg.fromId);
    dms.push({
      fromId: msg.fromId,
      msgId: msg.id,
      firstName: msg.from.firstName,
      lastName: msg.from.lastName,
      photoKey: msg.from.photoKey,
      preview: msg.unsent ? "Unsent" : msg.text || (msg.fileName ? "Sent an attachment" : "New message"),
      unread: 1,
    });
  }

  const reactUnread = await prisma.reactionNotice.findMany({
    where: { userId: me.id, seen: false },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const dmReacts: {
    noticeId: string;
    actorId: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    emoji: string;
    preview: string;
    unread: number;
  }[] = [];
  const seenDmReact = new Set<string>();
  for (const note of reactUnread.filter((n) => n.dmId && !blocked.has(n.actorId))) {
    if (seenDmReact.has(note.actorId)) {
      const row = dmReacts.find((it) => it.actorId === note.actorId);
      if (row) row.unread += 1;
      continue;
    }
    seenDmReact.add(note.actorId);
    dmReacts.push({
      noticeId: note.id,
      actorId: note.actorId,
      firstName: note.actor.firstName,
      lastName: note.actor.lastName,
      photoKey: note.actor.photoKey,
      emoji: note.emoji,
      preview: `Reacted ${note.emoji} to your message`,
      unread: 1,
    });
  }

  const memberships = await prisma.member.findMany({
    where: { userId: me.id },
    select: { meetingId: true, lastReadAt: true },
  });

  const groups: {
    meetingId: string;
    msgId: string;
    subject: string;
    fromId: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    preview: string;
    unread: number;
  }[] = [];
  let groupNotices = reactUnread.filter((n) => n.meetingId).length;

  if (memberships.length) {
    const lastRead = new Map(memberships.map((m) => [m.meetingId, m.lastReadAt.getTime()]));
    const meetingIds = memberships.map((m) => m.meetingId);
    const msgs = await prisma.message.findMany({
      where: {
        meetingId: { in: meetingIds },
        userId: { not: me.id },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        meeting: { select: { subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    groupNotices += msgs.filter((msg) => msg.createdAt.getTime() > (lastRead.get(msg.meetingId) || 0)).length;

    const seenGroup = new Set<string>();
    for (const msg of msgs) {
      if (msg.createdAt.getTime() <= (lastRead.get(msg.meetingId) || 0)) continue;
      if (seenGroup.has(msg.meetingId)) {
        const row = groups.find((it) => it.meetingId === msg.meetingId);
        if (row) row.unread += 1;
        continue;
      }
      seenGroup.add(msg.meetingId);
      groups.push({
        meetingId: msg.meetingId,
        msgId: msg.id,
        subject: msg.meeting.subject,
        fromId: msg.user.id,
        firstName: msg.authorRemoved ? "Removed buddy" : msg.user.firstName,
        lastName: msg.authorRemoved ? "" : msg.user.lastName,
        photoKey: msg.authorRemoved ? "" : msg.user.photoKey,
        preview: groupMessagePreview(msg),
        unread: 1,
      });
    }
  }

  const meetingNames = memberships.length
    ? new Map(
        (
          await prisma.meeting.findMany({
            where: { id: { in: memberships.map((m) => m.meetingId) } },
            select: { id: true, subject: true },
          })
        ).map((m) => [m.id, m.subject]),
      )
    : new Map<string, string>();

  const groupReacts: {
    noticeId: string;
    meetingId: string;
    subject: string;
    actorId: string;
    firstName: string;
    lastName: string;
    photoKey: string;
    emoji: string;
    preview: string;
    unread: number;
  }[] = [];
  const seenGroupReact = new Set<string>();
  for (const note of reactUnread.filter((n) => n.meetingId)) {
    if (seenGroupReact.has(note.meetingId)) {
      const row = groupReacts.find((it) => it.meetingId === note.meetingId);
      if (row) row.unread += 1;
      continue;
    }
    seenGroupReact.add(note.meetingId);
    groupReacts.push({
      noticeId: note.id,
      meetingId: note.meetingId,
      subject: meetingNames.get(note.meetingId) || "Group",
      actorId: note.actorId,
      firstName: note.actor.firstName,
      lastName: note.actor.lastName,
      photoKey: note.actor.photoKey,
      emoji: note.emoji,
      preview: `${note.actor.firstName} reacted ${note.emoji}`,
      unread: 1,
    });
  }

  const friendNotices = dms.reduce((n, row) => n + row.unread, 0) + dmReacts.reduce((n, row) => n + row.unread, 0);

  return NextResponse.json({ dms, groups, dmReacts, groupReacts, friendNotices, groupNotices });
}
