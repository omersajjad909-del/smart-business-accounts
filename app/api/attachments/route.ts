import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ATTACHMENTS_BUCKET,
  isSupabaseStorageConfigured,
  supabaseAdmin,
} from "@/lib/supabase";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour

async function toSignedUrl(storagePath: string): Promise<string> {
  if (!storagePath) return "";
  // Legacy records: still on local filesystem — return raw fileUrl as-is
  if (storagePath.startsWith("/uploads/")) return storagePath;
  if (storagePath.startsWith("http")) return storagePath;

  if (!supabaseAdmin) return "";
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
    if (error || !data) return "";
    return data.signedUrl;
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId   = searchParams.get("entityId");

  const where: Record<string, unknown> = { category: "attachment", companyId };
  if (entityType) where.data = { path: ["entityType"], equals: entityType };

  const records = await prisma.businessRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filtered = entityId
    ? records.filter(r => (r.data as Record<string, unknown>)?.entityId === entityId)
    : records;

  const results = await Promise.all(
    filtered.map(async r => {
      const d = r.data as Record<string, unknown>;
      const storagePath = String(d.storagePath || d.fileUrl || "");
      const fileUrl = await toSignedUrl(storagePath);
      return {
        id:         r.id,
        fileName:   String(d.fileName || r.title),
        fileUrl,
        fileSize:   Number(d.fileSize || 0),
        fileType:   String(d.fileType || ""),
        entityType: String(d.entityType || ""),
        entityId:   String(d.entityId || ""),
        uploadedAt: r.createdAt,
      };
    })
  );

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  const userId    = req.headers.get("x-user-id");
  if (!companyId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData   = await req.formData();
    const file       = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId   = formData.get("entityId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

    // Validate file type
    const ALLOWED = ["image/jpeg","image/png","image/gif","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/plain","text/csv"];
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "File type not allowed" }, { status: 400 });

    const ext        = path.extname(file.name) || "";
    const safeName   = `${Date.now()}-${randomUUID()}${ext}`;
    const storagePath = `${companyId}/${safeName}`;
    const buffer     = Buffer.from(await file.arrayBuffer());

    let signedUrl = "";
    let storedPath = "";
    let storageMode: "supabase" | "local" = "local";

    // Prefer Supabase Storage in production
    if (isSupabaseStorageConfigured() && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(storagePath, buffer, { contentType: file.type, upsert: false });

        if (!error) {
          const { data: signed } = await supabaseAdmin.storage
            .from(ATTACHMENTS_BUCKET)
            .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
          signedUrl = signed?.signedUrl || "";
          storedPath = storagePath;
          storageMode = "supabase";
        } else {
          console.error("Attachment Supabase upload failed:", error.message);
        }
      } catch (err) {
        console.error("Attachment Supabase upload exception:", err);
      }
    }

    // Fallback: local filesystem (only useful in dev — files won't persist on Vercel)
    if (storageMode === "local") {
      const uploadDir = path.join(process.cwd(), "public", "uploads", companyId);
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeName);
      await writeFile(filePath, buffer);
      storedPath = `/uploads/${companyId}/${safeName}`;
      signedUrl = storedPath;
    }

    const record = await prisma.businessRecord.create({
      data: {
        category:  "attachment",
        title:     file.name,
        status:    "ACTIVE",
        amount:    0,
        companyId,
        data: {
          fileName:    file.name,
          storagePath: storedPath,
          fileSize:    file.size,
          fileType:    file.type,
          entityType:  entityType || "",
          entityId:    entityId   || "",
          uploadedBy:  userId,
          storageMode,
        },
      },
    });

    return NextResponse.json(
      { id: record.id, fileName: file.name, fileUrl: signedUrl, fileSize: file.size, fileType: file.type },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const companyId = req.headers.get("x-company-id");
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Load the record to get its storagePath before deletion — required for orphan cleanup
  const record = await prisma.businessRecord.findFirst({
    where: { id, companyId, category: "attachment" },
    select: { data: true },
  });

  if (record) {
    const d = record.data as Record<string, unknown>;
    const storagePath = String(d.storagePath || "");
    // Delete from Supabase Storage if it's a bucket-hosted file
    if (storagePath && !storagePath.startsWith("/uploads/") && !storagePath.startsWith("http") && supabaseAdmin) {
      try {
        await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
      } catch (err) {
        console.error("Attachment Supabase delete failed:", err);
      }
    }
  }

  await prisma.businessRecord.deleteMany({ where: { id, companyId, category: "attachment" } });
  return NextResponse.json({ ok: true });
}
