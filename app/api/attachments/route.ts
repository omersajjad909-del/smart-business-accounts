import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

  // If entityId filter needed, apply in-memory (JSON path filtering is DB-specific)
  const filtered = entityId
    ? records.filter(r => (r.data as Record<string, unknown>)?.entityId === entityId)
    : records;

  return NextResponse.json(filtered.map(r => {
    const d = r.data as Record<string, unknown>;
    return {
      id:         r.id,
      fileName:   String(d.fileName || r.title),
      fileUrl:    String(d.fileUrl || ""),
      fileSize:   Number(d.fileSize || 0),
      fileType:   String(d.fileType || ""),
      entityType: String(d.entityType || ""),
      entityId:   String(d.entityId || ""),
      uploadedAt: r.createdAt,
    };
  }));
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

    // Save file to public/uploads/{companyId}/
    const uploadDir = path.join(process.cwd(), "public", "uploads", companyId);
    await mkdir(uploadDir, { recursive: true });

    const ext      = path.extname(file.name) || "";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(uploadDir, safeName);
    const buffer   = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${companyId}/${safeName}`;

    const record = await prisma.businessRecord.create({
      data: {
        category:  "attachment",
        title:     file.name,
        status:    "ACTIVE",
        amount:    0,
        companyId,
        data: {
          fileName:   file.name,
          fileUrl,
          fileSize:   file.size,
          fileType:   file.type,
          entityType: entityType || "",
          entityId:   entityId   || "",
          uploadedBy: userId,
        },
      },
    });

    return NextResponse.json({ id: record.id, fileName: file.name, fileUrl, fileSize: file.size, fileType: file.type }, { status: 201 });
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

  await prisma.businessRecord.deleteMany({ where: { id, companyId, category: "attachment" } });
  return NextResponse.json({ ok: true });
}
