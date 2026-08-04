const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const p = new PrismaClient();

(async () => {
  const email = "finovaos.app@gmail.com";

  const existing = await p.user.findUnique({ where: { email } });
  if (existing) {
    console.log("User already exists — nothing to do. Role:", existing.role);
    await p.$disconnect();
    return;
  }

  // Temporary password — change it after first login.
  const tempPassword = "Finova@" + crypto.randomBytes(4).toString("hex");
  const hash = await bcrypt.hash(tempPassword, 10);

  const user = await p.user.create({
    data: {
      name: "Super Admin",
      email,
      password: hash,
      role: "ADMIN",
      active: true,
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Super admin restored:");
  console.log("  id:      ", user.id);
  console.log("  email:   ", user.email);
  console.log("  role:    ", user.role);
  console.log("  TEMP PASSWORD:", tempPassword);
  console.log("\nLogin at /admin/login, then change the password immediately.");
  await p.$disconnect();
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
