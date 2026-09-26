import { getSummary } from "./lib/dashboardData";
import { prisma } from "./lib/prisma";
(async () => { for (const p of ["month", "year"]) { const s: any = await getSummary(process.argv[2], null, p); const flat = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === "number" || (v && typeof v === "object" && !Array.isArray(v)))); console.log(p, JSON.stringify(flat).slice(0, 900)); } await prisma.$disconnect(); })();
