import { Prisma } from "@prisma/client";
import { prisma } from "@/lib";

export type JoinMeetingResult = "joined" | "full" | "member" | "missing";

function isRetryableConflict(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}

/** Atomically add a member when the group has capacity (retries on serializable conflicts). */
export async function addMeetingMemberIfRoom(
  meetingId: string,
  userId: string,
): Promise<JoinMeetingResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const meeting = await tx.meeting.findUnique({
            where: { id: meetingId },
            select: { maxSize: true },
          });
          if (!meeting) return "missing";

          const existing = await tx.member.findUnique({
            where: { meetingId_userId: { meetingId, userId } },
          });
          if (existing) return "member";

          const count = await tx.member.count({ where: { meetingId } });
          if (count >= meeting.maxSize) return "full";

          await tx.member.create({ data: { meetingId, userId } });
          return "joined";
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      if (isRetryableConflict(err) && attempt < 2) continue;
      throw err;
    }
  }
  return "full";
}
