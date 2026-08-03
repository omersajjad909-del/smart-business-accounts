import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'AutomationAddon'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(cols, null, 2));
  await prisma.$disconnect();
}
main();
