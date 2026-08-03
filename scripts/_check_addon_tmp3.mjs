import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const companies = await prisma.$queryRawUnsafe(`SELECT id, name FROM "Company" ORDER BY "createdAt" DESC LIMIT 10;`);
  console.log("Recent companies:", JSON.stringify(companies, null, 2));
  await prisma.$disconnect();
}
main();
