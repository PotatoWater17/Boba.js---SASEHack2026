import { prisma } from "@/lib";

export type GroupActivityKind = "leave" | "kicked" | "disbanded";

type ActivityTable = {
  findMany: (args: unknown) => Promise<
    Array<{
      id: string;
      kind: string;
      meetingId: string;
      subject: string;
      actorId: string;
      actorName: string;
      actorPhoto: string;
      createdAt: Date;
    }>
  >;
  createMany: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
};

export function groupActivityTable() {
  return (prisma as unknown as { groupActivityNotice?: ActivityTable }).groupActivityNotice ?? null;
}

export async function createGroupActivityNotices(
  rows: Array<{
    userId: string;
    kind: GroupActivityKind;
    meetingId: string;
    subject: string;
    actorId?: string;
    actorName?: string;
    actorPhoto?: string;
  }>,
) {
  const data = rows.filter((row) => row.userId);
  if (!data.length) return;
  const table = groupActivityTable();
  if (!table) {
    console.error("groupActivityNotice is missing from Prisma client — run npx prisma generate");
    return;
  }
  await table.createMany({
    data: data.map((row) => ({
      userId: row.userId,
      kind: row.kind,
      meetingId: row.meetingId,
      subject: row.subject,
      actorId: row.actorId || "",
      actorName: row.actorName || "",
      actorPhoto: row.actorPhoto || "",
    })),
  });
}

export function personLabel(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}
