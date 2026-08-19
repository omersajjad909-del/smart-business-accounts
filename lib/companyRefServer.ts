import { prisma } from "@/lib/prisma";
import { isCompanyNoRef } from "@/lib/companyRef";

/**
 * Server half of the company-identifier helpers — see `lib/companyRef.ts` for
 * why `companyNo` is the only identifier that reaches a screen.
 */

/**
 * Turn a URL/param ref into the real `Company.id`.
 *
 * Named `resolveCompanyRef`, not `resolveCompanyId`, because `lib/tenant.ts`
 * already owns that name for a different job — deriving the caller's own
 * company from a request. This one converts an identifier the UI handed us.
 *
 * Accepts either form on purpose: new links carry the companyNo, but UUID
 * links already live in bookmarks, emails and old audit rows, so they keep
 * resolving. Returns null only when a numeric ref matches no company — a
 * UUID-shaped ref is handed back untouched and left for the caller's own
 * lookup to 404 on.
 */
export async function resolveCompanyRef(ref: string): Promise<string | null> {
  const trimmed = String(ref || "").trim();
  if (!trimmed) return null;
  if (!isCompanyNoRef(trimmed)) return trimmed;

  const companyNo = Number(trimmed);
  if (!Number.isSafeInteger(companyNo)) return null;

  const company = await prisma.company.findUnique({
    where: { companyNo },
    select: { id: true },
  });
  return company?.id ?? null;
}

/**
 * companyId → companyNo for a batch of rows.
 *
 * Rows in other tables (backups, logs, audit entries, payment requests) store
 * the company UUID, so any list built from them needs this to render `#100004`
 * instead of leaking the UUID. Missing companies are simply absent from the
 * map — callers fall back through `formatCompanyNo`.
 */
export async function getCompanyNoMap(
  companyIds: (string | null | undefined)[]
): Promise<Map<string, number>> {
  const ids = Array.from(
    new Set(companyIds.filter((id): id is string => typeof id === "string" && id.length > 0))
  );
  if (!ids.length) return new Map();

  const companies = await prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, companyNo: true },
  });
  return new Map(companies.map((c) => [c.id, c.companyNo]));
}
