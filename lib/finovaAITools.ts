/**
 * FinovaOS AI — Tool Registry
 *
 * finovaChat() (lib/finovaAI.ts) used to answer every question from one fixed
 * financial-summary blob, so a question about a specific product, BOM,
 * employee, invoice, or customer got a generic answer — the data was simply
 * never fetched. These tools let the model query the live, company-scoped
 * database on demand for exactly the record it needs.
 *
 * Every executor takes a resolved `companyId` (mirrors buildFinancialContext's
 * convention) and never throws — runFinovaTool() wraps each call so one bad
 * lookup degrades to an {error} string instead of breaking the chat.
 */

import { prisma } from "@/lib/prisma";
import { getStockOnHand, getAverageCosts, readBomLines } from "@/lib/manufacturingPosting";

export interface FinovaTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

type ToolExecutor = (companyId: string, args: Record<string, unknown>) => Promise<unknown>;

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(args: Record<string, unknown>, key: string, fallback: number): number {
  const v = Number(args[key]);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 20) : fallback;
}

function dateRange(args: Record<string, unknown>): { gte?: Date; lte?: Date } | undefined {
  const from = str(args, "from");
  const to = str(args, "to");
  if (!from && !to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(from);
  if (to) range.lte = new Date(to);
  return range;
}

// ─── 1. Manufacturing records (BOM/production/work-order/finished-goods/QC listing) ─

const MFG_CATEGORY_MAP: Record<string, (data: Record<string, unknown>, title: string, status: string, amount: number, date: string) => unknown> = {
  bom: (data, title, _status, amount) => ({
    product: title,
    version: String(data.version || "v1.0"),
    materials: String(data.materials || "").split(",").map((m) => m.trim()).filter(Boolean),
    unitCost: amount,
    yieldUnits: Number(data.yield || 1),
  }),
  production_order: (data, title, status, _amount, date) => ({
    orderId: String(data.orderId || title),
    product: title,
    quantity: Number(data.quantity || 1),
    completed: Number(data.completed || 0),
    plannedDate: date,
    assignedTo: String(data.assignedTo || ""),
    status,
    bomId: String(data.bomId || ""),
  }),
  work_order: (data, title, status, _amount, date) => ({
    workOrderId: String(data.workOrderId || title),
    title,
    machine: String(data.machine || ""),
    operator: String(data.operator || ""),
    priority: String(data.priority || "medium"),
    scheduledDate: date,
    status,
  }),
  finished_good_batch: (data, title, status, _amount, date) => ({
    batchNo: String(data.batchNo || title),
    product: title,
    quantity: Number(data.quantity || 0),
    warehouse: String(data.warehouse || "Main Warehouse"),
    productionDate: date,
    status,
  }),
  quality_check: (data, title, status, _amount, date) => ({
    inspectionNo: String(data.inspectionNo || title),
    itemName: title,
    stage: String(data.stage || "final"),
    inspector: String(data.inspector || ""),
    result: status,
    notes: String(data.notes || ""),
    checkedDate: date,
  }),
};

async function searchManufacturingRecords(companyId: string, args: Record<string, unknown>) {
  const category = str(args, "category");
  if (!category || !MFG_CATEGORY_MAP[category]) {
    return { error: `category must be one of: ${Object.keys(MFG_CATEGORY_MAP).join(", ")}` };
  }
  const query = str(args, "query");
  const status = str(args, "status");
  const limit = num(args, "limit", 10);

  const records = await prisma.businessRecord.findMany({
    where: {
      companyId,
      category,
      ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const mapper = MFG_CATEGORY_MAP[category];
  return {
    count: records.length,
    records: records.map((r) =>
      mapper((r.data || {}) as Record<string, unknown>, r.title, r.status, Number(r.amount || 0), String(r.date || "").slice(0, 10)),
    ),
  };
}

// ─── 2. BOM details (fixes the "generic tutorial instead of real BOM" bug) ────────

async function getBomDetails(companyId: string, args: Record<string, unknown>) {
  const productName = str(args, "productName");
  if (!productName) return { error: "productName is required" };

  const record = await prisma.businessRecord.findFirst({
    where: { companyId, category: "bom", title: { contains: productName, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { found: false, message: `No BOM found for "${productName}".` };

  const data = (record.data || {}) as Record<string, unknown>;
  const { lines, usable } = readBomLines(data);

  let materials: unknown[];
  if (usable) {
    const itemIds = lines.map((l) => l.itemId);
    const [items, stock, costs] = await Promise.all([
      prisma.itemNew.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, unit: true } }),
      getStockOnHand(prisma, companyId, itemIds),
      getAverageCosts(prisma, companyId, itemIds),
    ]);
    const itemMap = new Map(items.map((i) => [i.id, i]));
    materials = lines.map((l) => {
      const item = itemMap.get(l.itemId);
      return {
        name: item?.name || "Unknown item",
        unit: item?.unit || "",
        qtyPerBatch: l.qty,
        currentStock: stock.get(l.itemId) ?? 0,
        unitCost: costs.get(l.itemId) ?? 0,
      };
    });
  } else {
    materials = String(data.materials || "").split(",").map((m) => m.trim()).filter(Boolean).map((name) => ({ name }));
  }

  return {
    found: true,
    product: record.title,
    version: String(data.version || "v1.0"),
    yieldUnits: Number(data.yield || 1),
    unitCost: Number(record.amount || 0),
    materialsHaveQuantities: usable,
    materials,
  };
}

// ─── 3. Sales documents (invoices/quotations/delivery challans) ───────────────────

async function searchSalesDocuments(companyId: string, args: Record<string, unknown>) {
  const docType = str(args, "docType");
  const customerName = str(args, "customerName");
  const docNo = str(args, "docNo");
  const status = str(args, "status");
  const limit = num(args, "limit", 10);

  if (docType === "invoice") {
    const rows = await prisma.salesInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(customerName ? { customer: { name: { contains: customerName, mode: "insensitive" } } } : {}),
        ...(docNo ? { invoiceNo: { contains: docNo, mode: "insensitive" } } : {}),
        ...(status ? { approvalStatus: status } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      select: { invoiceNo: true, date: true, total: true, approvalStatus: true, customer: { select: { name: true } } },
    });
    return { count: rows.length, invoices: rows.map((r) => ({ invoiceNo: r.invoiceNo, date: r.date.toISOString().slice(0, 10), customer: r.customer?.name, total: r.total, status: r.approvalStatus })) };
  }

  if (docType === "quotation") {
    const rows = await prisma.quotation.findMany({
      where: {
        companyId,
        ...(customerName ? { OR: [{ customer: { name: { contains: customerName, mode: "insensitive" } } }, { customerName: { contains: customerName, mode: "insensitive" } }] } : {}),
        ...(docNo ? { quotationNo: { contains: docNo, mode: "insensitive" } } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      select: { quotationNo: true, date: true, total: true, status: true, customer: { select: { name: true } }, customerName: true },
    });
    return { count: rows.length, quotations: rows.map((r) => ({ quotationNo: r.quotationNo, date: r.date.toISOString().slice(0, 10), customer: r.customer?.name || r.customerName, total: r.total, status: r.status })) };
  }

  if (docType === "delivery_challan") {
    const rows = await prisma.deliveryChallan.findMany({
      where: {
        companyId,
        ...(customerName ? { customer: { name: { contains: customerName, mode: "insensitive" } } } : {}),
        ...(docNo ? { challanNo: { contains: docNo, mode: "insensitive" } } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      select: { challanNo: true, date: true, status: true, customer: { select: { name: true } } },
    });
    return { count: rows.length, challans: rows.map((r) => ({ challanNo: r.challanNo, date: r.date.toISOString().slice(0, 10), customer: r.customer?.name, status: r.status })) };
  }

  return { error: "docType must be one of: invoice, quotation, delivery_challan" };
}

// ─── 4. Invoice line-item detail ───────────────────────────────────────────────────

async function getInvoiceDetails(companyId: string, args: Record<string, unknown>) {
  const invoiceNo = str(args, "invoiceNo");
  if (!invoiceNo) return { error: "invoiceNo is required" };

  const invoice = await prisma.salesInvoice.findFirst({
    where: { companyId, deletedAt: null, invoiceNo: { contains: invoiceNo, mode: "insensitive" } },
    orderBy: { date: "desc" },
    include: { customer: { select: { name: true } }, items: { include: { item: { select: { name: true } } } } },
  });
  if (!invoice) return { found: false, message: `No invoice matching "${invoiceNo}" found.` };

  return {
    found: true,
    invoiceNo: invoice.invoiceNo,
    date: invoice.date.toISOString().slice(0, 10),
    customer: invoice.customer?.name,
    status: invoice.approvalStatus,
    total: invoice.total,
    items: invoice.items.map((it) => ({ name: it.item?.name, qty: it.qty, rate: it.rate, amount: it.amount })),
  };
}

// ─── 5. Purchase documents (POs/purchase invoices) ─────────────────────────────────

async function searchPurchaseDocuments(companyId: string, args: Record<string, unknown>) {
  const docType = str(args, "docType");
  const supplierName = str(args, "supplierName");
  const docNo = str(args, "docNo");
  const status = str(args, "status");
  const limit = num(args, "limit", 10);

  if (docType === "purchase_order") {
    const rows = await prisma.purchaseOrder.findMany({
      where: {
        companyId,
        ...(supplierName ? { supplier: { name: { contains: supplierName, mode: "insensitive" } } } : {}),
        ...(docNo ? { poNo: { contains: docNo, mode: "insensitive" } } : {}),
        ...(status ? { approvalStatus: status } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      select: { poNo: true, date: true, status: true, approvalStatus: true, supplier: { select: { name: true } }, items: { select: { qty: true, rate: true } } },
    });
    return {
      count: rows.length,
      purchaseOrders: rows.map((r) => ({
        poNo: r.poNo,
        date: r.date.toISOString().slice(0, 10),
        supplier: r.supplier?.name,
        status: r.approvalStatus,
        total: r.items.reduce((sum, it) => sum + it.qty * it.rate, 0),
      })),
    };
  }

  if (docType === "purchase_invoice") {
    const rows = await prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(supplierName ? { supplier: { name: { contains: supplierName, mode: "insensitive" } } } : {}),
        ...(docNo ? { invoiceNo: { contains: docNo, mode: "insensitive" } } : {}),
        ...(status ? { approvalStatus: status } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      select: { invoiceNo: true, date: true, total: true, approvalStatus: true, supplier: { select: { name: true } } },
    });
    return { count: rows.length, purchaseInvoices: rows.map((r) => ({ invoiceNo: r.invoiceNo, date: r.date.toISOString().slice(0, 10), supplier: r.supplier?.name, total: r.total, status: r.approvalStatus })) };
  }

  return { error: "docType must be one of: purchase_order, purchase_invoice" };
}

// ─── 6. CRM contacts ────────────────────────────────────────────────────────────────

async function searchContacts(companyId: string, args: Record<string, unknown>) {
  const name = str(args, "name");
  const type = str(args, "type");

  const rows = await prisma.contact.findMany({
    where: {
      companyId,
      deletedAt: null,
      isActive: true,
      ...(name ? { name: { contains: name, mode: "insensitive" } } : {}),
      ...(type ? { type } : {}),
    },
    take: 10,
    select: { name: true, email: true, phone: true, companyName: true, type: true, position: true },
  });
  return { count: rows.length, contacts: rows };
}

// ─── 7. Party (customer/supplier) balance ──────────────────────────────────────────

async function getAccountBalance(companyId: string, args: Record<string, unknown>) {
  const accountName = str(args, "accountName");
  if (!accountName) return { error: "accountName is required" };

  const account = await prisma.account.findFirst({
    where: { companyId, deletedAt: null, name: { contains: accountName, mode: "insensitive" } },
  });
  if (!account) return { found: false, message: `No customer/supplier matching "${accountName}" found.` };

  const now = new Date();
  const [receivableInvoices, payableInvoices] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { companyId, deletedAt: null, customerId: account.id, approvalStatus: { not: "REJECTED" } },
      select: { total: true, date: true },
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, deletedAt: null, supplierId: account.id, approvalStatus: { not: "REJECTED" } },
      select: { total: true, date: true },
    }),
  ]);

  const creditDays = account.creditDays ?? 30;
  let receivableTotal = 0;
  let receivableOverdue = 0;
  receivableInvoices.forEach((inv) => {
    receivableTotal += inv.total;
    const dueDate = new Date(inv.date);
    dueDate.setDate(dueDate.getDate() + creditDays);
    if (dueDate < now) receivableOverdue += inv.total;
  });

  let payableTotal = 0;
  let payableOverdue = 0;
  payableInvoices.forEach((inv) => {
    payableTotal += inv.total;
    const dueDate = new Date(inv.date);
    dueDate.setDate(dueDate.getDate() + 30);
    if (dueDate < now) payableOverdue += inv.total;
  });

  return {
    found: true,
    name: account.name,
    partyType: account.partyType,
    creditDays,
    creditLimit: account.creditLimit,
    receivableTotal,
    receivableOverdue,
    payableTotal,
    payableOverdue,
  };
}

// ─── 8. Item stock/rate lookup ──────────────────────────────────────────────────────

async function getItemStock(companyId: string, args: Record<string, unknown>) {
  const itemName = str(args, "itemName");
  if (!itemName) return { error: "itemName is required" };

  const items = await prisma.itemNew.findMany({
    where: { companyId, deletedAt: null, name: { contains: itemName, mode: "insensitive" } },
    take: 5,
    select: { id: true, name: true, code: true, category: true, unit: true, rate: true, purchaseRate: true, minStock: true },
  });
  if (!items.length) return { found: false, message: `No item matching "${itemName}" found.` };

  const ids = items.map((i) => i.id);
  const [stock, costs] = await Promise.all([getStockOnHand(prisma, companyId, ids), getAverageCosts(prisma, companyId, ids)]);

  return {
    found: true,
    items: items.map((i) => ({
      name: i.name,
      code: i.code,
      category: i.category,
      unit: i.unit,
      saleRate: i.rate,
      currentStock: stock.get(i.id) ?? 0,
      avgCost: costs.get(i.id) ?? i.purchaseRate,
      minStock: i.minStock,
      isLow: (stock.get(i.id) ?? 0) < i.minStock,
    })),
  };
}

// ─── 9/10. Employees + HR records ──────────────────────────────────────────────────

function employeeNameFilter(name: string) {
  return {
    OR: [
      { firstName: { contains: name, mode: "insensitive" as const } },
      { lastName: { contains: name, mode: "insensitive" as const } },
      { employeeId: { contains: name, mode: "insensitive" as const } },
    ],
  };
}

async function searchEmployees(companyId: string, args: Record<string, unknown>) {
  const name = str(args, "name");
  const department = str(args, "department");

  const rows = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      ...(name ? employeeNameFilter(name) : {}),
      ...(department ? { department: { contains: department, mode: "insensitive" } } : {}),
    },
    take: 10,
    select: { employeeId: true, firstName: true, lastName: true, designations: true, department: true, salary: true, dateOfJoining: true },
  });
  return { count: rows.length, employees: rows.map((e) => ({ ...e, dateOfJoining: e.dateOfJoining.toISOString().slice(0, 10) })) };
}

async function getEmployeeHrRecord(companyId: string, args: Record<string, unknown>) {
  const employeeName = str(args, "employeeName");
  const recordType = str(args, "recordType");
  if (!employeeName) return { error: "employeeName is required" };
  if (!recordType || !["payroll", "attendance", "leave"].includes(recordType)) {
    return { error: "recordType must be one of: payroll, attendance, leave" };
  }

  const employee = await prisma.employee.findFirst({
    where: { companyId, isActive: true, ...employeeNameFilter(employeeName) },
  });
  if (!employee) return { found: false, message: `No employee matching "${employeeName}" found.` };

  const employeeLabel = `${employee.firstName} ${employee.lastName}`;

  if (recordType === "payroll") {
    const monthYear = str(args, "monthYear");
    const rows = await prisma.payroll.findMany({
      where: { employeeId: employee.id, ...(monthYear ? { monthYear } : {}) },
      orderBy: { monthYear: "desc" },
      take: 6,
    });
    return { found: true, employee: employeeLabel, payroll: rows.map((p) => ({ monthYear: p.monthYear, baseSalary: p.baseSalary, allowances: p.allowances, deductions: p.deductions, netSalary: p.netSalary, paidAmount: p.paidAmount, paymentStatus: p.paymentStatus })) };
  }

  if (recordType === "attendance") {
    const range = dateRange(args);
    const rows = await prisma.attendance.findMany({
      where: { employeeId: employee.id, ...(range ? { date: range } : {}) },
      orderBy: { date: "desc" },
      take: 30,
    });
    const summary: Record<string, number> = {};
    rows.forEach((r) => { summary[r.status] = (summary[r.status] || 0) + 1; });
    return { found: true, employee: employeeLabel, summary, recent: rows.slice(0, 15).map((r) => ({ date: r.date.toISOString().slice(0, 10), status: r.status })) };
  }

  const rows = await prisma.leave.findMany({ where: { employeeId: employee.id }, orderBy: { startDate: "desc" }, take: 10 });
  return {
    found: true,
    employee: employeeLabel,
    leaves: rows.map((l) => ({ leaveType: l.leaveType, startDate: l.startDate.toISOString().slice(0, 10), endDate: l.endDate.toISOString().slice(0, 10), totalDays: l.totalDays, status: l.approvalStatus })),
  };
}

// ─── 11/12. Bank accounts + statements ─────────────────────────────────────────────

async function listBankAccounts(companyId: string, args: Record<string, unknown>) {
  const bankName = str(args, "bankName");
  const rows = await prisma.bankAccount.findMany({
    where: { companyId, deletedAt: null, ...(bankName ? { bankName: { contains: bankName, mode: "insensitive" } } : {}) },
    select: { accountNo: true, bankName: true, accountName: true, balance: true, lastReconcile: true },
  });
  return { count: rows.length, accounts: rows };
}

async function getBankStatement(companyId: string, args: Record<string, unknown>) {
  const query = str(args, "accountNoOrBankName");
  if (!query) return { error: "accountNoOrBankName is required" };
  const limit = num(args, "limit", 15);
  const range = dateRange(args);

  const account = await prisma.bankAccount.findFirst({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { accountNo: { contains: query, mode: "insensitive" } },
        { bankName: { contains: query, mode: "insensitive" } },
        { accountName: { contains: query, mode: "insensitive" } },
      ],
    },
  });
  if (!account) return { found: false, message: `No bank account matching "${query}" found.` };

  const rows = await prisma.bankStatement.findMany({
    where: { bankAccountId: account.id, ...(range ? { date: range } : {}) },
    orderBy: { date: "desc" },
    take: limit,
  });
  return {
    found: true,
    account: `${account.bankName} — ${account.accountNo}`,
    balance: account.balance,
    transactions: rows.map((r) => ({ date: r.date.toISOString().slice(0, 10), amount: r.amount, description: r.description, reconciled: r.isReconciled })),
  };
}

