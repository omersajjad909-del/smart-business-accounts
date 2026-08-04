const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const email = "finovaos.app@gmail.com";
  const u = await p.user.findUnique({ where: { email }, select: { id:true, email:true, role:true, name:true, password:true } });
  if (!u) console.log("User table: NOT FOUND");
  else console.log("User table: found | role =", u.role, "| name =", u.name, "| password hash present:", !!u.password, "| hash prefix:", (u.password||"").slice(0,7));
  try {
    const a = await p.adminUser.findUnique({ where: { email }, select: { id:true, email:true, active:true, isSuperAdmin:true, passwordHash:true } });
    if (!a) console.log("AdminUser table: NOT FOUND");
    else console.log("AdminUser table: found | active =", a.active, "| superAdmin =", a.isSuperAdmin, "| hash prefix:", (a.passwordHash||"").slice(0,7));
  } catch(e) { console.log("AdminUser table: query failed -", e.message.split("\n")[0]); }
  console.log("\n--- all ADMIN-role users ---");
  const admins = await p.user.findMany({ where: { role: "ADMIN" }, select: { email:true, name:true } });
  admins.forEach(a => console.log("  ", a.email, "|", a.name));
  await p.$disconnect();
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
