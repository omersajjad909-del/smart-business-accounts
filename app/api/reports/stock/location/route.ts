import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const txns = await prisma.inventoryTxn.findMany({
      where: { companyId },
      include: { item: { select: { name: true, unit: true } } },
    });

    const map: Record<string, any> = {};

    for (const t of txns) {
      // Key format: Location-ItemID
      const key = `${t.location}_${t.itemId}`;

      if (!map[key]) {
        map[key] = {
          location: t.location,
          itemName: t.item.name,
          unit: t.item.unit,
          qty: 0,
        };
      }

      // اگر آپ کے ڈیٹا بیس میں qty پہلے ہی سیلز کے لیے مائنس میں ہے تو صرف جمع کریں
      // ورنہ آپ کی موجودہ ٹائپ وائز لاجک (جو نیچے ہے) استعمال کریں:
      map[key].qty += t.qty; 
    }

    // صرف وہ آئٹمز دکھائیں جن کا اسٹاک 0 نہیں ہے
    const result = Object.values(map).filter((r: any) => r.qty !== 0);
    
    // لوکیشن کے حساب سے ترتیب دیں (Sorting)
    result.sort((a: any, b: any) => a.location.localeCompare(b.location));

    return NextResponse.json(result);
  } catch (e) {
    console.error("LOCATION STOCK ERROR:", e);
    return NextResponse.json([]);
  }
}
