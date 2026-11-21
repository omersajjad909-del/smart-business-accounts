import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMedia, isMediaConfigured, uploadMedia } from "@/lib/media";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST multipart { teacherId, photo } — sets or replaces the teacher's profile photo.
 * Stored on Cloudinary under students/<companyId>/. Unlike user avatars there is no
 * inline base64 fallback: a child's photo in a table row would ride along with every
 * student list query, so if storage is not available the upload is refused instead.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  if (!isMediaConfigured()) return bad("Image storage is not configured on this server", 503);

  const form = await req.formData().catch(() => null);
  const teacherId = str(form?.get("teacherId"));
  const file = form?.get("photo");
  if (!teacherId || !(file instanceof File)) return bad("teacherId and photo are required");
  if (!TYPES.includes(file.type)) return bad("Photo must be a JPG, PNG or WebP image");
  if (file.size > MAX_BYTES) return bad("Photo must be under 2MB");

  const student = await prisma.schoolTeacher.findFirst({ where: { id: teacherId, companyId: ctx.companyId }, select: { photoUrl: true } });
  if (!student) return bad("Teacher not found", 404);

  let photoUrl: string;
  try {
    photoUrl = await uploadMedia(Buffer.from(await file.arrayBuffer()), { kind: "teachers", scope: ctx.companyId });
  } catch (err) {
    console.error("[school] photo upload failed", err);
    return bad("Photo upload failed, please try again", 502);
  }
  await prisma.schoolTeacher.update({ where: { id: teacherId }, data: { photoUrl } });
  await deleteMedia(student.photoUrl, { kind: "teachers", scope: ctx.companyId });
  return NextResponse.json({ photoUrl });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const teacherId = str(new URL(req.url).searchParams.get("teacherId"));
  const student = await prisma.schoolTeacher.findFirst({ where: { id: teacherId, companyId: ctx.companyId }, select: { photoUrl: true } });
  if (!student) return bad("Teacher not found", 404);
  await prisma.schoolTeacher.update({ where: { id: teacherId }, data: { photoUrl: null } });
  await deleteMedia(student.photoUrl, { kind: "teachers", scope: ctx.companyId });
  return NextResponse.json({ ok: true });
}
