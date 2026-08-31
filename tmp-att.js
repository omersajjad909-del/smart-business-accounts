require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const rows = await p.attendance.findMany({
    where: { employeeId: "444acb7d-b7b1-4c50-9626-bb65c5eab256", date: { gte: new Date(2026,7,1), lt: new Date(2026,8,1) } },
    select: { date: true, status: true, companyId: true },
    orderBy: { date: "asc" },
  });
  console.log("count", rows.length);
  console.log(rows.slice(0,3), rows.filter(r=>r.status!=="PRESENT").slice(0,5));
  await p.$disconnect();
})().catch(e=>{console.error(e);process.exit(1);});
