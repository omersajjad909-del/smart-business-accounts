// import { NextResponse } from "next/server";
// import { PrismaClient } from "@prisma/client";

// // Prisma singleton
// const prisma =
//   (globalThis as any).prisma || new PrismaClient();

// if (process.env.NODE_ENV === "development") {
//   (globalThis as any).prisma = prisma;
// }

// // const CATEGORY_TYPE_MAP: Record<string, string> = {
// //   "ACCOUNTS RECEIVABLE": "ASSET",
// //   "ACCOUNTS PAYABLE": "LIABILITY",
// //   "BANKS": "ASSET",
// //   "CASH": "ASSET",
// //   "FIXED ASSETS": "ASSET",
// //   "ACCUMULATED DEPRECIATION": "CONTRA_ASSET",
// //   "EXPENSE": "EXPENSE",
// //   "INCOME": "INCOME",
// //   "EQUITY": "EQUITY",
// //   "LIABILITIES": "LIABILITY",
// //   "STOCK": "ASSET",
// //   "GENERAL": "ASSET",
// // };

// /* ================= GET ================= */
// export async function GET(req: Request) {
//   const role = req.headers.get("x-user-role");

//   if (role !== "ADMIN" && role !== "ACCOUNTANT") {
//     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
//   }

//   const accounts = await prisma.account.findMany({
//     orderBy: { name: "asc" },
//   });

//   return NextResponse.json(accounts);
  
// }

// /* ================= POST ================= */
// const CATEGORY_TYPE_MAP: Record<string, string> = {
//   // ASSETS
//   ASSETS: "ASSET",
//   BANKS: "ASSET",
//   VEHICLES: "ASSET",
//   MACHINERY: "ASSET",
//   BUILDING: "ASSET",
//   FURNITURE: "ASSET",
//   CUSTOMER: "ASSET", // Accounts Receivable

//   // LIABILITIES
//   SUPPLIER: "LIABILITY", // Accounts Payable
//   LIABILITIES: "LIABILITY",
//   LOAN: "LIABILITY",
//   TAX: "LIABILITY",

//   // EXPENSES
//   EXPENSE: "EXPENSE",
//   EMPLOYES: "EXPENSE",
//   CARGO: "EXPENSE",

//   // INCOME
//   INCOME: "INCOME",

//   // EQUITY
//   EQUITY: "EQUITY",

//   // CONTRA
//   "CONTRA ASSET": "CONTRA_ASSET",

//   // FALLBACK
//   GENERAL: "ASSET",
// };

// export async function POST(req: Request) {
//   try {
//     const rawRole = req.headers.get("x-user-role");
//     const role = rawRole?.toUpperCase(); // 🔥 FIX

//     if (role !== "ADMIN") {
//       return NextResponse.json(
//         { error: "Only ADMIN can create accounts" },
//         { status: 403 }
//       );
//     }

//     const body = await req.json();

//     if (body && body.cleanupStandard === true) {
//       const removableCodes = [
//         "BANK002",
//         "FA001",
//         "FA002",
//         "FA003",
//         "FA004",
//         "FA005",
//         "FA006",
//         "AP001",
//         "LOAN001",
//         "LOAN002",
//         "TAX001",
//         "TAX002",
//         "SALES001",
//         "SALES002",
//         "SALES003",
//         "SALES004",
//         "EXP001",
//         "EXP002",
//         "EXP003",
//         "EXP004",
//         "EXP005",
//         "EXP006",
//         "EXP007",
//         "EXP008",
//         "EXP009",
//         "EXP010",
//         "EXP011",
//         "EXP012",
//         "EXP013",
//         "EXP014",
//         "EXP015",
//         "EXP016",
//         "CONTRA001",
//         "CONTRA002",
//         "CONTRA003",
//         "CONTRA004",
//       ];

