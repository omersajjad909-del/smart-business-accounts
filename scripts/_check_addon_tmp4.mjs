import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.$queryRawUnsafe(`
    SELECT id, name, email, "defaultCompanyId" FROM "User" WHERE email = 'umersajjad981@gmail.com' LIMIT 5;
  `);
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
main();
