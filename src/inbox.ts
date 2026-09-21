import { unstable_noStore as noStore } from "next/cache";
import { groupActivityTable } from "@/group-activity";
import { acceptedFriendIds, blockedUserIds, groupMessagePreview, prisma } from "@/lib";
import type {
  InboxBuddyRequest,
  InboxDm,
  InboxDmReact,
  InboxGroup,
  InboxGroupActivity,
  InboxGroupReact,
  InboxJoinRequest,
  InboxMeetupInvite,
  InboxPayload,
} from "@/inbox-types";

export type {
  InboxBuddyRequest,
  InboxDm,
  InboxDmReact,
  InboxGroup,
  InboxGroupActivity,
  InboxGroupReact,
  InboxJoinRequest,
  InboxMeetupInvite,
  InboxPayload,
} from "@/inbox-types";
export { emptyInbox } from "@/inbox-types";

export async function loadInbox(meId: string): Promise<InboxPayload> {
  noStore();
  const [blocked, friendIds] = await Promise.all([blockedUserIds(meId), acceptedFriendIds(meId)]);
  const allowed = [...friendIds].filter((id) => !blocked.has(id));
  const blockedList = [...blocked];
  const notBlocked = blockedList.length ? { notIn: blockedList } : undefined;

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
  const friendNotices = allowed.length
    ? await prisma.directMessage.count({
        where: {
          toId: meId,
          seen: false,
          unsent: false,
          fromId: { in: allowed },
        },
      })
    : 0;

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
      createdAt: msg.createdAt.toISOString(),
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

  const [buddyRows, inviteRows, joinRows] = await Promise.all([
    prisma.friendship.findMany({
      where: { toId: meId, status: "pending", ...(notBlocked ? { fromId: notBlocked } : {}) },
      include: { from: { select: { id: true, firstName: true, lastName: true, photoKey: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.meetupInvite.findMany({
      where: { toId: meId, status: "pending", ...(notBlocked ? { fromId: notBlocked } : {}) },
      include: {
        from: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        meeting: { select: { id: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.meetingJoinRequest.findMany({
      where: {
        status: "pending",
        meeting: { hostId: meId },
        ...(notBlocked ? { userId: notBlocked } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, photoKey: true } },
        meeting: { select: { id: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const buddyRequests: InboxBuddyRequest[] = buddyRows.map((row) => ({
    fromId: row.from.id,
    firstName: row.from.firstName,
    lastName: row.from.lastName,
    photoKey: row.from.photoKey,
    createdAt: row.createdAt.toISOString(),
  }));
  const meetupInvites: InboxMeetupInvite[] = inviteRows.map((row) => ({
    inviteId: row.id,
    meetingId: row.meeting.id,
    subject: row.meeting.subject,
    fromId: row.from.id,
    firstName: row.from.firstName,
    lastName: row.from.lastName,
    photoKey: row.from.photoKey,
    createdAt: row.createdAt.toISOString(),
  }));
  const joinRequests: InboxJoinRequest[] = joinRows.map((row) => ({
    requestId: row.id,
    meetingId: row.meeting.id,
    subject: row.meeting.subject,
    fromId: row.user.id,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    photoKey: row.user.photoKey,
    createdAt: row.createdAt.toISOString(),
  }));

  const activityTable = groupActivityTable();
  const activityRows = activityTable
    ? await activityTable.findMany({
        where: { userId: meId, seen: false },
        orderBy: { createdAt: "desc" },
        take: 40,
      })
    : [];
  const groupActivity: InboxGroupActivity[] = activityRows.map((row) => ({
    noticeId: row.id,
    kind: row.kind === "kicked" || row.kind === "disbanded" ? row.kind : "leave",
    meetingId: row.meetingId,
    subject: row.subject,
    actorId: row.actorId,
    actorName: row.actorName,
    actorPhoto: row.actorPhoto,
    createdAt: row.createdAt.toISOString(),
  }));
  const activityCount = buddyRequests.length + meetupInvites.length + joinRequests.length + groupActivity.length;

  const groups: InboxGroup[] = [];
  let groupNotices = 0;

  if (memberships.length) {
    const lastRead = new Map(memberships.map((m) => [m.meetingId, m.lastReadAt.getTime()]));
    const meetingIds = memberships.map((m) => m.meetingId);
    const unreadTimes = await prisma.message.findMany({
      where: {
        meetingId: { in: meetingIds },
        userId: { not: meId },
        unsent: false,
      },
      select: { meetingId: true, createdAt: true },
    });
    groupNotices = unreadTimes.filter((msg) => msg.createdAt.getTime() > (lastRead.get(msg.meetingId) || 0)).length;

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
        createdAt: msg.createdAt.toISOString(),
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
    buddyRequests,
    meetupInvites,
    joinRequests,
    groupActivity,
    friendNotices,
    groupNotices,
    activityCount,
  };
}