//       const result = await prisma.account.deleteMany({
//         where: {
//           code: { in: removableCodes },
//           voucherEntries: { none: {} },
//           salesInvoices: { none: {} },
//           purchaseInvoices: { none: {} },
//           purchaseOrders: { none: {} },
//           saleReturns: { none: {} },
//           bankAccounts: { none: {} },
//           paymentReceipts: { none: {} },
//           expenseVouchers: { none: {} },
//           taxAccounts: { none: {} },
//           budgets: { none: {} },
//           recurringTransactions: { none: {} },
//         },
//       });

//       return NextResponse.json({ cleaned: result.count });
//     }

//     if (body && body.autoType === true) {
//       const accounts = await prisma.account.findMany();

//       let updated = 0;

//       for (const acc of accounts) {
//         const currentType = acc.type || "GENERAL";
//         if (currentType !== "GENERAL" && currentType !== "BANK") continue;

//         const name = (acc.name || "").toLowerCase();
//         const code = (acc.code || "").toUpperCase();
//         const party = acc.partyType || "";

//         let newType: string | null = null;

//         if (party === "CUSTOMER") {
//           newType = "ASSET";
//         } else if (party === "SUPPLIER") {
//           newType = "LIABILITY";
//         } else if (party === "BANKS") {
//           newType = "ASSET";
//         } else if (party === "EXPENSE") {
//           newType = "EXPENSE";
//         } else if (code.startsWith("CASH") || name.includes("cash")) {
//           newType = "ASSET";
//         } else if (code.startsWith("BANK") || name.includes("bank")) {
//           newType = "ASSET";
//         } else if (name.includes("loan")) {
//           newType = "LIABILITY";
//         } else if (name.includes("tax")) {
//           newType = "LIABILITY";
//         } else if (
//           name.includes("capital") ||
//           name.includes("equity") ||
//           name.includes("opening balance")
//         ) {
//           newType = "EQUITY";
//         } else if (
//           name.includes("sales") ||
//           name.includes("revenue") ||
//           name.includes("income")
//         ) {
//           newType = "INCOME";
//         } else if (
//           name.includes("expense") ||
//           name.includes("rent") ||
//           name.includes("salary") ||
//           name.includes("wages")
//         ) {
//           newType = "EXPENSE";
//         }

//         if (newType && newType !== acc.type) {
//           await prisma.account.update({
//             where: { id: acc.id },
//             data: { type: newType },
//           });
//           updated += 1;
//         }
//       }

//       return NextResponse.json({ updated });
//     }

//     if (!body.code || !body.name) {
//       return NextResponse.json(
//         { error: "Code and name required" },
//         { status: 400 }
//       );
//     }

//     const fixedType =
//   CATEGORY_TYPE_MAP[body.partyType] || "ASSET";

// const account = await prisma.account.create({
//   data: {
//     code: body.code,
//     name: body.name,
//     type: fixedType,              // 🔥 FIXED HERE
//     partyType: body.partyType || null,
//     city: body.city || null,
//     phone: body.phone || null,
//     openDate: body.openDate
//       ? new Date(body.openDate)
//       : new Date(),
//     openDebit: Number(body.openDebit || 0),
//     openCredit: Number(body.openCredit || 0),
//     creditDays: Number(body.creditDays || 0),
//     creditLimit: Number(body.creditLimit || 0),
//   },
// });


//     // 🔥 Agar partyType = "BANKS" hai to BankAccount table mein bhi entry banao
//     if (body.partyType === "BANKS") {
//       // Check if BankAccount already exists
//       const existingBankAccount = await prisma.bankAccount.findFirst({
//         where: { accountId: account.id },
//       });

//       if (!existingBankAccount) {
//         // Extract bank name and account number from account name if possible
//         // Format: "BANK NAME - ACCOUNT NO" or just "BANK NAME"
//         const nameParts = account.name.split(" - ");
//         const bankName = nameParts[0] || account.name;
//         const accountNo = nameParts[1] || account.code;

