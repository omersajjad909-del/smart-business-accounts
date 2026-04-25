import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    await prisma.company.update({
      where: { id: companyId },
      data: { logoUrl: base64 },
    });

    return NextResponse.json({ logoUrl: base64 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  await prisma.company.update({
    where: { id: companyId },
    data: { logoUrl: null },
  });

  return NextResponse.json({ success: true });
}
