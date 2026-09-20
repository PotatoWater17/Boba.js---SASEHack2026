import { PrismaClient } from "@prisma/client";
import { inferMeetingOnline } from "../src/meeting-format";

const prisma = new PrismaClient();

async function main() {
  const meetings = await prisma.meeting.findMany({ select: { id: true, location: true, isOnline: true } });
  let updated = 0;

  for (const meeting of meetings) {
    const inferred = inferMeetingOnline(meeting.location);
    if (meeting.isOnline !== inferred) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { isOnline: inferred },
      });
      updated += 1;
    }
  }

  console.log(`Backfilled isOnline on ${updated} of ${meetings.length} meetings.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
