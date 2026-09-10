import { prisma } from "@/lib/prisma";

/**
 * A company IS its own first branch — the trader's own name and address, not
 * an empty placeholder record. Creating this alongside the Company row means
 * a Starter company (1 branch allowed) arrives already at its limit, so the
 * "create another company to get another free branch" loophole closes: every
 * company, however it was created, starts pre-consumed.
 */
export async function createDefaultBranchForCompany(
  companyId: string,
  details: { name: string; city?: string | null; address?: string | null; phone?: string | null },
) {
  try {
    return await prisma.branch.create({
      data: {
        companyId,
        code: "MAIN",
        name: details.name,
        city: details.city ?? null,
        address: details.address ?? null,
        phone: details.phone ?? null,
        isActive: true,
      },
    });
  } catch {
    // Non-fatal — e.g. a retried request hitting the (companyId, code) unique
    // constraint. The company still works with zero branches recorded, and
    // the branch-limit check treats that as room for one, not less.
    return null;
  }
}
