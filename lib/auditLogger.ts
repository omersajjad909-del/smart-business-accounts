import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function logAudit({
  companyId,
  userId,
  userName,
  userRole,
  entity,
  entityId,
  action,
  beforeValues,
  afterValues,
  description
}: {
  companyId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  beforeValues?: any;
  afterValues?: any;
  description?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName,
        userRole,
        entity,
        entityId,
        action,
        beforeValues: beforeValues ? JSON.stringify(beforeValues) : null,
        afterValues: afterValues ? JSON.stringify(afterValues) : null,
        description,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Extracts user context from headers and logs audit
 */
export async function logAuditFromReq(
  req: NextRequest,
  {
    companyId,
    entity,
    entityId,
    action,
    beforeValues,
    afterValues,
    description
  }: {
    companyId: string;
    entity: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
    beforeValues?: any;
    afterValues?: any;
    description?: string;
  }
) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  // Assuming userName might be in headers too if we add it in proxy.ts
  const userName = req.headers.get("x-user-name"); 

  return logAudit({
    companyId,
    userId,
    userName,
    userRole,
    entity,
    entityId,
    action,
    beforeValues,
    afterValues,
    description
  });
}