//         await prisma.bankAccount.create({
//           data: {
//             accountNo: accountNo,
//             bankName: bankName,
//             accountName: account.name,
//             accountId: account.id,
//             balance: Number(body.openDebit || body.openCredit || 0),
//           },
//         });
//       }
//     }

//     return NextResponse.json(account);
//   } catch (e) {
//     console.error("❌ ACCOUNT CREATE ERROR:", e);
//     return NextResponse.json(
//       { error: "Failed to create account" },
//       { status: 500 }
//     );
//   }
// }

          

// /* ================= DELETE ================= */
// export async function DELETE(req: Request) {
//   try {
//     const rawRole = req.headers.get("x-user-role");
//     const role = rawRole?.toUpperCase();
    
//     if (role !== "ADMIN") {
//       return NextResponse.json(
//         { error: "Only ADMIN can delete accounts" },
//         { status: 403 }
//       );
//     }

//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");

//     if (!id) {
//       return NextResponse.json(
//         { error: "Account ID is required" },
//         { status: 400 }
//       );
//     }

//     // اکاؤنٹ ڈیلیٹ کرنا
//     await prisma.account.delete({
//       where: { id: id },
//     });

//     return NextResponse.json({ message: "Account deleted successfully" });
//   } catch (e: any) {
//     console.error("❌ ACCOUNT DELETE ERROR:", e);
    
//     return NextResponse.json(
//       { error: "Cannot delete account. It might be in use." },
//       { status: 500 }
//     );
//   }
// }

// /* ================= PUT (EDIT) ================= */
// export async function PUT(req: Request) {
//   try {
//     const rawRole = req.headers.get("x-user-role");
//     const role = rawRole?.toUpperCase();

//     if (role !== "ADMIN") {
//       return NextResponse.json(
//         { error: "Only ADMIN can edit accounts" },
//         { status: 403 }
//       );
//     }

//     const body = await req.json();
//     const { id, ...updateData } = body;

//     if (!id) {
//       return NextResponse.json(
//         { error: "Account ID is required for updating" },
//         { status: 400 }
//       );
//     }

//     // ڈیٹا کو فارمیٹ کرنا تاکہ پرزمہ ایرر نہ دے
//     const fixedType =
//   CATEGORY_TYPE_MAP[updateData.partyType] || undefined;

//     const formattedData = {
//   ...updateData,
//   type: fixedType, // 🔥 AUTO FIX
//   openDate: updateData.openDate ? new Date(updateData.openDate) : undefined,
//   openDebit: updateData.openDebit !== undefined ? Number(updateData.openDebit) : undefined,
//   openCredit: updateData.openCredit !== undefined ? Number(updateData.openCredit) : undefined,
//   creditDays: updateData.creditDays !== undefined ? Number(updateData.creditDays) : undefined,
//   creditLimit: updateData.creditLimit !== undefined ? Number(updateData.creditLimit) : undefined,
// };


//     const updatedAccount = await prisma.account.update({
//       where: { id: id },
//       data: formattedData,
//     });

//     return NextResponse.json(updatedAccount);
//   } catch (e: any) {
//     console.error("❌ ACCOUNT UPDATE ERROR:", e);
//     return NextResponse.json(
//       { error: "Failed to update account" },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Prisma singleton
const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

/* ================= CATEGORY TO TYPE MAPPING ================= */
// آپ کی لسٹ کے مطابق فنانشل ٹائپس
const CATEGORY_TYPE_MAP: Record<string, string> = {
  "CUSTOMER": "ASSET",
  "SUPPLIER": "LIABILITY",
  "BANKS": "ASSET",
  "CASH": "ASSET",
  "FIXED ASSETS": "ASSET",
  "ACCUMULATED DEPRECIATION": "CONTRA_ASSET",
  "EXPENSE": "EXPENSE",
  "INCOME": "INCOME",
  "EQUITY": "EQUITY",
  "LIABILITIES": "LIABILITY",
  "STOCK": "ASSET",
  "GENERAL": "ASSET",
  "CONTRA": "CONTRA_ASSET",
};

