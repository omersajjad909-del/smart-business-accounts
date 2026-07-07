/**
 * POST /api/accounting/categorize
 *
 * AI-powered transaction auto-categorization.
 *
 * Endpoints:
 *   POST  /api/accounting/categorize
 *         Body: { transactions: TransactionForCategorization[] }
 *         OR:   { transactionId: string, type: "bank"|"expense"|"journal" }
 *         Returns: { results: CategorizationResult[], applied: number }
 *
 *   POST  /api/accounting/categorize?action=auto_apply
 *         Fetch all uncategorized bank statements for company, auto-categorize, update DB.
 *         Returns: { processed: number, categorized: number, failed: number }
 *
 *   POST  /api/accounting/categorize?action=learn
 *         Body: { examples: [{ description, category }] }
 *         Save custom category rules for this company.
 *
 *   GET   /api/accounting/categorize?action=rules
 *         List company-specific category rules.
 *
 *   GET   /api/accounting/categorize?action=stats
 *         { categorized: number, uncategorized: number, byCategory: Record<string, number> }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  categorizeBatch,
  learnCategoryRules,
  type TransactionForCategorization,
} from "@/lib/autoCategorizeTx";
export const runtime = "nodejs";
export const maxDuration = 120;

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "x-company-id header is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── GET ?action=rules ────────────────────────────────────────────────────
    if (action === "rules") {
      const logs = await prisma.activityLog.findMany({
        where: { companyId, action: "CATEGORY_RULE" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const rules: Array<{ description: string; category: string; learnedAt: string }> = [];
      for (const log of logs) {
        try {
          const data = JSON.parse(log.details || "{}");
          if (Array.isArray(data.examples)) {
            for (const ex of data.examples) {
              rules.push({
                description: ex.description,
                category: ex.category,
                learnedAt: data.learnedAt || log.createdAt.toISOString(),
              });
            }
          }
        } catch {
          // skip malformed entries
        }
      }

      return NextResponse.json({ rules, total: rules.length });
    }

    // ── GET ?action=stats ────────────────────────────────────────────────────
    if (action === "stats") {
      // Count bank statements with/without category (using description heuristics)
      const [totalStatements, categoryLogs] = await Promise.all([
        prisma.bankStatement.count({
          where: { company: { id: companyId } },
        }),
        prisma.activityLog.findMany({
          where: { companyId, action: "AUTO_CATEGORIZE" },
          orderBy: { createdAt: "desc" },
          take: 1000,
        }),
      ]);

      const byCategory: Record<string, number> = {};
      let categorized = 0;

      for (const log of categoryLogs) {
        try {
          const data = JSON.parse(log.details || "{}");
          if (Array.isArray(data.results)) {
            for (const r of data.results) {
              if (r.category) {
                byCategory[r.category] = (byCategory[r.category] || 0) + 1;
                categorized++;
              }
            }
          }
        } catch {
          // skip
        }
      }

      const uncategorized = Math.max(0, totalStatements - categorized);

      return NextResponse.json({ categorized, uncategorized, byCategory, total: totalStatements });
    }

    return NextResponse.json({ error: "Unknown action. Use ?action=rules or ?action=stats" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/accounting/categorize error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "x-company-id header is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── POST ?action=learn ──────────────────────────────────────────────────
    if (action === "learn") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const examples = body?.examples;
      if (!Array.isArray(examples) || examples.length === 0) {
        return NextResponse.json(
          { error: "Body must contain a non-empty examples array: [{ description, category }]" },
          { status: 400 },
        );
      }

      await learnCategoryRules(companyId, examples);
      return NextResponse.json({ saved: true, count: examples.length });
    }

    // ── POST ?action=auto_apply ─────────────────────────────────────────────
    if (action === "auto_apply") {
      let processed = 0;
      let categorized = 0;
      let failed = 0;

      // Fetch uncategorized bank statements
      // BankStatement.description is always present; we identify "uncategorized"
      // by checking the activity log — statements not yet processed.
      const uncategorizedRows = await prisma.$queryRaw<
        Array<{ id: string; description: string; amount: number; type: string; date: Date }>
      >`
        SELECT
          bs.id,
          bs.description,
          bs.amount,
          CASE WHEN bs.amount < 0 THEN 'debit' ELSE 'credit' END AS type,
          bs.date
        FROM "BankStatement" bs
        INNER JOIN "BankAccount" ba ON ba.id = bs."bankAccountId"
        WHERE ba."companyId" = ${companyId}
          AND NOT EXISTS (
            SELECT 1 FROM "ActivityLog" al
            WHERE al."companyId" = ${companyId}
              AND al.action = 'AUTO_CATEGORIZE'
              AND al.details LIKE '%' || bs.id || '%'
          )
        ORDER BY bs.date DESC
        LIMIT 100
      `;

      processed = uncategorizedRows.length;

      if (processed === 0) {
        return NextResponse.json({ processed: 0, categorized: 0, failed: 0, message: "All transactions already categorized." });
      }

      // Map to TransactionForCategorization
      const transactions: TransactionForCategorization[] = uncategorizedRows.map((row) => ({
        id: row.id,
        description: row.description,
        amount: Math.abs(Number(row.amount)),
        type: Number(row.amount) < 0 ? "debit" : "credit",
        date: new Date(row.date).toISOString().split("T")[0],
      }));

      // Categorize in batches
      let results;
      try {
        results = await categorizeBatch(transactions, companyId);
      } catch (error) {
        console.error("auto_apply categorizeBatch error:", error);
        return NextResponse.json({ error: "Categorization failed" }, { status: 500 });
      }

      // Store results in ActivityLog for audit trail
      const successResults = results.filter((r) => r.category && r.category !== "Miscellaneous");
      categorized = successResults.length;
      failed = processed - categorized;

      if (results.length > 0) {
        try {
          await prisma.activityLog.create({
            data: {
              companyId,
              action: "AUTO_CATEGORIZE",
              details: JSON.stringify({
                processedAt: new Date().toISOString(),
                processed,
                categorized,
                failed,
                results: results.map((r) => ({
                  id: r.id,
                  category: r.category,
                  confidence: r.confidence,
                  fbrCode: r.fbrCode,
                })),
              }),
            },
          });
        } catch (logError) {
          console.error("Failed to log categorization results:", logError);
          // Non-fatal — categorization still succeeded
        }
      }

      return NextResponse.json({
        processed,
        categorized,
        failed,
        results: results.slice(0, 50), // return preview of first 50
      });
    }

    // ── POST (default) — categorize supplied transactions ──────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Case 1: array of transactions supplied directly
    if (Array.isArray(body?.transactions)) {
      const transactions: TransactionForCategorization[] = body.transactions;

      if (transactions.length === 0) {
        return NextResponse.json({ results: [], applied: 0 });
      }

      if (transactions.length > 200) {
        return NextResponse.json(
          { error: "Maximum 200 transactions per request. Use ?action=auto_apply for bulk processing." },
          { status: 400 },
        );
      }

      const results = await categorizeBatch(transactions, companyId);
      return NextResponse.json({ results, applied: results.length });
    }

    // Case 2: single transaction by ID + type
    if (body?.transactionId && body?.type) {
      const { transactionId, type } = body as { transactionId: string; type: "bank" | "expense" | "journal" };

      let tx: TransactionForCategorization | null = null;

      if (type === "bank") {
        const row = await prisma.bankStatement.findFirst({
          where: {
            id: transactionId,
            company: { id: companyId },
          },
        });
        if (!row) {
          return NextResponse.json({ error: "Bank statement not found" }, { status: 404 });
        }
        tx = {
          id: row.id,
          description: row.description,
          amount: Math.abs(Number(row.amount)),
          type: Number(row.amount) < 0 ? "debit" : "credit",
          date: row.date.toISOString().split("T")[0],
        };
      } else if (type === "expense") {
        const row = await prisma.expenseVoucher.findFirst({
          where: { id: transactionId, companyId, deletedAt: null },
        });
        if (!row) {
          return NextResponse.json({ error: "Expense voucher not found" }, { status: 404 });
        }
        tx = {
          id: row.id,
          description: row.description,
          amount: Number(row.totalAmount),
          type: "debit",
          date: row.date.toISOString().split("T")[0],
        };
      } else {
        return NextResponse.json(
          { error: "Unsupported type. Use 'bank', 'expense', or 'journal'." },
          { status: 400 },
        );
      }

      const results = await categorizeBatch([tx], companyId);
      return NextResponse.json({ results, applied: results.length });
    }

    return NextResponse.json(
      {
        error:
          "Invalid request body. Provide { transactions: [...] } or { transactionId, type } or use ?action=auto_apply / ?action=learn",
      },
      { status: 400 },
    );
  } catch (err) {
    console.error("POST /api/accounting/categorize error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
