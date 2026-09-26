// Read-only: calls every GET /api/reports/* handler in-process for one company.
import { NextRequest } from "next/server";
import { prisma } from "./lib/prisma";
import fs from "fs";
import path from "path";
const [companyId, outDir, from, to] = process.argv.slice(2);
(async () => {
  const link: any = await (prisma as any).userCompany?.findFirst?.({ where: { companyId }, select: { userId: true } }).catch(() => null);
  const userId = link?.userId || (await prisma.user.findFirst({ where: { defaultCompanyId: companyId }, select: { id: true } }))?.id || "harness";
  const dirs = fs.readdirSync("app/api/reports").filter(d => fs.existsSync(`app/api/reports/${d}/route.ts`));
  for (const d of dirs) {
    try {
      const mod = await import(path.resolve(`app/api/reports/${d}/route.ts`));
      if (!mod.GET) continue;
      const url = `http://localhost/api/reports/${d}?from=${from}&to=${to}&startDate=${from}&endDate=${to}&asOf=${to}&date=${to}&period=${process.env.PERIOD || "year"}`;
      const req = new NextRequest(url, { headers: { "x-user-id": userId, "x-user-role": "ADMIN", "x-company-id": companyId, "x-branch-id": process.env.BRANCH || "all" } });
      const res = await mod.GET(req, { params: Promise.resolve({}) });
      const body = await res.json().catch(() => null);
      fs.writeFileSync(`${outDir}/${d}.json`, JSON.stringify({ status: res.status, body }, null, 1));
      console.log(d, res.status, JSON.stringify(body)?.length);
    } catch (e: any) { console.log(d, "THROW", String(e.message).slice(0, 120)); }
  }
  await prisma.$disconnect();
})();
