import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

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

  // 2️⃣ Role based permission
  const roleAllowed = await prisma.rolePermission.findFirst({
    where: { role, permission },
  });

  if (roleAllowed) return null;

  // 3️⃣ User specific permission
  const userAllowed = await prisma.userPermission.findFirst({
    where: { userId, permission },
  });

  if (userAllowed) return null;

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
