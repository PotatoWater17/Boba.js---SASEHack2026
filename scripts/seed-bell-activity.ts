import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ryan = await prisma.user.findFirst({
    where: { email: "ryanh@auburn.edu" },
    select: { id: true },
  });
  if (!ryan) {
    console.log("no ryan user");
    return;
  }

  const member = await prisma.member.findFirst({
    where: { userId: ryan.id },
    include: { meeting: { select: { id: true, subject: true } } },
  });

  await prisma.groupActivityNotice.createMany({
    data: [
      {
        userId: ryan.id,
        kind: "disbanded",
        meetingId: "",
        subject: "Sunday Cram Session",
        actorName: "StudyBuddy Host",
      },
      {
        userId: ryan.id,
        kind: "kicked",
        meetingId: "",
        subject: "Physics Lab Group",
        actorName: "Alex Kim",
      },
      ...(member
        ? [
            {
              userId: ryan.id,
              kind: "leave" as const,
              meetingId: member.meeting.id,
              subject: member.meeting.subject,
              actorName: "Jordan Lee",
            },
          ]
        : []),
    ],
  });
  console.log("seeded group activity for", ryan.id, member ? `leave:${member.meeting.subject}` : "no-leave");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
