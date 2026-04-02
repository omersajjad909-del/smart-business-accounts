const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      name: true
    }
  });
  console.log("Users in DB:", JSON.stringify(users, null, 2));
}

listUsers().catch(console.error).finally(() => prisma.$disconnect());
