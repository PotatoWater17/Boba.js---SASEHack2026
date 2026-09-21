import { NextResponse } from "next/server";
import { attachExt, IMAGE_TYPES, readAvatarBytes } from "@/files";
import { getMe, prisma } from "@/lib";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new NextResponse("Login required", { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { photoKey: true } });
  const key = user?.photoKey || "";
  if (!key || key.includes("..") || key.includes("/") || key.includes("\\")) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readAvatarBytes(key);
    const mime = IMAGE_TYPES[attachExt(key)] || "image/jpeg";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
