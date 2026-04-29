import { prisma } from "@/lib/prisma";

export type TravelSourceCategory = "travel_ticket" | "visa_case";

type TravelInvoiceSource = {
  category: TravelSourceCategory;
  invoiceLabel: string;
  revenueAccount: string;
  serviceItemName: string;
  customerName: string;
  supplierName: string;
  amount: number;
  costAmount: number;
  issueDate: Date;
  dueDate: Date | null;
  notes: string;
  reference: string;
  title: string;
  data: Record<string, unknown>;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseDate(value: unknown, fallback = new Date()) {
  const date = value ? new Date(String(value)) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function nextNumberFromCode(code: string, fallback: number) {
  const digits = parseInt(code.replace(/\D/g, ""), 10);
  return Number.isFinite(digits) ? digits + 1 : fallback;
}

export async function buildTravelSource(companyId: string, recordId: string) {
  const record = await prisma.businessRecord.findFirst({
    where: {
      id: recordId,
      companyId,
      category: { in: ["travel_ticket", "visa_case"] },
    },
  });

  if (!record) throw new Error("Travel record not found");

  const data = asRecord(record.data);
  const issueDate = parseDate(record.date || data.submissionDate || data.travelDate);
  const dueDate = data.paymentDue ? parseDate(data.paymentDue, issueDate) : null;

  if (record.category === "travel_ticket") {
    return {
      record,
      source: {
        category: "travel_ticket" as const,
        invoiceLabel: "Air Ticket Revenue",
        revenueAccount: "Air Ticket Revenue",
        serviceItemName: "Air Ticket Service",
        customerName: String(data.passenger || record.title || "").trim(),
        supplierName: String(data.supplier || data.airline || "").trim(),
        amount: Number(record.amount || 0),
        costAmount: Number(data.cost || 0),
        issueDate,
        dueDate,
        notes: `Ticket booking for ${String(data.route || "travel itinerary").trim() || "travel itinerary"} | PNR: ${String(data.pnr || "-")}`,
        reference: record.title,
        title: record.title,
        data,
      },
    };
  }

  return {
    record,
    source: {
      category: "visa_case" as const,
      invoiceLabel: "Visa Processing Revenue",
      revenueAccount: "Visa Processing Revenue",
      serviceItemName: "Visa Processing Service",
      customerName: String(data.applicant || record.title || "").trim(),
      supplierName: String(data.supplier || data.embassy || data.country || "").trim(),
      amount: Number(record.amount || 0),
      costAmount: Number(data.cost || 0),
      issueDate,
      dueDate,
      notes: `Visa processing for ${String(data.country || "destination").trim() || "destination"} | Passport: ${String(data.passportNo || "-")}`,
      reference: record.title,
      title: record.title,
      data,
    },
  };
}

export async function ensurePartyAccount(params: {
  companyId: string;
  name: string;
  partyType: "CUSTOMER" | "SUPPLIER";
  openDate: Date;
}) {
  const { companyId, name, partyType, openDate } = params;
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error(`${partyType === "CUSTOMER" ? "Customer" : "Supplier"} name is required`);
  }

  const existing = await prisma.account.findFirst({
    where: {
      companyId,
      name: { equals: trimmedName, mode: "insensitive" },
      deletedAt: null,
    },
  });
  if (existing) return existing;

  const prefix = partyType === "CUSTOMER" ? "1100" : "2100";
  const lastCode = await prisma.account.findFirst({
    where: { companyId, code: { startsWith: prefix } },
    orderBy: { code: "desc" },
  });
  const nextCode = String(lastCode ? nextNumberFromCode(lastCode.code, Number(`${prefix}1`)) : Number(`${prefix}1`));

  return prisma.account.create({
    data: {
      companyId,
      name: trimmedName,
      code: nextCode,
      type: partyType === "CUSTOMER" ? "ASSET" : "LIABILITY",
      partyType,
      openDebit: 0,
      openCredit: 0,
      openDate,
    },
  });
}

export async function ensureRevenueAccount(companyId: string, name: string) {
  const existing = await prisma.account.findFirst({
    where: { companyId, name: { equals: name, mode: "insensitive" }, deletedAt: null },
  });
  if (existing) return existing;

  const codeMap: Record<string, string> = {
    "Air Ticket Revenue": "4001",
    "Visa Processing Revenue": "4002",
  };

  return prisma.account.create({
    data: {
      companyId,
      code: codeMap[name] || "4009",
      name,
      type: "INCOME",
    },
  });
}

export async function ensureServiceItem(companyId: string, name: string, rate: number) {
  const existing = await prisma.itemNew.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: "insensitive" },
      deletedAt: null,
    },
  });
  if (existing) return existing;

  const baseCode = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "SERVICE";
  return prisma.itemNew.create({
    data: {
      companyId,
      code: `${baseCode}-${Date.now()}`,
      name,
      category: "SERVICE",
      unit: "JOB",
      rate,
      purchaseRate: 0,
      minStock: 0,
    },
  });
}

export async function getNextSalesInvoiceNo(companyId: string) {
  const last = await prisma.salesInvoice.findFirst({
    where: { companyId, invoiceNo: { startsWith: "SI-" } },
    orderBy: { createdAt: "desc" },
  });
  const lastNum = last ? parseInt(String(last.invoiceNo || "").replace("SI-", ""), 10) || 0 : 0;
  return `SI-${lastNum + 1}`;
}
