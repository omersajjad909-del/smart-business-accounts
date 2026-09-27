import { NextRequest } from "next/server";
import { prisma } from "./lib/prisma";
import path from "path";
const cid = process.argv[2];
(async () => {
  const accs = await prisma.account.findMany({ where: { companyId: cid, partyType: { in: ["CUSTOMER", "SUPPLIER"] }, deletedAt: null }, select: { id: true, name: true, partyType: true, openDebit: true, openCredit: true } });
  const call = async (d: string, qs: string) => {
    const mod = await import(path.resolve(`app/api/reports/${d}/route.ts`));
    const res = await mod.GET(new NextRequest(`http://l/api/reports/${d}?${qs}`, { headers: { "x-user-id": "h", "x-user-role": "ADMIN", "x-company-id": cid } }));
    return [res.status, await res.json()] as const;
  };
  let bad = 0;
  for (const a of accs) {
    const led = await prisma.voucherEntry.aggregate({ where: { accountId: a.id, voucher: { companyId: cid, deletedAt: null } }, _sum: { amount: true } });
    const net = (a.openDebit || 0) - (a.openCredit || 0) + (led._sum.amount || 0);
    const expect = a.partyType === "CUSTOMER" ? net : -net;
    const cust = a.partyType === "CUSTOMER";
    const [s, st] = await call(cust ? "customer-statement" : "supplier-statement", `${cust ? "customerId" : "supplierId"}=${a.id}&from=2026-08-01&to=2026-12-31`);
    const ag = st.ageing ? Object.values(st.ageing as Record<string, number>).reduce((x, y) => x + y, 0) : NaN;
    const rowsOk = st.rows.length === 0 || Math.abs(st.rows.at(-1).balance - st.closingBalance) < 0.01;
    const ok = Math.abs(st.closingBalance - expect) < 0.01 && rowsOk && (expect <= 0 || Math.abs(ag - expect) < 0.01);
    if (!ok) bad++;
    console.log(ok ? "OK " : "BAD", a.partyType.padEnd(8), a.name.padEnd(26), "status", s, "open", st.openingBalance, "close", st.closingBalance, "ledger", Math.round(expect * 100) / 100, "ageSum", Math.round(ag * 100) / 100, "inv", st.totalInvoiced, "settled", st.totalReceived ?? st.totalPaid, "rows", st.rows.length);
  }
  console.log(bad ? `${bad} MISMATCH` : "ALL MATCH");
  await prisma.$disconnect();
})();
