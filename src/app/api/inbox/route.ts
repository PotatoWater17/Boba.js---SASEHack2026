import { NextResponse } from "next/server";
import { emptyInbox, loadInbox } from "@/inbox";
import { getMe } from "@/lib";

export async function GET() {
  const me = await getMe();
  if (!me) {
    return NextResponse.json(emptyInbox(), { status: 401 });
  }
  return NextResponse.json(await loadInbox(me.id));
}
