import { prisma } from "@/lib/prisma";

export type ReconciliationCandidateType =
  | "payment_receipt"
  | "sales_invoice"
  | "purchase_invoice"
  | "expense_voucher";

export interface SmartReconciliationCandidate {
  id: string;
  type: ReconciliationCandidateType;
  label: string;
  party: string;
  amount: number;
  date: string;
  reference?: string | null;
  confidence: number;
  reasons: string[];
}

export interface SmartReconciliationSuggestion {
  statementId: string;
  statementNo: string;
  date: string;
  amount: number;
  description: string;
  referenceNo?: string | null;
  risk: "low" | "medium" | "high";
  explanation: string;
  candidates: SmartReconciliationCandidate[];
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string) {
  const left = new Set(normalize(a).split(" ").filter((token) => token.length >= 3));
  const right = new Set(normalize(b).split(" ").filter((token) => token.length >= 3));
  if (!left.size || !right.size) return 0;
  let hits = 0;
  for (const token of left) if (right.has(token)) hits += 1;
  return hits / Math.max(left.size, right.size);
}

function daysBetween(a: Date, b: Date) {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

function scoreCandidate(
  statement: { amount: number; date: Date; description: string; referenceNo?: string | null },
  candidate: {
    amount: number;
    date: Date;
    reference?: string | null;
    party?: string | null;
    label: string;
  },
) {
  const reasons: string[] = [];
  let score = 0;
  const statementAmount = Math.abs(Number(statement.amount || 0));
  const candidateAmount = Math.abs(Number(candidate.amount || 0));
  const amountDiff = Math.abs(statementAmount - candidateAmount);
  const amountTolerance = Math.max(1, statementAmount * 0.01);

  if (amountDiff <= 0.01) {
    score += 52;
    reasons.push("Exact amount match");
  } else if (amountDiff <= amountTolerance) {
    score += 42;
    reasons.push("Amount is within 1% tolerance");
  } else if (statementAmount > 0 && amountDiff / statementAmount <= 0.05) {
    score += 24;
    reasons.push("Amount is close but needs review");
  }

  const dateGap = daysBetween(statement.date, candidate.date);
  if (dateGap <= 1) {
    score += 18;
    reasons.push("Date is within 1 day");
  } else if (dateGap <= 7) {
    score += 12;
    reasons.push("Date is within 7 days");
  } else if (dateGap <= 30) {
    score += 5;
    reasons.push("Date is within 30 days");
  }

  const referenceText = `${statement.referenceNo || ""} ${statement.description}`;
  const candidateText = `${candidate.reference || ""} ${candidate.party || ""} ${candidate.label}`;
  const overlap = tokenOverlap(referenceText, candidateText);
  if (overlap >= 0.5) {
    score += 22;
    reasons.push("Reference or party text strongly matches");
  } else if (overlap >= 0.25) {
    score += 12;
    reasons.push("Reference or party text partially matches");
  }

  if (statement.referenceNo && candidate.reference && normalize(statement.referenceNo) === normalize(candidate.reference)) {
    score += 8;
    reasons.push("Reference number matches exactly");
  }

  return {
    confidence: Math.max(0, Math.min(99, Math.round(score))),
    reasons: reasons.length ? reasons : ["No strong match signal; review manually"],
  };
}

function riskFromCandidates(candidates: SmartReconciliationCandidate[]): SmartReconciliationSuggestion["risk"] {
  const top = candidates[0]?.confidence || 0;
  const second = candidates[1]?.confidence || 0;
  if (top >= 90 && top - second >= 12) return "low";
  if (top >= 70) return "medium";
  return "high";
}

export async function buildSmartReconciliationSuggestions(
  companyId: string,
  bankAccountId?: string | null,
): Promise<SmartReconciliationSuggestion[]> {
  const statementWhere: any = {
    isReconciled: false,
    bankAccount: { companyId },
  };
  if (bankAccountId) statementWhere.bankAccountId = bankAccountId;

  const since = new Date();
  since.setDate(since.getDate() - 180);

  const [statements, receipts, salesInvoices, purchaseInvoices, expenseVouchers] = await prisma.$transaction([
    prisma.bankStatement.findMany({
      where: statementWhere,
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.paymentReceipt.findMany({
      where: { companyId, deletedAt: null, date: { gte: since }, status: { not: "RECONCILED" } },
      include: { party: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: since } },
      include: { customer: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null, date: { gte: since } },
      include: { supplier: true },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.expenseVoucher.findMany({
      where: { companyId, deletedAt: null, date: { gte: since } },
      orderBy: { date: "desc" },
      take: 200,
    }),
  ]);

  const rawCandidates = [
    ...receipts.map((row) => ({
      id: row.id,
      type: "payment_receipt" as const,
      label: row.receiptNo,
      party: row.party?.name || "Customer receipt",
      amount: Number(row.amount || 0),
      date: row.date,
      reference: row.referenceNo || row.narration,
    })),
    ...salesInvoices.map((row) => ({
      id: row.id,
      type: "sales_invoice" as const,
      label: row.invoiceNo,
      party: row.customer?.name || "Customer invoice",
      amount: Number(row.total || 0),
      date: row.date,
      reference: row.reference || row.notes,
    })),
    ...purchaseInvoices.map((row) => ({
      id: row.id,
      type: "purchase_invoice" as const,
      label: row.invoiceNo,
      party: row.supplier?.name || "Supplier invoice",
      amount: Number(row.total || 0),
      date: row.date,
      reference: row.reference || row.notes,
    })),
    ...expenseVouchers.map((row) => ({
      id: row.id,
      type: "expense_voucher" as const,
      label: row.voucherNo,
      party: row.description || "Expense voucher",
      amount: Number(row.totalAmount || 0),
      date: row.date,
      reference: row.reference || row.description,
    })),
  ];

  return statements.map((statement) => {
    const candidates = rawCandidates
      .map((candidate) => {
        const scored = scoreCandidate(statement, candidate);
        return {
          ...candidate,
          date: candidate.date.toISOString(),
          confidence: scored.confidence,
          reasons: scored.reasons,
        };
      })
      .filter((candidate) => candidate.confidence >= 35)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    const risk = riskFromCandidates(candidates);
    const top = candidates[0];
    return {
      statementId: statement.id,
      statementNo: statement.statementNo,
      date: statement.date.toISOString(),
      amount: Number(statement.amount || 0),
      description: statement.description,
      referenceNo: statement.referenceNo,
      risk,
      explanation: top
        ? `${top.confidence}% match with ${top.label}: ${top.reasons.join(", ")}.`
        : "No confident match found. Review manually for duplicates, missing entries, or unusual transaction activity.",
      candidates,
    };
  });
}
