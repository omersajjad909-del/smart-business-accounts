import { NextRequest } from "next/server";
import { prisma } from "./lib/prisma";
import path from "path";
const cid = process.argv[2];
(async () => {
  const accs = await prisma.account.findMany({ where: { companyId: cid, partyType: { in: ["CUSTOMER", "SUPPLIER"] } }, select: { id: true, name: true, partyType: true } });
  const call = async (d: string, qs: string) => {
    const mod = await import(path.resolve(`app/api/reports/${d}/route.ts`));
    const res = await mod.GET(new NextRequest(`http://l/api/reports/${d}?${qs}`, { headers: { "x-user-id": "h", "x-user-role": "ADMIN", "x-company-id": cid, "x-branch-id": "all" } }));
    return [res.status, await res.json()];
  };
  for (const a of accs) {
    const q = `accountId=${a.id}&customerId=${a.id}&supplierId=${a.id}&from=2000-01-01&to=2026-12-31`;
    const [ls, l] = await call("ledger", q);
    const [ss, s] = await call(a.partyType === "CUSTOMER" ? "customer-statement" : "supplier-statement", q);
    const lb = Array.isArray(l) ? l.at(-1)?.balance : (l.closingBalance ?? l.balance ?? l.rows?.at?.(-1)?.balance);
    const sb = s.closingBalance ?? s.balance ?? s.rows?.at?.(-1)?.balance ?? s.transactions?.at?.(-1)?.balance;
    console.log(a.partyType, a.name.padEnd(26), "ledger", ls, lb, "| statement", ss, sb, Object.keys(s).join(","));
  }
  await prisma.$disconnect();
})();
