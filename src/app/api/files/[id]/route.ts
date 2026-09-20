import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { ATTACH_DIR } from "@/files";
import { safeFileName } from "@/files";
import { areFriends, getMe, prisma } from "@/lib";

async function serveAttachment(fileKey: string, fileMime: string, fileName: string) {
  const buf = await readFile(path.join(ATTACH_DIR, fileKey));
  const inline = fileMime.startsWith("image/") || fileMime === "application/pdf";
  const name = safeFileName((fileName || "file").replace(/"/g, ""));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": fileMime || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new NextResponse("Login required", { status: 401 });

  const { id } = await params;

  const dm = await prisma.directMessage.findUnique({ where: { id } });
  if (dm?.fileKey && !dm.unsent) {
    if (dm.fromId !== me.id && dm.toId !== me.id) {
      return new NextResponse("Not found", { status: 404 });
    }
    const friends = await areFriends(dm.fromId, dm.toId);
    if (!friends) return new NextResponse("Not found", { status: 404 });
    try {
      return await serveAttachment(dm.fileKey, dm.fileMime, dm.fileName);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const msg = await prisma.message.findUnique({ where: { id } });
  if (msg?.fileKey && !msg.unsent) {
    const member = await prisma.member.findUnique({
      where: { meetingId_userId: { meetingId: msg.meetingId, userId: me.id } },
    });
    if (!member) return new NextResponse("Not found", { status: 404 });
    try {
      return await serveAttachment(msg.fileKey, msg.fileMime, msg.fileName);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
