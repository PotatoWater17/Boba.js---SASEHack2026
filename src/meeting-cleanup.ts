import { removeAttach } from "@/files";
import { prisma } from "@/lib";

/** Remove attachments, reaction alerts, and the meeting row. */
export async function purgeMeeting(meetingId: string) {
  const files = await prisma.message.findMany({
    where: { meetingId, fileKey: { not: "" } },
    select: { fileKey: true },
  });
  for (const msg of files) await removeAttach(msg.fileKey);

  const messageIds = (
    await prisma.message.findMany({ where: { meetingId }, select: { id: true } })
  ).map((m) => m.id);

  await prisma.reactionNotice.deleteMany({
    where: {
      OR: [{ meetingId }, ...(messageIds.length ? [{ messageId: { in: messageIds } }] : [])],
    },
  });

  await prisma.meeting.delete({ where: { id: meetingId } });
}

/** Delete the meeting when nobody is left in it. Returns true if removed. */
export async function removeMeetingIfEmpty(meetingId: string) {
  const count = await prisma.member.count({ where: { meetingId } });
  if (count > 0) return false;
  await purgeMeeting(meetingId);
  return true;
}

/** Remove any meetings left with zero members (safety net). */
export async function purgeOrphanMeetings() {
  const empty = await prisma.meeting.findMany({
    where: { members: { none: {} } },
    select: { id: true },
  });
  for (const meeting of empty) await purgeMeeting(meeting.id);
}