// ─── 13. General accounting records ────────────────────────────────────────────────

async function searchAccountingRecords(companyId: string, args: Record<string, unknown>) {
  const recordType = str(args, "recordType");
  const query = str(args, "query");
  const accountName = str(args, "accountName");
  const limit = num(args, "limit", 10);
  const range = dateRange(args);

  if (recordType === "voucher") {
    const rows = await prisma.voucher.findMany({
      where: { companyId, deletedAt: null, ...(query ? { voucherNo: { contains: query, mode: "insensitive" } } : {}), ...(range ? { date: range } : {}) },
      orderBy: { date: "desc" },
      take: limit,
      include: { entries: { include: { account: { select: { name: true } } } } },
    });
    return {
      count: rows.length,
      vouchers: rows.map((v) => ({ voucherNo: v.voucherNo, type: v.type, date: v.date.toISOString().slice(0, 10), narration: v.narration, entries: v.entries.map((e) => ({ account: e.account?.name, amount: e.amount })) })),
    };
  }

  if (recordType === "credit_note") {
    const rows = await prisma.creditNote.findMany({
      where: {
        companyId,
        ...(query ? { creditNoteNumber: { contains: query, mode: "insensitive" } } : {}),
        ...(accountName ? { account: { name: { contains: accountName, mode: "insensitive" } } } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      include: { account: { select: { name: true } } },
    });
    return { count: rows.length, records: rows.map((r) => ({ number: r.creditNoteNumber, date: r.date.toISOString().slice(0, 10), account: r.account?.name, amount: r.amount, reason: r.reason, status: r.status })) };
  }

  if (recordType === "debit_note") {
    const rows = await prisma.debitNote.findMany({
      where: {
        companyId,
        ...(query ? { debitNoteNumber: { contains: query, mode: "insensitive" } } : {}),
        ...(accountName ? { account: { name: { contains: accountName, mode: "insensitive" } } } : {}),
      },
      orderBy: { date: "desc" },
      take: limit,
      include: { account: { select: { name: true } } },
    });
    return { count: rows.length, records: rows.map((r) => ({ number: r.debitNoteNumber, date: r.date.toISOString().slice(0, 10), account: r.account?.name, amount: r.amount, reason: r.reason, status: r.status })) };
  }

  if (recordType === "budget") {
    const rows = await prisma.budget.findMany({
      where: { companyId, ...(accountName ? { account: { name: { contains: accountName, mode: "insensitive" } } } : {}) },
      include: { account: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });
    return { count: rows.length, budgets: rows.map((b) => ({ account: b.account?.name, year: b.year, month: b.month, amount: b.amount, category: b.category })) };
  }

  if (recordType === "expense_voucher") {
    const rows = await prisma.expenseVoucher.findMany({
      where: { companyId, deletedAt: null, ...(query ? { voucherNo: { contains: query, mode: "insensitive" } } : {}), ...(range ? { date: range } : {}) },
      orderBy: { date: "desc" },
      take: limit,
      include: { items: true },
    });
    return { count: rows.length, expenseVouchers: rows.map((v) => ({ voucherNo: v.voucherNo, date: v.date.toISOString().slice(0, 10), description: v.description, totalAmount: v.totalAmount, status: v.approvalStatus, items: v.items.map((i) => ({ description: i.description, amount: i.amount, category: i.category })) })) };
  }

  return { error: "recordType must be one of: voucher, credit_note, debit_note, budget, expense_voucher" };
}

// ─── Registry ───────────────────────────────────────────────────────────────────────

export const FINOVA_TOOLS: FinovaTool[] = [
  {
    name: "search_manufacturing_records",
    description: "List/search manufacturing records — BOMs, production orders, work orders, finished goods batches, or quality checks — by product/title name or status. Use this to find which BOM or production order exists for a product before answering.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", enum: Object.keys(MFG_CATEGORY_MAP), description: "Which manufacturing record type to search" },
        query: { type: "string", description: "Product/title name to search for" },
        status: { type: "string", description: "Filter by status (e.g. planned, in_progress, completed)" },
        limit: { type: "number", description: "Max results (default 10, max 20)" },
      },
      required: ["category"],
    },
  },
  {
    name: "get_bom_details",
    description: "Get the full Bill of Materials for a specific product by name, including material list, quantities (if recorded), version, and yield. Call this whenever the user asks about a product's BOM, recipe, or materials — e.g. 'what's the BOM for Bravo?'.",
    parameters: {
      type: "object",
      properties: { productName: { type: "string", description: "Product name to look up the BOM for" } },
      required: ["productName"],
    },
  },
  {
    name: "search_sales_documents",
    description: "Search sales invoices, quotations, or delivery challans by customer name, document number, or status.",
    parameters: {
      type: "object",
      properties: {
        docType: { type: "string", enum: ["invoice", "quotation", "delivery_challan"] },
        customerName: { type: "string" },
        docNo: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
      },
      required: ["docType"],
    },
  },
  {
    name: "get_invoice_details",
    description: "Get full line-item detail for one specific sales invoice by invoice number.",
    parameters: {
      type: "object",
      properties: { invoiceNo: { type: "string" } },
      required: ["invoiceNo"],
    },
  },
  {
    name: "search_purchase_documents",
    description: "Search purchase orders or purchase invoices by supplier name, document number, or status.",
    parameters: {
      type: "object",
      properties: {
        docType: { type: "string", enum: ["purchase_order", "purchase_invoice"] },
        supplierName: { type: "string" },
        docNo: { type: "string" },
        status: { type: "string" },
        limit: { type: "number" },
      },
      required: ["docType"],
    },
  },
  {
    name: "search_contacts",
    description: "Search CRM contacts (customers, suppliers, leads, partners) by name or type.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        type: { type: "string", enum: ["CUSTOMER", "SUPPLIER", "LEAD", "PARTNER"] },
      },
    },
  },
  {
    name: "get_account_balance",
    description: "Look up how much a specific customer owes you, or how much you owe a specific supplier, by account/party name.",
    parameters: {
      type: "object",
      properties: { accountName: { type: "string" } },
      required: ["accountName"],
    },
  },
  {
    name: "get_item_stock",
    description: "Look up current stock quantity, sale rate, and cost for a specific inventory item/product by name — use for any stock/rate question about a named item, not just the low-stock summary.",
    parameters: {
      type: "object",
      properties: { itemName: { type: "string" } },
      required: ["itemName"],
    },
  },
  {
    name: "search_employees",
    description: "Search employees by name, employee ID, or department.",
    parameters: {
      type: "object",
      properties: { name: { type: "string" }, department: { type: "string" } },
    },
  },
  {
    name: "get_employee_hr_record",
    description: "Get a specific employee's payroll history, attendance record, or leave record by employee name.",
    parameters: {
      type: "object",
      properties: {
        employeeName: { type: "string" },
        recordType: { type: "string", enum: ["payroll", "attendance", "leave"] },
        monthYear: { type: "string", description: "YYYY-MM, for payroll only" },
        from: { type: "string", description: "YYYY-MM-DD, for attendance only" },
        to: { type: "string", description: "YYYY-MM-DD, for attendance only" },
      },
      required: ["employeeName", "recordType"],
    },
  },
  {
    name: "list_bank_accounts",
    description: "List the company's bank accounts and their current balances.",
    parameters: {
      type: "object",
      properties: { bankName: { type: "string" } },
    },
  },
  {
    name: "get_bank_statement",
    description: "Get recent bank statement transactions for a specific bank account by account number or bank name.",
    parameters: {
      type: "object",
      properties: {
        accountNoOrBankName: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" },
      },
      required: ["accountNoOrBankName"],
    },
  },
  {
    name: "search_accounting_records",
    description: "Search general accounting records — journal/payment/receipt vouchers, credit notes, debit notes, budgets, or expense vouchers — by document number, account name, or date range.",
    parameters: {
      type: "object",
      properties: {
        recordType: { type: "string", enum: ["voucher", "credit_note", "debit_note", "budget", "expense_voucher"] },
        query: { type: "string" },
        accountName: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        limit: { type: "number" },
      },
      required: ["recordType"],
    },
  },
];

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  search_manufacturing_records: searchManufacturingRecords,
  get_bom_details: getBomDetails,
  search_sales_documents: searchSalesDocuments,
  get_invoice_details: getInvoiceDetails,
  search_purchase_documents: searchPurchaseDocuments,
  search_contacts: searchContacts,
  get_account_balance: getAccountBalance,
  get_item_stock: getItemStock,
  search_employees: searchEmployees,
  get_employee_hr_record: getEmployeeHrRecord,
  list_bank_accounts: listBankAccounts,
  get_bank_statement: getBankStatement,
  search_accounting_records: searchAccountingRecords,
};

function capResult(result: unknown): string {
  let json = JSON.stringify(result, (_key, value) => (value instanceof Date ? value.toISOString() : value));
  if (json.length > 6000) json = json.slice(0, 6000) + `... [truncated, ${json.length} chars total]`;
  return json;
}

export async function runFinovaTool(name: string, companyId: string, argsJson: string): Promise<string> {
  const executor = TOOL_EXECUTORS[name];
  if (!executor) return JSON.stringify({ error: `Unknown tool: ${name}` });

  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return JSON.stringify({ error: "Invalid tool arguments (not valid JSON)" });
  }

  try {
    const result = await executor(companyId, args);
    return capResult(result);
  } catch (error) {
    console.error(`[FinovaAI] Tool "${name}" failed:`, error);
    return JSON.stringify({ error: `Lookup failed for ${name}` });
  }
}
