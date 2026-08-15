const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
(async () => {
  const prisma = new PrismaClient();
  const email = "finovaos.app@gmail.com";
  const password = "12345678";
  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    console.log("USER_UPDATED");
  }

  const adminUser = await prisma.adminUser.findUnique({ where: { email } });
  if (adminUser) {
    await prisma.adminUser.update({ where: { id: adminUser.id }, data: { passwordHash: hash } });
    console.log("ADMINUSER_UPDATED");
  }

  if (!user && !adminUser) {
    console.log("NO_MATCH");
  }

  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
