import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, isSupabaseStorageConfigured } from "@/lib/supabase";
import { randomUUID } from "crypto";

const LOGO_BUCKET = "company-logos";
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  const role      = req.headers.get("x-user-role");
  if (!companyId || companyId === "system") return unauthorized();
  if (String(role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can update the logo" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED.has(file.type))
      return NextResponse.json({ error: "Only PNG, JPEG, WebP, or SVG allowed" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Logo must be under 1 MB" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const buffer = Buffer.from(await file.arrayBuffer());
    let logoUrl: string;

    if (isSupabaseStorageConfigured() && supabaseAdmin) {
      const path = `${companyId}/${randomUUID()}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from(LOGO_BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false });

      if (error) {
        console.error("Company logo upload failed:", error.message);
        // Fallback to inline data URL below
      } else {
        const { data: pub } = supabaseAdmin.storage.from(LOGO_BUCKET).getPublicUrl(path);
        logoUrl = pub.publicUrl;
        await prisma.company.update({ where: { id: companyId }, data: { logoUrl } });
        return NextResponse.json({ logoUrl });
      }
    }

    // Fallback (or dev): inline data URL — capped at 1 MB
    logoUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    await prisma.company.update({ where: { id: companyId }, data: { logoUrl } });
    return NextResponse.json({ logoUrl, storage: "inline" });
  } catch (err: any) {
    console.error("Logo upload error:", err?.message || err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  const role      = req.headers.get("x-user-role");
  if (!companyId || companyId === "system") return unauthorized();
  if (String(role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can remove the logo" }, { status: 403 });
  }

  await prisma.company.update({ where: { id: companyId }, data: { logoUrl: null } });
  return NextResponse.json({ ok: true });
}
