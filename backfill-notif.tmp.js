// Backfill the admin bell notification for Lemon Squeezy payments that landed
// before the webhook started creating them. Dry-run unless --commit is passed.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const COMMIT = process.argv.includes("--commit");

(async () => {
  const logs = await prisma.activityLog.findMany({
    where: { action: "PAYMENT_EVENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, companyId: true, createdAt: true, details: true },
  });

  const seen = new Set();
  const planned = [];

  for (const log of logs) {
    let det;
    try { det = log.details ? JSON.parse(log.details) : null; } catch { det = null; }
    if (!det) continue;
    if (String(det.provider || "") !== "LEMON_SQUEEZY") continue;

    const status = det.status ? String(det.status).toLowerCase() : null;
    if (status && status !== "succeeded" && status !== "paid") continue;

    const orderKey = String(det.orderId || "");
    if (!orderKey || seen.has(orderKey)) continue;
    seen.add(orderKey);

    const minor = Number(det.amount ?? det.amount_paid ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) continue;

    const existing = await prisma.notification.findFirst({
      where: { message: { contains: `#${orderKey}` } },
      select: { id: true },
    });
    if (existing) { planned.push({ orderKey, skip: "notification already exists" }); continue; }

    const company = log.companyId
      ? await prisma.company.findUnique({ where: { id: log.companyId }, select: { name: true, plan: true } }).catch(() => null)
      : null;

    const currency = String(det.currency || "USD").toUpperCase();
    const amountLabel = `${currency} ${(minor / 100).toFixed(2)}`;

    planned.push({
      orderKey,
      createdAt: log.createdAt,
      title: `💳 New Subscription: ${amountLabel}`,
      message: [
        company?.name || "Unknown company",
        String(company?.plan || "").toUpperCase() || "PLAN",
        `#${orderKey}`,
      ].filter(Boolean).join(" · "),
    });
  }

  console.log(COMMIT ? "=== COMMITTING ===" : "=== DRY RUN (no writes) ===");
  console.log(JSON.stringify(planned, null, 2));

  if (COMMIT) {
    for (const p of planned) {
      if (p.skip) continue;
      await prisma.notification.create({
        data: {
          title: p.title,
          message: p.message,
          type: "SUCCESS",
          link: "/admin/subscriptions",
          isRead: false,
          // Match the payment's own timestamp so the bell orders it correctly.
          createdAt: p.createdAt,
        },
      });
      console.log("created:", p.orderKey);
    }
  }

  await prisma.$disconnect();
})().catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
