const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.testimonial.updateMany({
    where: { planUsed: "PRO" },
    data:  { planUsed: "PROFESSIONAL" },
  });
  console.log(`✅ Updated ${result.count} testimonials: PRO → PROFESSIONAL`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
