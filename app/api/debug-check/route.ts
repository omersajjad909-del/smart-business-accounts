import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: any = {};

  // 1. Check Employees
  try {
    const employees = await prisma.employee.findMany({
      take: 5,
      include: {
        attendances: { orderBy: { date: "desc" }, take: 1 },
        payroll: { orderBy: { monthYear: "desc" }, take: 1 },
      },
    });
    results.employees = { success: true, count: employees.length, sample: employees[0] };
  } catch (e: any) {
    results.employees = { success: false, error: e.message };
  }

  // 2. Check Purchase Invoice Dependencies
  try {
    // Check if any supplier exists
    const supplier = await prisma.account.findFirst({
        where: { 
            OR: [
                { type: "SUPPLIER" },
                { partyType: "SUPPLIER" }
            ]
        } 
    });
    
    // Check Inventory Account
    const inventoryAcc = await prisma.account.findFirst({
        where: {
          OR: [
            { name: { equals: "Stock/Inventory", mode: "insensitive" } },
            { code: { equals: "INV001", mode: "insensitive" } },
          ],
        },
    });

    results.purchaseInvoice = {
        supplierFound: !!supplier,
        inventoryAccFound: !!inventoryAcc,
        supplierSample: supplier ? { id: supplier.id, name: supplier.name } : null
    };

  } catch (e: any) {
    results.purchaseInvoice = { success: false, error: e.message };
  }

  return NextResponse.json(results);
}
