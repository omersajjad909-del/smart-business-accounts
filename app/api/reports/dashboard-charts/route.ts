import { NextRequest, NextResponse } from "next/server";
import { PrismaClient , Prisma} from "@prisma/client";
import { resolveCompanyId } from "@/lib/tenant";

const prisma = (globalThis as any).prisma || new PrismaClient();
type SalesInvoice = Prisma.SalesInvoiceGetPayload<{
  select: {
    date: true;
    total: true;
  };
}>;

type PurchaseInvoice = Prisma.PurchaseInvoiceGetPayload<{
  select: {
    date: true;
    total: true;
  };
}>;

type TopCustomer = {
  customerId: string;
  _sum: { total: number | null };
};




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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month"; // month, week, year

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Sales by day/week/month
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: {
        date: { gte: startDate },
        companyId,
      },
      select: {
        date: true,
        total: true,
      },
    });

    // Purchases by day/week/month
    const purchaseInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        date: { gte: startDate },
        companyId,
      },
      select: {
        date: true,
        total: true,
      },
    });

    // Group sales by period
    const salesByPeriod: Record<string, number> = {};
    salesInvoices.forEach((inv: SalesInvoice) => {

      let key: string;
      if (period === "week") {
        key = inv.date.toISOString().split("T")[0];
      } else if (period === "month") {
        key = inv.date.toISOString().slice(0, 7); // YYYY-MM
      } else {
        key = inv.date.getFullYear().toString();
      }
      salesByPeriod[key] = (salesByPeriod[key] || 0) + Number(inv.total || 0);
    });

    // Group purchases by period
    const purchasesByPeriod: Record<string, number> = {};
    purchaseInvoices.forEach((inv: PurchaseInvoice) => {


      let key: string;
      if (period === "week") {
        key = inv.date.toISOString().split("T")[0];
      } else if (period === "month") {
        key = inv.date.toISOString().slice(0, 7);
      } else {
        key = inv.date.getFullYear().toString();
      }
      purchasesByPeriod[key] =
        (purchasesByPeriod[key] || 0) + Number(inv.total || 0);
    });

    // Top customers
    const topCustomers = await prisma.salesInvoice.groupBy({\r\n      by: ["customerId"],
      where: {
        date: { gte: startDate },
        companyId,
      },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    });

    const customerDetails = await Promise.all(
      topCustomers.map(async (item: TopCustomer) => {
        const customer = await prisma.account.findFirst({
          where: { id: item.customerId, companyId },
          select: { name: true },
        });
        return {
          name: customer?.name || "Unknown",
          total: Number(item._sum.total || 0),
        };
      })
    );

    // Top items
    const topItems = await prisma.salesInvoiceItem.groupBy({
      by: ["itemId"],
      where: {
        invoice: {
          date: { gte: startDate },
          companyId,
        },
      },
      _sum: {
        qty: true,
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: 5,
    });

    const itemDetails = await Promise.all(
      topItems.map(async (item: any) => {
        const itemData = await prisma.itemNew.findFirst({
          where: { id: item.itemId, companyId },
          select: { name: true },
        });
        return {
          name: itemData?.name || "Unknown",
          qty: Number(item._sum.qty || 0),
          amount: Number(item._sum.amount || 0),
        };
      })
    );

    return NextResponse.json({
      salesTrend: Object.entries(salesByPeriod).map(([key, value]) => ({
        label: key,
        value,
      })),
      purchasesTrend: Object.entries(purchasesByPeriod).map(([key, value]) => ({
        label: key,
        value,
      })),
      topCustomers: customerDetails,
      topItems: itemDetails,
    });
  } catch (e: any) {
    console.error("❌ DASHBOARD CHARTS ERROR:", e);
    return NextResponse.json(
      { error: e.message || "Charts data failed" },
      { status: 500 }
    );
  }
}

