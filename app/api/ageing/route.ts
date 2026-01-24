import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// ✅ Prisma singleton (dev safe)
const prisma =
  (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

export async function GET(req: Request) {
  try {
    // ✅ ROLE FROM HEADER
    const role = req.headers.get("x-user-role");

    // ✅ REPORTS ACCESS: ADMIN + ACCOUNTANT
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ================= DATA =================
    const parties = await prisma.account.findMany({
      where: {
        partyType: { not: null },
      },
    });

    const vouchers = await prisma.voucher.findMany();

    const today = new Date();

    const result = parties.map((party: any) => {
      let b0_30 = 0;
      let b31_60 = 0;
      let b61_90 = 0;
      let b90p = 0;

      vouchers.forEach((v: any) => {
        if (v.accountId !== party.id) return;

        const days =
          (today.getTime() - new Date(v.date).getTime()) /
          (1000 * 60 * 60 * 24);

        let amount = 0;

        // CUSTOMER RECEIVABLE
        if (party.partyType === "CUSTOMER" && v.type === "CRV") {
          amount = -v.amount;
        }

        // SUPPLIER PAYABLE
        if (party.partyType === "SUPPLIER" && v.type === "CPV") {
          amount = v.amount;
        }

        if (days <= 30) b0_30 += amount;
        else if (days <= 60) b31_60 += amount;
        else if (days <= 90) b61_90 += amount;
        else b90p += amount;
      });

      return {
        name: party.name,
        partyType: party.partyType,
        "0_30": b0_30,
        "31_60": b31_60,
        "61_90": b61_90,
        "90p": b90p,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("❌ AGEING REPORT ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load ageing report" },
      { status: 500 }
    );
  }
}
