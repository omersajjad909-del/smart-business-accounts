import { prisma } from "@/lib/prisma";

/**
 * Company-level security policy.
 *
 * The Security & Access screen has always shown a "2FA enforcement" tile, but
 * /api/security/access returned `twoFactorEnforced: false` as a literal — the
 * tile could never say anything but "Not configured", nothing stored a choice,
 * and nothing acted on one. This is the store behind it.
 *
 * Kept in ActivityLog (companyId-scoped, newest row wins), the same way the SSO
 * config and the plan config are stored, so no migration is needed.
 */

export const SECURITY_POLICY_ACTION = "SECURITY_POLICY_UPDATED";

export type SecurityPolicy = {
  /** Every user of this company must have an authenticator app enrolled. */
  twoFactorEnforced: boolean;
};

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  twoFactorEnforced: false,
};

export async function getSecurityPolicy(companyId: string | null | undefined): Promise<SecurityPolicy> {
  if (!companyId) return { ...DEFAULT_SECURITY_POLICY };
  try {
    const row = await prisma.activityLog.findFirst({
      where: { companyId, action: SECURITY_POLICY_ACTION },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    if (!row?.details) return { ...DEFAULT_SECURITY_POLICY };
    const parsed = JSON.parse(row.details) as Partial<SecurityPolicy>;
    return { twoFactorEnforced: parsed.twoFactorEnforced === true };
  } catch {
    return { ...DEFAULT_SECURITY_POLICY };
  }
}

export async function setSecurityPolicy(
  companyId: string,
  policy: SecurityPolicy,
  userId?: string | null,
): Promise<SecurityPolicy> {
  const next: SecurityPolicy = { twoFactorEnforced: policy.twoFactorEnforced === true };
  await prisma.activityLog.create({
    data: {
      companyId,
      // The row is written by whoever changed the policy, so the audit trail
      // and the Security & Access event feed both show who did it.
      userId: userId || null,
      action: SECURITY_POLICY_ACTION,
      details: JSON.stringify(next),
    },
  });
  return next;
}

/**
 * True when this user is being let in while the company requires 2FA and they
 * have not enrolled yet. The dashboard sends them to Security & Access until
 * they do — blocking the login outright would lock them out of the only screen
 * where 2FA can be enabled.
 */
export async function needsTwoFactorEnrollment(
  companyId: string | null | undefined,
  userTwoFactorEnabled: boolean,
): Promise<boolean> {
  if (userTwoFactorEnabled) return false;
  const policy = await getSecurityPolicy(companyId);
  return policy.twoFactorEnforced;
}
