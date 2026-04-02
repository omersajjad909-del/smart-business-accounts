import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

export async function resolveCompanyId(req: NextRequest): Promise<string | null> {
  const headerCompanyId = req.headers.get("x-company-id");
  if (headerCompanyId) return headerCompanyId;

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    const token = getTokenFromRequest(req);
    const payload = token ? verifyJwt(token) : null;
    const tokenCompanyId =
      typeof payload?.companyId === "string"
        ? payload.companyId
        : typeof payload?.defaultCompanyId === "string"
          ? payload.defaultCompanyId
          : null;
    if (tokenCompanyId) return tokenCompanyId;
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });

  return user?.defaultCompanyId || null;
}

export async function resolveBranchId(req: NextRequest, companyId?: string | null): Promise<string | null> {
  const cid = companyId ?? (await resolveCompanyId(req));
  if (!cid) return null;

  const userId = req.headers.get("x-user-id");
  let allowedBranchIds: string[] | null = null;

  if (userId) {
    try {
      const settings = await getCompanyAdminControlSettings(cid);
      const assigned = settings.branchAssignments[userId];
      if (Array.isArray(assigned) && assigned.length > 0) {
        allowedBranchIds = assigned;
      }
    } catch {}
  }

  const headerBranchId = req.headers.get("x-branch-id");
  if (headerBranchId) {
    if (headerBranchId === "all") {
      return allowedBranchIds?.[0] || null;
    }
    if (!allowedBranchIds || allowedBranchIds.includes(headerBranchId)) {
      return headerBranchId;
    }
    return allowedBranchIds[0] || null;
  }

  const branch = await prisma.branch.findFirst({
    where: {
      companyId: cid,
      isActive: true,
      ...(allowedBranchIds ? { id: { in: allowedBranchIds } } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return branch?.id || null;
}

export async function resolveBranchIdOrDefault(req: NextRequest, companyId?: string | null): Promise<string | null> {
  const selected = await resolveBranchId(req, companyId);
  if (selected) return selected;
  const cid = companyId ?? (await resolveCompanyId(req));
  if (!cid) return null;
  const userId = req.headers.get("x-user-id");
  let allowedBranchIds: string[] | null = null;
  if (userId) {
    try {
      const settings = await getCompanyAdminControlSettings(cid);
      const assigned = settings.branchAssignments[userId];
      if (Array.isArray(assigned) && assigned.length > 0) {
        allowedBranchIds = assigned;
      }
    } catch {}
  }
  const branch = await prisma.branch.findFirst({
    where: {
      companyId: cid,
      isActive: true,
      ...(allowedBranchIds ? { id: { in: allowedBranchIds } } : {}),
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return branch?.id || null;
}
