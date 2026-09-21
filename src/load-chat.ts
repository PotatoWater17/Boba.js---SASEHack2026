import { prisma, timeAgo } from "@/lib";
import {
  dmThreadKey,
  groupThreadKey,
  overlayToDmLine,
  overlayToGroupLine,
  readChatOverlay,
} from "@/chat-overlay";
import { type DmInviteView, type DmLine, type GroupLine, mergeChatLines } from "@/chat-payload";
import { packReactions } from "@/reactions";

export async function loadDmLines(meId: string, friendId: string): Promise<DmLine[]> {
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromId: meId, toId: friendId },
        { fromId: friendId, toId: meId },
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

  const lines: DmLine[] = messages.map((msg) => {
    const raw = msg.inviteId ? inviteMap.get(msg.inviteId) : null;
    const invite: DmInviteView | null = raw
      ? {
          id: raw.id,
          status: raw.status,
          meetingId: raw.meetingId,
          meeting: {
            subject: raw.meeting.subject,
            topic: raw.meeting.topic,
            meetDate: raw.meeting.meetDate,
            time: raw.meeting.time,
            location: raw.meeting.location,
          },
        }
      : null;
    return {
      id: msg.id,
      fromId: msg.fromId,
      fromName: msg.from.firstName,
      createdAt: msg.createdAt.toISOString(),
      text: msg.text,
      unsent: msg.unsent,
      fileKey: msg.fileKey,
      fileName: msg.fileName,
      fileMime: msg.fileMime,
      inviteId: msg.inviteId,
      invite,
      reactions: packReactions(msg.reactions, meId),
      ago: timeAgo(msg.createdAt),
    };
  });

  const overlay = (await readChatOverlay(dmThreadKey(meId, friendId)))
    .map(overlayToDmLine)
    .filter((row): row is DmLine => Boolean(row));
  return mergeChatLines(lines, overlay, [], (m) => m.fromId);
}

export async function loadGroupLines(meId: string, meetingId: string): Promise<GroupLine[]> {
  const messages = await prisma.message.findMany({
    where: { meetingId },
    include: {
      user: true,
      reactions: { include: { user: { select: { id: true, firstName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const lines: GroupLine[] = messages.map((msg) => ({
    id: msg.id,
    userId: msg.userId,
    firstName: msg.user.firstName,
    lastName: msg.user.lastName,
    photoKey: msg.user.photoKey,
    createdAt: msg.createdAt.toISOString(),
    text: msg.text,
    unsent: msg.unsent,
    authorRemoved: msg.authorRemoved,
    fileKey: msg.fileKey,
    fileName: msg.fileName,
    fileMime: msg.fileMime,
    reactions: packReactions(msg.reactions ?? [], meId),
  }));

  const overlay = (await readChatOverlay(groupThreadKey(meetingId)))
    .map(overlayToGroupLine)
    .filter((row): row is GroupLine => Boolean(row));
  return mergeChatLines(lines, overlay, [], (m) => m.userId);
}
