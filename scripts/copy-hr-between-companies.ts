/**
 * Copy HR & Payroll data from one company to another.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/copy-hr-between-companies.ts                          # list companies with HR data
 *   npx tsx --env-file=.env scripts/copy-hr-between-companies.ts --from A --to B          # dry run: counts + conflicts
 *   npx tsx --env-file=.env scripts/copy-hr-between-companies.ts --from A --to B --apply  # copy
 *
 * Copies: employees, attendance, leaves, payroll, salary advances, employee
 * document records and holidays. Every row gets a new id and the target's
 * companyId; the source is only read, never changed.
 *
 * Deliberately NOT copied:
 *   - Employee.accountId (the per-employee Salary Payable account lives in the
 *     source company's chart of accounts; it is left empty here).
 *   - Vouchers / ledger entries behind payroll payments — payroll rows are
 *     copied as records only, they do not post anything in the target's books.
 *   - Biometric devices and raw punches (a device is tied to one company by its
 *     API key; re-register it in the target).
 *
 * Employees already in the target (same employeeId, email or biometricId) are
 * skipped together with their attendance/leave/payroll rows, so re-running is safe.
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const apply = process.argv.includes("--apply");
const from = arg("from");
const to = arg("to");

const CHUNK = 1000;
async function insertAll<T>(rows: T[], fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK));
}

async function listCompanies() {
  const rows = await prisma.employee.groupBy({ by: ["companyId"], _count: { _all: true } });
  const ids = rows.map((r) => r.companyId).filter((x): x is string => !!x);
  const companies = await prisma.company.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, plan: true, isDemo: true },
  });
  console.log("Companies that have employees:\n");
  for (const r of rows) {
    const c = companies.find((x) => x.id === r.companyId);
    console.log(`${r.companyId ?? "(none)"}  ${c?.name ?? "?"}  [${c?.plan ?? "-"}${c?.isDemo ? ", demo" : ""}]  employees: ${r._count._all}`);
  }
  console.log("\nPick the ids, then run again with --from <id> --to <id>.");
}

async function main() {
  if (!from || !to) return listCompanies();
  if (from === to) throw new Error("--from and --to are the same company.");

  const [src, dst] = await Promise.all([
    prisma.company.findUnique({ where: { id: from }, select: { id: true, name: true } }),
    prisma.company.findUnique({ where: { id: to }, select: { id: true, name: true } }),
  ]);
  if (!src) throw new Error(`Source company ${from} not found.`);
  if (!dst) throw new Error(`Target company ${to} not found.`);
  console.log(`From: ${src.name} (${src.id})\nTo:   ${dst.name} (${dst.id})\n`);

  const [employees, existing] = await Promise.all([
    prisma.employee.findMany({ where: { companyId: from } }),
    prisma.employee.findMany({ where: { companyId: to }, select: { employeeId: true, email: true, biometricId: true } }),
  ]);
  const taken = {
    id: new Set(existing.map((e) => e.employeeId)),
    email: new Set(existing.map((e) => e.email.toLowerCase())),
    bio: new Set(existing.map((e) => e.biometricId).filter((b): b is string => !!b)),
  };
  const toCopy = employees.filter(
    (e) => !taken.id.has(e.employeeId) && !taken.email.has(e.email.toLowerCase()) && !(e.biometricId && taken.bio.has(e.biometricId)),
  );
  const skipped = employees.filter((e) => !toCopy.includes(e));
  const idMap = new Map(toCopy.map((e) => [e.id, randomUUID()]));
  const oldIds = toCopy.map((e) => e.id);

  const [attendance, leaves, payroll, advances, documents, holidays, existingHolidays] = await Promise.all([
    prisma.attendance.findMany({ where: { employeeId: { in: oldIds } } }),
    prisma.leave.findMany({ where: { employeeId: { in: oldIds } } }),
    prisma.payroll.findMany({ where: { employeeId: { in: oldIds } } }),
    prisma.advanceSalary.findMany({ where: { employeeId: { in: oldIds } } }),
    prisma.employeeDocument.findMany({ where: { employeeId: { in: oldIds } } }),
    prisma.holiday.findMany({ where: { companyId: from } }),
    prisma.holiday.findMany({ where: { companyId: to }, select: { date: true } }),
  ]);
  const haveDates = new Set(existingHolidays.map((h) => h.date.toISOString()));
  const newHolidays = holidays.filter((h) => !haveDates.has(h.date.toISOString()));

  console.log(`Employees:  ${toCopy.length} to copy, ${skipped.length} skipped (already in target)`);
  for (const e of skipped) console.log(`   skip: ${e.employeeId} ${e.firstName} ${e.lastName} <${e.email}>`);
  console.log(`Attendance: ${attendance.length}`);
  console.log(`Leaves:     ${leaves.length}`);
  console.log(`Payroll:    ${payroll.length}`);
  console.log(`Advances:   ${advances.length}`);
  console.log(`Documents:  ${documents.length}  (records only — they keep pointing at the same files)`);
  console.log(`Holidays:   ${newHolidays.length}`);

  if (!apply) {
    console.log("\nDry run — nothing changed. Re-run with --apply to copy.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await insertAll(toCopy, (b) =>
        tx.employee.createMany({
          data: b.map((e) => ({ ...e, id: idMap.get(e.id)!, companyId: to, accountId: null })),
        }),
      );
      await insertAll(attendance, (b) =>
        tx.attendance.createMany({ data: b.map((r) => ({ ...r, id: randomUUID(), companyId: to, employeeId: idMap.get(r.employeeId)! })) }),
      );
      await insertAll(leaves, (b) =>
        tx.leave.createMany({ data: b.map((r) => ({ ...r, id: randomUUID(), employeeId: idMap.get(r.employeeId)! })) }),
      );
      await insertAll(payroll, (b) =>
        tx.payroll.createMany({ data: b.map((r) => ({ ...r, id: randomUUID(), companyId: to, employeeId: idMap.get(r.employeeId)! })) }),
      );
      await insertAll(advances, (b) =>
        tx.advanceSalary.createMany({ data: b.map((r) => ({ ...r, id: randomUUID(), companyId: to, employeeId: idMap.get(r.employeeId)! })) }),
      );
      await insertAll(documents, (b) =>
        tx.employeeDocument.createMany({ data: b.map((r) => ({ ...r, id: randomUUID(), employeeId: idMap.get(r.employeeId)! })) }),
      );
      await insertAll(newHolidays, (b) =>
        tx.holiday.createMany({ data: b.map((h) => ({ ...h, id: randomUUID(), companyId: to })) }),
      );
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log("\nDone. Everything was written in one transaction.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
