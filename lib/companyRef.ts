import { prisma } from "@/lib/prisma";

/**
 * One company identifier for every screen.
 *
 * A company carries two identifiers: `Company.id` — a UUID primary key that
 * the foreign keys of ~100 tables point at — and `Company.companyNo`, a short
 * unique autoincrement int. The UUID has to stay the database key, but showing
 * both was a constant source of confusion: the companies list showed
 * "#100004", the URL for that same row showed "36fe6682-…", and the backup
 * table showed a third-looking "9806c891-…" for a different company of the
 * same name. Three strings, and no way to tell from a screen which two meant
 * one company.
 *
 * So `companyNo` is now the ONLY identifier that reaches a screen or a URL.
 * Anything user-facing goes through `formatCompanyNo` (display) or
 * `companyRef` (links); anything that touches the database resolves the
 * incoming ref back to a UUID with `resolveCompanyId` first.
 */

/** A ref is a companyNo when it is all digits — UUIDs always carry hyphens. */
export function isCompanyNoRef(ref: string): boolean {
  return /^\d+$/.test(ref.trim());
}

/**
 * Turn a URL/param ref into the real `Company.id`.
 *
 * Accepts either form on purpose: new links carry the companyNo, but UUID
 * links already live in bookmarks, emails and old audit rows, so they keep
 * resolving. Returns null only when a numeric ref matches no company — a
 * UUID-shaped ref is handed back untouched and left for the caller's own
 * lookup to 404 on.
 */
export async function resolveCompanyId(ref: string): Promise<string | null> {
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

/** The ref to put in a link: `/admin/companies/100004`. */
export function companyRef(company: { id: string; companyNo?: number | null }): string {
  return company.companyNo != null ? String(company.companyNo) : company.id;
}

/**
 * The ID to print on a screen: `#100004`.
 *
 * Falls back to a shortened UUID only if a row somehow has no companyNo, so a
 * missing number degrades to something traceable instead of a blank cell.
 */
export function formatCompanyNo(
  companyNo?: number | null,
  fallbackId?: string | null
): string {
  if (companyNo != null) return `#${companyNo}`;
  if (fallbackId) return `#${String(fallbackId).slice(0, 8)}…`;
  return "—";
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
