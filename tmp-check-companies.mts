import fs from "node:fs";

const envText = fs.readFileSync(".env", "utf8");
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!match) continue;
  const key = match[1];
  let val = match[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = val;
}

const { prisma } = await import("./lib/prisma");
const db: any = prisma;

const all = await db.company.findMany({
  select: { id: true, name: true, createdAt: true, plan: true },
  orderBy: { createdAt: "asc" },
});
console.log("ALL", all.length, "COMPANIES:");
for (const c of all) console.log(`- ${c.name} | ${c.plan} | ${c.createdAt.toISOString().slice(0,10)} | ${c.id}`);

for (const id of ["75b566b0-e4e3-4dcc-abe3-991df16b9586", "c0132df1-bd10-4ce4-8765-e2dc5af55ce1"]) {
  const [users, invoices, items, accounts] = await Promise.all([
    db.user.count({ where: { companyId: id } }),
    db.salesInvoice ? db.salesInvoice.count({ where: { companyId: id } }).catch(() => "n/a") : "n/a",
    db.item.count({ where: { companyId: id } }).catch(() => "n/a"),
    db.account.count({ where: { companyId: id } }).catch(() => "n/a"),
  ]);
  console.log(`\n${id} -> users=${users} invoices=${invoices} items=${items} accounts=${accounts}`);
}
process.exit(0);
