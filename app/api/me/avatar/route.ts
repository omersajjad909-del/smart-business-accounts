import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteMedia, isMediaConfigured, uploadMedia } from "@/lib/media";

function authUser(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function POST(req: NextRequest) {
  const payload = authUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
    }

    const userId = payload.userId as string;
    const buffer = Buffer.from(await file.arrayBuffer());
    // Inline data URLs are the fallback for when Cloudinary keys are not set.
    const avatar = isMediaConfigured()
      ? await uploadMedia(buffer, { kind: "avatars", scope: userId })
      : `data:${file.type};base64,${buffer.toString("base64")}`;

    const previous = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
    await prisma.user.update({
      where: { id: userId },
      data: { avatar },
    });
    await deleteMedia(previous?.avatar, { kind: "avatars", scope: userId });

    return NextResponse.json({ avatar });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const payload = authUser(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = payload.userId as string;
  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { avatar: true } });
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  });
  await deleteMedia(previous?.avatar, { kind: "avatars", scope: userId });

  return NextResponse.json({ success: true });
}
