import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function resolveCompanyId(req: NextRequest): Promise<string | null> {
  const headerCompanyId = req.headers.get("x-company-id");
  if (headerCompanyId) return headerCompanyId;

  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });

  return user?.defaultCompanyId || null;
}
