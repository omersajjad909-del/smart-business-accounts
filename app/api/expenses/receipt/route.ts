export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractReceiptData, buildExpenseFromReceipt, ExtractedReceipt } from "@/lib/expenseOcr";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve companyId from request headers, falling back to user lookup. */
async function resolveCompanyId(req: NextRequest): Promise<string | null> {
  const companyId = req.headers.get("x-company-id");
  if (companyId) return companyId;

  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultCompanyId: true },
  });
  return user?.defaultCompanyId ?? null;
}

/**
 * Try to create an Expense record.
 * The schema uses ExpenseVoucher (complex, requires accountIds) — we fall back to
 * ActivityLog if a simpler Expense table doesn't exist.
 */
async function persistExpense(
  extracted: ExtractedReceipt,
  companyId: string,
  userId: string,
): Promise<{ created: boolean; fallback: boolean; id?: string }> {
  const vendor = extracted.vendor ?? "Unknown Vendor";
  const amount = extracted.total ?? extracted.amount ?? 0;
  const category = extracted.category ?? "other";
  const date = extracted.date ?? new Date().toISOString().slice(0, 10);
  const notes = "OCR extracted from receipt";

  // 1. Attempt insert into "Expense" table (may not exist in schema)
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO "Expense" ("id", "companyId", "userId", "vendor", "amount", "category", "date", "notes", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::date, $7, NOW())
       RETURNING id`,
      companyId,
      userId,
      vendor,
      amount,
      category,
      date,
      notes,
    );
    const id = rows[0]?.id;
    return { created: true, fallback: false, id };
  } catch {
    // Table doesn't exist — fall through to ActivityLog
  }

  // 2. Fall back to ActivityLog
  try {
    const log = await prisma.activityLog.create({
      data: {
        action: "EXPENSE_OCR",
        details: JSON.stringify({
          vendor,
          amount,
          category,
          date,
          currency: extracted.currency,
          confidence: extracted.confidence,
          items: extracted.items,
          tax: extracted.tax,
          total: extracted.total,
        }),
        userId,
        companyId,
      },
    });
    return { created: true, fallback: true, id: log.id };
  } catch (e2) {
    console.error("[persistExpense] ActivityLog fallback failed:", e2);
    return { created: false, fallback: true };
  }
}

/** Log OCR event to ActivityLog (always, regardless of expense creation). */
async function logOcrEvent(
  extracted: ExtractedReceipt,
  companyId: string,
  userId: string | null,
): Promise<void> {
  await prisma.activityLog
    .create({
      data: {
        action: "EXPENSE_OCR",
        details: JSON.stringify({
          vendor: extracted.vendor,
          amount: extracted.amount,
          total: extracted.total,
          currency: extracted.currency,
          date: extracted.date,
          category: extracted.category,
          confidence: extracted.confidence,
          itemCount: extracted.items?.length ?? 0,
        }),
        userId: userId ?? undefined,
        companyId,
      },
    })
    .catch(() => {
      // Non-fatal — don't surface logging errors to the caller
    });
}

// ── POST /api/expenses/receipt ────────────────────────────────────────────────
// Body: { image: string (base64), mimeType?: string, autoCreate?: boolean }
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id") ?? null;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Request body is required" }, { status: 400 });
    }

    const {
      image,
      mimeType = "image/jpeg",
      autoCreate = false,
    } = body as {
      image?: string;
      mimeType?: string;
      autoCreate?: boolean;
    };

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "image (base64-encoded string) is required" },
        { status: 400 },
      );
    }

    // Extract receipt data via OpenAI Vision
    const extracted = await extractReceiptData(image, mimeType);

    // Always log the OCR event
    await logOcrEvent(extracted, companyId, userId);

    // Build expense shape for the response
    const expenseShape = buildExpenseFromReceipt(extracted, companyId, userId ?? "");

    // Optionally create the expense record
    let expenseResult: { created: boolean; fallback: boolean; id?: string } | null = null;
    if (autoCreate && userId) {
      expenseResult = await persistExpense(extracted, companyId, userId);
    }

    return NextResponse.json({
      extracted,
      expense: autoCreate
        ? {
            ...expenseShape,
            ...(expenseResult ?? {}),
          }
        : expenseShape,
    });
  } catch (err) {
    console.error("[POST /api/expenses/receipt]", err);
    return NextResponse.json({ error: "Failed to process receipt" }, { status: 500 });
  }
}

// ── GET /api/expenses/receipt?action=history ──────────────────────────────────
// Returns last 20 OCR events for this company.
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action !== "history") {
      return NextResponse.json(
        { error: 'Invalid action. Use action=history.' },
        { status: 400 },
      );
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        companyId,
        action: "EXPENSE_OCR",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        details: true,
        userId: true,
        createdAt: true,
      },
    });

    const history = logs.map((log) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = log.details ? JSON.parse(log.details) : {};
      } catch {
        // keep empty
      }
      return {
        id: log.id,
        userId: log.userId,
        createdAt: log.createdAt,
        ...parsed,
      };
    });

    return NextResponse.json({ history, total: history.length });
  } catch (err) {
    console.error("[GET /api/expenses/receipt]", err);
    return NextResponse.json({ error: "Failed to fetch OCR history" }, { status: 500 });
  }
}
