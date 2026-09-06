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

const count = await db.marketSignal.count();
console.log("TOTAL MarketSignal ROWS:", count);

const rows = await db.marketSignal.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
