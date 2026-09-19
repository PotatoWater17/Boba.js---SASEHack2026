import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { ATTACH_DIR } from "@/files";
import { getMe, prisma } from "@/lib";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new NextResponse("Login required", { status: 401 });

  const { id } = await params;
  const msg = await prisma.directMessage.findUnique({ where: { id } });
  if (!msg?.fileKey || msg.unsent) return new NextResponse("Not found", { status: 404 });
  if (msg.fromId !== me.id && msg.toId !== me.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(path.join(ATTACH_DIR, msg.fileKey));
    const inline = msg.fileMime.startsWith("image/") || msg.fileMime === "application/pdf";
    const name = (msg.fileName || "file").replace(/"/g, "");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": msg.fileMime || "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
