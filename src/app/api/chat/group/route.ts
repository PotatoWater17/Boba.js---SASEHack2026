import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getMe, prisma } from "@/lib";
import { loadGroupLines } from "@/load-chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  await connection();
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  const meetingId = new URL(req.url).searchParams.get("meetingId") || "";
  if (!meetingId) return NextResponse.json({ error: "group" }, { status: 400 });
  const member = await prisma.member.findUnique({
    where: { meetingId_userId: { meetingId, userId: me.id } },
  });
  if (!member) return NextResponse.json({ error: "join" }, { status: 403 });
  const messages = await loadGroupLines(me.id, meetingId);
  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
