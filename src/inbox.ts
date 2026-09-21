import { acceptedFriendIds, blockedUserIds, groupMessagePreview, prisma } from "@/lib";

export type InboxDm = {
  fromId: string;
  msgId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  preview: string;
  unread: number;
};

export type InboxGroup = {
  meetingId: string;
  msgId: string;
  subject: string;
  fromId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  preview: string;
  unread: number;
};

export type InboxDmReact = {
  noticeId: string;
  actorId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  emoji: string;
  preview: string;
  unread: number;
};

export type InboxGroupReact = {
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
};

export type InboxPayload = {
  dms: InboxDm[];
  groups: InboxGroup[];
  dmReacts: InboxDmReact[];
  groupReacts: InboxGroupReact[];
  friendNotices: number;
  groupNotices: number;
};

export const emptyInbox = (): InboxPayload => ({
  dms: [],
  groups: [],
  dmReacts: [],
  groupReacts: [],
  friendNotices: 0,
  groupNotices: 0,
});

export async function loadInbox(meId: string): Promise<InboxPayload> {
  const [blocked, friendIds] = await Promise.all([blockedUserIds(meId), acceptedFriendIds(meId)]);
  const allowed = [...friendIds].filter((id) => !blocked.has(id));

  const unread = allowed.length
    ? await prisma.directMessage.findMany({
        where: {
          toId: meId,
          seen: false,
          unsent: false,
          fromId: { in: allowed },
        },
        include: {
          from: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];

  const dms: InboxDm[] = [];
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
      preview: msg.text || (msg.fileName ? "Sent an attachment" : "New message"),
      unread: 1,
    });
  }

  const reactUnread = await prisma.reactionNotice.findMany({
    where: { userId: meId, seen: false },
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const dmReacts: InboxDmReact[] = [];
  const seenDmReact = new Set<string>();
  for (const note of reactUnread.filter((n) => n.dmId && allowed.includes(n.actorId))) {
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
    where: { userId: meId },
    select: { meetingId: true, lastReadAt: true },
  });

  const groups: InboxGroup[] = [];
  let groupNotices = 0;

  if (memberships.length) {
    const lastRead = new Map(memberships.map((m) => [m.meetingId, m.lastReadAt.getTime()]));
    const meetingIds = memberships.map((m) => m.meetingId);
    const msgs = await prisma.message.findMany({
      where: {
        meetingId: { in: meetingIds },
        userId: { not: meId },
        unsent: false,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        meeting: { select: { subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    });

    groupNotices = msgs.filter((msg) => msg.createdAt.getTime() > (lastRead.get(msg.meetingId) || 0)).length;

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

  const groupReacts: InboxGroupReact[] = [];
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

  return {
    dms,
    groups,
    dmReacts,
    groupReacts,
    friendNotices: dms.reduce((n, row) => n + row.unread, 0),
    groupNotices,
  };
}