/* ================= GET ================= */
export async function GET(req: Request) {
  const role = req.headers.get("x-user-role");
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get("prefix");

  if (role !== "ADMIN" && role !== "ACCOUNTANT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // اگر ریکوئسٹ میں Prefix ہے تو صرف اگلا کوڈ بھیجیں (Auto-Code Logic)
  // Back-end (route.ts) کے اندر GET میں تبدیلی:
if (prefix) {
  const lastAccount = await prisma.account.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
  });

  let nextNumber = 1;
  if (lastAccount) {
    // یہ ریجیکس (Regex) کوڈ کے آخر سے نمبر نکال لے گا چاہے بیچ میں ڈیش ہو یا نہ ہو
    const match = lastAccount.code.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  const nextCode = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  return NextResponse.json({ nextCode });
}

  // ورنہ تمام اکاؤنٹس کی لسٹ بھیجیں
  const accounts = await prisma.account.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(accounts);
}

/* ================= POST ================= */
export async function POST(req: Request) {
  try {
    const rawRole = req.headers.get("x-user-role");
    const role = rawRole?.toUpperCase();

    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only ADMIN can create accounts" }, { status: 403 });
    }

    const body = await req.json();

    // Standard Cleanup Logic
    if (body && body.cleanupStandard === true) {
      const removableCodes = ["BANK002", "AP001", "EXP001", "TAX001"]; // وغیرہ
      const result = await prisma.account.deleteMany({
        where: {
          code: { in: removableCodes },
          voucherEntries: { none: {} },
          salesInvoices: { none: {} },
        },
      });
      return NextResponse.json({ cleaned: result.count });
    }

    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Code and name required" }, { status: 400 });
    }

    const fixedType = CATEGORY_TYPE_MAP[body.partyType] || "ASSET";

    const account = await prisma.account.create({
      data: {
        code: body.code,
        name: body.name,
        type: fixedType,
        partyType: body.partyType || "GENERAL",
        city: body.city || null,
        phone: body.phone || null,
        openDate: body.openDate ? new Date(body.openDate) : new Date(),
        openDebit: Number(body.openDebit || 0),
        openCredit: Number(body.openCredit || 0),
        creditDays: Number(body.creditDays || 0),
        creditLimit: Number(body.creditLimit || 0),
      },
    });

    // Bank Account creation logic
    if (body.partyType === "BANKS") {
      const nameParts = account.name.split(" - ");
      await prisma.bankAccount.create({
        data: {
          accountNo: nameParts[1] || account.code,
          bankName: nameParts[0] || account.name,
          accountName: account.name,
          accountId: account.id,
          balance: Number(body.openDebit || body.openCredit || 0),
        },
      });
    }

    return NextResponse.json(account);
  } catch (e) {
    console.error("❌ ACCOUNT CREATE ERROR:", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

/* ================= PUT (EDIT) ================= */
export async function PUT(req: Request) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const fixedType = CATEGORY_TYPE_MAP[updateData.partyType] || undefined;

    const formattedData = {
      ...updateData,
      type: fixedType,
      openDate: updateData.openDate ? new Date(updateData.openDate) : undefined,
      openDebit: updateData.openDebit !== undefined ? Number(updateData.openDebit) : undefined,
      openCredit: updateData.openCredit !== undefined ? Number(updateData.openCredit) : undefined,
      creditDays: updateData.creditDays !== undefined ? Number(updateData.creditDays) : undefined,
      creditLimit: updateData.creditLimit !== undefined ? Number(updateData.creditLimit) : undefined,
    };

    const updatedAccount = await prisma.account.update({
      where: { id: id },
      data: formattedData,
    });

    return NextResponse.json(updatedAccount);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(req: Request) {
  try {
    const role = req.headers.get("x-user-role")?.toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.account.delete({ where: { id: id } });
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return NextResponse.json({ error: "Cannot delete. Account in use." }, { status: 500 });
  }
}