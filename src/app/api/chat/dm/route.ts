import { NextResponse } from "next/server";
import { connection } from "next/server";
import { areFriends, getMe, isBlockedBetween } from "@/lib";
import { loadDmLines } from "@/load-chat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  await connection();
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "auth" }, { status: 401 });
  const userId = new URL(req.url).searchParams.get("userId") || "";
  if (!userId || userId === me.id) return NextResponse.json({ error: "user" }, { status: 400 });
  if (await isBlockedBetween(me.id, userId)) return NextResponse.json({ error: "blocked" }, { status: 403 });
  if (!(await areFriends(me.id, userId))) return NextResponse.json({ error: "buddy" }, { status: 403 });
  const messages = await loadDmLines(me.id, userId);
  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
