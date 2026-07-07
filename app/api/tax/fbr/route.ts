/**
 * GET/POST /api/tax/fbr
 *
 * FBR (Federal Board of Revenue) Pakistan tax report generation.
 *
 * Endpoints:
 *   GET  /api/tax/fbr                              — current quarter report
 *   GET  /api/tax/fbr?year=2025&quarter=1          — specific quarter (1–4)
 *   GET  /api/tax/fbr?year=2025&annual=true        — full annual report
 *   GET  /api/tax/fbr?action=deadlines             — upcoming FBR filing deadlines
 *
 *   POST /api/tax/fbr?action=export
 *        Body: { year, quarter?, format: "json"|"csv"|"summary" }
 *        Export report as JSON, CSV, or AI plain-English summary
 *
 * CRON NOTE:
 *   Add this entry to vercel.json to run a weekly deadline notification check:
 *   { "path": "/api/tax/fbr?action=deadline-check", "schedule": "0 9 * * 1" }
 *   (Every Monday at 09:00 UTC — adjust to local Pakistan time as needed)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateFbrReport,
  getFbrDeadline,
  checkUpcomingDeadlines,
  generateFbrSummaryText,
  type FbrReportPeriod,
} from "@/lib/fbrReport";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine the current Pakistan fiscal quarter.
 * FY Q1 = Jul–Sep, Q2 = Oct–Dec, Q3 = Jan–Mar, Q4 = Apr–Jun
 */
function getCurrentFiscalPeriod(): FbrReportPeriod {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed
  const calYear = today.getFullYear();

  // Pakistan fiscal year runs Jul–Jun
  // Q1: Jul(6)–Sep(8)  → FY = calYear+1  (e.g. Jul 2024 → FY2025 Q1)
  // Q2: Oct(9)–Dec(11) → FY = calYear+1
  // Q3: Jan(0)–Mar(2)  → FY = calYear
  // Q4: Apr(3)–Jun(5)  → FY = calYear

  if (month >= 6) {
    // Jul–Dec: FY starts
    const fy = calYear + 1;
    const quarter: 1 | 2 = month <= 8 ? 1 : 2;
    return { year: fy, quarter };
  } else {
    // Jan–Jun
    const fy = calYear;
    const quarter: 3 | 4 = month <= 2 ? 3 : 4;
    return { year: fy, quarter };
  }
}

