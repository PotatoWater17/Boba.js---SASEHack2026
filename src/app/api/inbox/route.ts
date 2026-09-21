import { NextResponse } from "next/server";
import { emptyInbox, loadInbox } from "@/inbox";
import { getMe } from "@/lib";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0, must-revalidate" };

export async function GET() {
  const me = await getMe();
  if (!me) {
    return NextResponse.json(emptyInbox(), { status: 401, headers: NO_STORE });
  }
  return NextResponse.json(await loadInbox(me.id), { headers: NO_STORE });
}
