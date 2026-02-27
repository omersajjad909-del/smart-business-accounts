import { PrismaClient } from "@prisma/client";

export async function seedMinimalChart(prisma: PrismaClient, companyId: string) {
  const existing = await prisma.account.count({ where: { companyId, deletedAt: null } });
  if (existing > 0) return 0;
  const defs = [
    { code: "CASH", name: "Cash in hand", type: "ASSET", partyType: "CASH" },
    { code: "AR-CUST", name: "Accounts Receivable", type: "ASSET", partyType: "CUSTOMER" },
    { code: "AP-SUP", name: "Accounts Payable", type: "LIABILITY", partyType: "SUPPLIER" },
    { code: "SALES", name: "Sales", type: "INCOME", partyType: "GENERAL" },
    { code: "PURCH", name: "Purchases", type: "EXPENSE", partyType: "GENERAL" },
    { code: "INV", name: "Stock/Inventory", type: "ASSET", partyType: "STOCK" },
    { code: "CAPITAL", name: "Owner Capital", type: "EQUITY", partyType: "GENERAL" },
    { code: "BANK001", name: "Bank - Default - 000000", type: "ASSET", partyType: "BANKS" },
  ];
  for (const d of defs) {
    const acc = await prisma.account.create({
      data: {
        companyId,
        code: d.code,
        name: d.name,
        type: d.type,
        partyType: d.partyType,
        openDate: new Date(),
      },
    });
    if (d.partyType === "BANKS") {
      await prisma.bankAccount.create({
        data: {
          companyId,
          accountNo: "000000",
          bankName: "Default",
          accountName: acc.name,
          accountId: acc.id,
          balance: 0,
        },
      });
    }
  }
  return defs.length;
}
