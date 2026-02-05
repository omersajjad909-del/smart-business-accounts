import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { resolveCompanyId } from "@/lib/tenant";

export async function requirePermission(
  req: Request,
  permission: string
) {
  const userId = req.headers.get("x-user-id");
  const role = req.headers.get("x-user-role");

  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 1️⃣ ADMIN = full power
  if (role === "ADMIN") return null;

  const companyId = await resolveCompanyId(req as Any);
  if (!companyId) {
    return NextResponse.json({ error: "Company required" }, { status: 400 });
  }

  // 2️⃣ Role based permission
  const roleAllowed = await prisma.rolePermission.findFirst({
    where: { role, permission, companyId },
  });

  if (roleAllowed) return null;

  // 3️⃣ User specific permission
  const userAllowed = await prisma.userPermission.findFirst({
    where: { userId, permission, companyId },
  });

  if (userAllowed) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
