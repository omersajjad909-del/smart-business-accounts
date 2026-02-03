
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log("Checking DB directly...");
  try {
    const count = await prisma.employee.count();
    console.log("Total Employees in DB:", count);
    
    const all = await prisma.employee.findMany();
    console.log("All Employees:", JSON.stringify(all, null, 2));
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