function reportToCsv(report: Awaited<ReturnType<typeof generateFbrReport>>): string {
  const rows: string[][] = [
    ["FinovaOS FBR Tax Report"],
    [`Period: ${report.period}`],
    [`Generated: ${new Date(report.generatedAt).toLocaleString()}`],
    [],
    ["SALES TAX (GST)"],
    ["Field", "Amount (PKR)"],
    ["Total Sales", String(report.salesTax.totalSales)],
    ["Taxable Sales", String(report.salesTax.taxableSales)],
    ["Exempt Sales", String(report.salesTax.exemptSales)],
    ["Output Tax (17% GST)", String(report.salesTax.outputTax)],
    ["Input Tax (Purchases)", String(report.salesTax.inputTax)],
    ["Net GST Payable", String(report.salesTax.netTax)],
    [],
    ["INCOME TAX"],
    ["Field", "Amount (PKR)"],
    ["Gross Revenue", String(report.incomeTax.grossRevenue)],
    ["Total Expenses", String(report.incomeTax.totalExpenses)],
    ["Net Income", String(report.incomeTax.netIncome)],
    ["Taxable Income", String(report.incomeTax.taxableIncome)],
    ["Estimated Tax", String(report.incomeTax.estimatedTax)],
    ["Advance Tax Paid", String(report.incomeTax.advanceTaxPaid)],
    ["Balance Tax Due", String(report.incomeTax.balanceTax)],
    [],
    ["WITHHOLDING TAX"],
    ["Field", "Amount (PKR)"],
    ["WHT Collected (from customers)", String(report.withholdingTax.collected)],
    ["WHT Deducted (from suppliers)", String(report.withholdingTax.deducted)],
    ["Net WHT", String(report.withholdingTax.net)],
    [],
    ["SUMMARY"],
    ["Total Tax Liability", String(report.summary.totalTaxLiability)],
    ["Filing Due Date", report.summary.dueDate],
    ["Penalty if Late (PKR/month)", String(report.summary.penaltyIfLate)],
    [],
    ["RECOMMENDATIONS"],
    ...report.summary.recommendations.map((r) => [r]),
    [],
    ["TOP CUSTOMERS"],
    ["Customer", "Revenue (PKR)", "Tax (PKR)"],
    ...report.rawData.topCustomers.map((c) => [c.name, String(c.revenue), String(c.tax)]),
    [],
    ["TOP EXPENSE CATEGORIES"],
    ["Category", "Amount (PKR)", "Tax Deductible"],
    ...report.rawData.topExpenses.map((e) => [e.category, String(e.amount), e.taxDeductible ? "Yes" : "No"]),
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "x-company-id header is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── GET ?action=deadlines ────────────────────────────────────────────────
    if (action === "deadlines") {
      const deadlines = await checkUpcomingDeadlines(companyId);
      return NextResponse.json({ deadlines, checkedAt: new Date().toISOString() });
    }

    // ── GET ?action=deadline-check (cron endpoint) ───────────────────────────
    // Add to vercel.json: { "path": "/api/tax/fbr?action=deadline-check", "schedule": "0 9 * * 1" }
    if (action === "deadline-check") {
      const deadlines = await checkUpcomingDeadlines(companyId);
      const urgent = deadlines.filter((d) => d.urgent);
      return NextResponse.json({
        checkedAt: new Date().toISOString(),
        upcoming: deadlines.length,
        urgent: urgent.length,
        deadlines,
      });
    }

    // ── Determine period from query params ───────────────────────────────────
    const yearParam = searchParams.get("year");
    const quarterParam = searchParams.get("quarter");
    const annualParam = searchParams.get("annual");

    let period: FbrReportPeriod;

    if (yearParam && annualParam === "true") {
      period = { year: parseInt(yearParam, 10) };
    } else if (yearParam && quarterParam) {
      const q = parseInt(quarterParam, 10);
      if (![1, 2, 3, 4].includes(q)) {
        return NextResponse.json(
          { error: "quarter must be 1, 2, 3, or 4" },
          { status: 400 },
        );
      }
      period = { year: parseInt(yearParam, 10), quarter: q as 1 | 2 | 3 | 4 };
    } else {
      // Default: current quarter
      period = getCurrentFiscalPeriod();
    }

    const report = await generateFbrReport(companyId, period);

    return NextResponse.json({ report, period });
  } catch (err) {
    console.error("GET /api/tax/fbr error:", err);
    return NextResponse.json({ error: "Failed to generate FBR report" }, { status: 500 });
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

    if (action !== "export") {
      return NextResponse.json(
        { error: "Use POST with ?action=export" },
        { status: 400 },
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { year, quarter, format = "json" } = body || {};

    if (!year || typeof year !== "number") {
      return NextResponse.json(
        { error: "Body must include { year: number, quarter?: 1|2|3|4, format: 'json'|'csv'|'summary' }" },
        { status: 400 },
      );
    }

    if (!["json", "csv", "summary"].includes(format)) {
      return NextResponse.json(
        { error: "format must be 'json', 'csv', or 'summary'" },
        { status: 400 },
      );
    }

    let period: FbrReportPeriod;
    if (quarter !== undefined) {
      if (![1, 2, 3, 4].includes(quarter)) {
        return NextResponse.json({ error: "quarter must be 1, 2, 3, or 4" }, { status: 400 });
      }
      period = { year, quarter: quarter as 1 | 2 | 3 | 4 };
    } else {
      period = { year };
    }

    const report = await generateFbrReport(companyId, period);

    // ── Format: JSON ──────────────────────────────────────────────────────────
    if (format === "json") {
      const filename = `fbr-report-${report.period.replace(/\s+/g, "-").toLowerCase()}.json`;
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── Format: CSV ───────────────────────────────────────────────────────────
    if (format === "csv") {
      const csv = reportToCsv(report);
      const filename = `fbr-report-${report.period.replace(/\s+/g, "-").toLowerCase()}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // ── Format: summary (AI plain-English) ───────────────────────────────────
    if (format === "summary") {
      const summaryText = await generateFbrSummaryText(report);
      return NextResponse.json({
        period: report.period,
        generatedAt: report.generatedAt,
        summary: summaryText,
        totalTaxLiability: report.summary.totalTaxLiability,
        dueDate: report.summary.dueDate,
      });
    }

    // Should not reach here
    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/tax/fbr error:", err);
    return NextResponse.json({ error: "Failed to export FBR report" }, { status: 500 });
  }
}
