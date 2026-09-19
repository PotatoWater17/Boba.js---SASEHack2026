import { prisma } from "@/lib";

export function formatAccountId(accountNo: number | null | undefined) {
  if (!accountNo) return "SB-000000";
  return `SB-${String(accountNo).padStart(6, "0")}`;
}

export function parseAccountQuery(raw: string): number | null {
  const q = raw.trim();
  if (!q) return null;
  const tagged = q.match(/^sb-(\d+)$/i);
  if (tagged) return Number(tagged[1]);
  if (/^\d+$/.test(q)) return Number(q);
  return null;
}

export async function nextAccountNo() {
  const { _max } = await prisma.user.aggregate({ _max: { accountNo: true } });
  return (_max.accountNo ?? 0) + 1;
}

export async function backfillAccountNumbers() {
  const missing = await prisma.user.findMany({
    where: { accountNo: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!missing.length) return;
  let next = (await prisma.user.aggregate({ _max: { accountNo: true } }))._max.accountNo ?? 0;
  for (const user of missing) {
    next += 1;
    await prisma.user.update({ where: { id: user.id }, data: { accountNo: next } });
  }
}
