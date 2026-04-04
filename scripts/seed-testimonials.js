const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TESTIMONIALS = [
  {
    name: "Thomas Miller",
    company: "Miller Trading Co.",
    role: "CEO",
    message: "Finally, accounting that matches our business reality. Bank reconciliation used to take 3 days — now it's done before lunch. The multi-branch reports alone saved us 10+ hours a week.",
    rating: 5,
    planUsed: "PROFESSIONAL",
    status: "PUBLISHED",
    featured: true,
  },
  {
    name: "Alicia Stevens",
    company: "Global Distribution Group",
    role: "CFO",
    message: "The dashboard gives us instant clarity across all 5 branches. We scaled from 2 to 5 locations with zero chaos and zero extra headcount. FinovaOS just works.",
    rating: 5,
    planUsed: "ENTERPRISE",
    status: "PUBLISHED",
    featured: true,
  },
  {
    name: "Ryan Kennedy",
    company: "Apex Supply Chain",
    role: "Managing Director",
    message: "We were running on spreadsheets and prayers. Switching to FinovaOS was the single best operational decision we made this year. Setup took less than a day.",
    rating: 5,
    planUsed: "PROFESSIONAL",
    status: "PUBLISHED",
    featured: true,
  },
  {
    name: "Fiona Murphy",
    company: "Meridian Importers",
    role: "Finance Director",
    message: "Real-time P&L was a game-changer. I can see exactly where every dollar is going before the month closes, not after. Auditors love the clean reports too.",
    rating: 5,
    planUsed: "PROFESSIONAL",
    status: "PUBLISHED",
    featured: false,
  },
  {
    name: "Samir Al-Rashid",
    company: "Gulf Trade Solutions",
    role: "Owner",
    message: "Multi-currency support is flawless. We invoice in USD, AED, and PKR — FinovaOS handles exchange rates and gain/loss automatically. Saved us a dedicated accountant.",
    rating: 5,
    planUsed: "ENTERPRISE",
    status: "PUBLISHED",
    featured: false,
  },
  {
    name: "Priya Sharma",
    company: "Spark Retail Chain",
    role: "Operations Head",
    message: "Inventory syncs with every sale in real time. No more end-of-day stock counts or mismatches. Our team saves 8 hours every single week.",
    rating: 5,
    planUsed: "PROFESSIONAL",
    status: "PUBLISHED",
    featured: false,
  },
  {
    name: "James Okonkwo",
    company: "Lagos Supply Co.",
    role: "Director",
    message: "Finally a system that works for African businesses too. Multi-currency, multi-branch, and tax-ready — exactly what we needed. Customer support is exceptional.",
    rating: 5,
    planUsed: "PROFESSIONAL",
    status: "PUBLISHED",
    featured: false,
  },
  {
    name: "Sofia Reyes",
    company: "Reyes Importaciones",
    role: "CFO",
    message: "The payroll module alone saved us 2 full days every month. Now payslips go out in minutes and the ledger updates automatically. No more manual journal entries.",
    rating: 5,
    planUsed: "ENTERPRISE",
    status: "PUBLISHED",
    featured: false,
  },
  {
    name: "Ahmed Karimi",
    company: "Karimi Wholesale Ltd.",
    role: "Owner",
    message: "We manage 3 companies from one login. Switching between them takes one second. The consolidated P&L report blew our auditor away — he asked which Big 4 firm built this.",
    rating: 5,
    planUsed: "ENTERPRISE",
    status: "PUBLISHED",
    featured: false,
  },
];

async function main() {
  console.log("Seeding testimonials...");

  // Clear existing testimonials first
  await prisma.testimonial.deleteMany({}).catch(() => {});

  for (const t of TESTIMONIALS) {
    await prisma.testimonial.create({ data: t });
    console.log(`✅ Added: ${t.name} — ${t.company}`);
  }

  console.log(`\n🎉 Done! ${TESTIMONIALS.length} testimonials added.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
