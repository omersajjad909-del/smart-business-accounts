import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();
type RolePermission = Prisma.RolePermissionGetPayload<Prisma.RolePermissionDefaultArgs>;


if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }
  const role = new URL(req.url).searchParams.get("role") || "";
  const perms = await prisma.rolePermission.findMany({ where: { role, companyId } });
 return NextResponse.json(
  perms.map((p: RolePermission) => p.permission)
);


}

export async function POST(req: NextRequest) {
  const headerRole = req.headers.get("x-user-role");
  if (headerRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  const { role, permissions } = await req.json();

  await prisma.rolePermission.deleteMany({ where: { role, companyId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((p: string) => ({ role, permission: p, companyId })),
  });

  return NextResponse.json({ success: true });
}
