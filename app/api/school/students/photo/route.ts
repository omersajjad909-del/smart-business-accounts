import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMedia, isMediaConfigured, uploadMedia } from "@/lib/media";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST multipart { studentId, photo } — sets or replaces the student's profile photo.
 * Stored on Cloudinary under students/<companyId>/. Unlike user avatars there is no
 * inline base64 fallback: a child's photo in a table row would ride along with every
 * student list query, so if storage is not available the upload is refused instead.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  if (!isMediaConfigured()) return bad("Image storage is not configured on this server", 503);

  const form = await req.formData().catch(() => null);
  const studentId = str(form?.get("studentId"));
  const file = form?.get("photo");
  if (!studentId || !(file instanceof File)) return bad("studentId and photo are required");
  if (!TYPES.includes(file.type)) return bad("Photo must be a JPG, PNG or WebP image");
  if (file.size > MAX_BYTES) return bad("Photo must be under 2MB");

  const student = await prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: ctx.companyId }, select: { photoUrl: true } });
  if (!student) return bad("Student not found", 404);

  let photoUrl: string;
  try {
    photoUrl = await uploadMedia(Buffer.from(await file.arrayBuffer()), { kind: "students", scope: ctx.companyId });
  } catch (err) {
    console.error("[school] photo upload failed", err);
    return bad("Photo upload failed, please try again", 502);
  }
  await prisma.schoolStudent.update({ where: { id: studentId }, data: { photoUrl } });
  await deleteMedia(student.photoUrl, { kind: "students", scope: ctx.companyId });
  return NextResponse.json({ photoUrl });
}

export async function DELETE(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const studentId = str(new URL(req.url).searchParams.get("studentId"));
  const student = await prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: ctx.companyId }, select: { photoUrl: true } });
  if (!student) return bad("Student not found", 404);
  await prisma.schoolStudent.update({ where: { id: studentId }, data: { photoUrl: null } });
  await deleteMedia(student.photoUrl, { kind: "students", scope: ctx.companyId });
  return NextResponse.json({ ok: true });
}
