const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.testimonial.findMany({ orderBy: { createdAt: "asc" } });
  fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
  console.log("TOTAL ROWS IN DB:", rows.length);
  for (const r of rows) {
    console.log(` [${r.status}] ${r.name} | ${r.company || "-"} | created ${new Date(r.createdAt).toISOString().slice(0,10)}`);
  }
  console.log("\nBackup written to:", process.argv[2]);
})().catch(e => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
