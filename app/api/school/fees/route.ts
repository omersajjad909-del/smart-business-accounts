import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postSchoolFeeReceipt, syncSchoolFeeReceipts } from "@/lib/schoolAccounting";
import { bad, invoiceStatus, invoiceTotals, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const METHODS = ["CASH", "BANK", "JAZZCASH", "EASYPAISA", "OTHER"];
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false);
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const period = str(sp.get("period"));
  const studentId = str(sp.get("studentId"));
  const classId = str(sp.get("classId"));
  const wanted = str(sp.get("status")).toUpperCase();

  const rows = await prisma.schoolFeeInvoice.findMany({
    where: {
      companyId: ctx.companyId,
      ...(period ? { period } : {}),
      ...(studentId ? { studentId } : {}),
      ...(classId ? { student: { classId } } : {}),
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    take: 3000,
    include: {
      payments: { select: { id: true, receiptNo: true, amount: true, method: true, paidAt: true }, orderBy: { paidAt: "asc" } },
      student: { select: { name: true, admissionNo: true, class: { select: { name: true, section: true } } } },
    },
  });

  const now = new Date();
  const invoices = rows
    .map((inv) => {
      const t = invoiceTotals(inv);
      return { ...inv, ...t, status: invoiceStatus(t.balance, t.paid, inv.dueDate, now) };
    })
    .filter((inv) => !wanted || inv.status === wanted || (wanted === "OUTSTANDING" && inv.balance > 0));

  const summary = invoices.reduce(
    (s, i) => ({ billed: s.billed + i.payable, collected: s.collected + i.paid, outstanding: s.outstanding + i.balance }),
    { billed: 0, collected: 0, outstanding: 0 },
  );
  return NextResponse.json({ invoices, summary });
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const action = str(b.action);

  // ── Bulk invoice generation ────────────────────────────────────────────
  // Bills every selected fee head to every active student it applies to:
  //   class heads    → the class's amount for that head
  //   optional heads → only students enrolled in it, at their own amount
  // ONE_TIME heads are never billed twice to a student, ANNUAL heads once a calendar year.
  if (action === "generate") {
    const period = str(b.period);
    const dueDate = parseDay(b.dueDate);
    if (!PERIOD_RE.test(period)) return bad("Period must look like 2026-11");
    if (!dueDate) return bad("Due date is required");
    const classId = str(b.classId);
    const headIds: string[] = Array.isArray(b.headIds) ? b.headIds.map(String) : [];

    const allHeads = await prisma.schoolFeeHead.findMany({ where: { companyId: ctx.companyId, active: true } });
    // Nothing configured yet → the original single-fee behaviour (class.monthlyFee).
    const heads = allHeads.length === 0
      ? [{ id: "_legacy", name: "Tuition Fee", frequency: "MONTHLY", optional: false }]
      : allHeads.filter((h) => (headIds.length ? headIds.includes(h.id) : h.frequency === "MONTHLY"));
    if (heads.length === 0) return bad("Select at least one fee to bill");

    const students = await prisma.schoolStudent.findMany({
      where: { companyId: ctx.companyId, status: "ACTIVE", classId: classId || { not: null } },
      select: { id: true, classId: true, discount: true, class: { select: { monthlyFee: true } } },
    });
    const ids = students.map((s) => s.id);
    const realIds = heads.filter((h) => h.id !== "_legacy").map((h) => h.id);
    const [classFees, studentFees, prior] = await Promise.all([
      prisma.schoolClassFee.findMany({ where: { companyId: ctx.companyId, headId: { in: realIds } } }),
      prisma.schoolStudentFee.findMany({ where: { companyId: ctx.companyId, studentId: { in: ids }, headId: { in: realIds } } }),
      prisma.schoolFeeInvoice.findMany({ where: { companyId: ctx.companyId, studentId: { in: ids }, title: { in: heads.map((h) => h.name) } }, select: { studentId: true, title: true, period: true } }),
    ]);
    const classFee = new Map(classFees.map((c) => [`${c.classId}|${c.headId}`, c.amount]));
    const studentFee = new Map(studentFees.map((c) => [`${c.studentId}|${c.headId}`, c.amount]));
    const billedEver = new Set(prior.map((p) => `${p.studentId}|${p.title}`));
    const billedYear = new Set(prior.map((p) => `${p.studentId}|${p.title}|${p.period.slice(0, 4)}`));

    const data: { companyId: string; studentId: string; period: string; title: string; dueDate: Date; amount: number; discount: number }[] = [];
    let noFee = 0, alreadyBilled = 0;
    for (const st of students) {
      for (const h of heads) {
        let amount = 0;
        if (h.optional) amount = studentFee.get(`${st.id}|${h.id}`) ?? 0;
        else {
          amount = classFee.get(`${st.classId}|${h.id}`) ?? 0;
          if (!amount && h.name === "Tuition Fee") amount = st.class?.monthlyFee ?? 0; // fall back to the class's single monthly fee
        }
        if (amount <= 0) { if (!h.optional) noFee++; continue; }
        if (h.frequency === "ONE_TIME" && billedEver.has(`${st.id}|${h.name}`)) { alreadyBilled++; continue; }
        if (h.frequency === "ANNUAL" && billedYear.has(`${st.id}|${h.name}|${period.slice(0, 4)}`)) { alreadyBilled++; continue; }
        data.push({ companyId: ctx.companyId, studentId: st.id, period, title: h.name, dueDate, amount, discount: h.name === "Tuition Fee" ? Math.min(st.discount, amount) : 0 });
      }
    }
    const res = await prisma.schoolFeeInvoice.createMany({ data, skipDuplicates: true });
    return NextResponse.json({ created: res.count, skipped: data.length - res.count + alreadyBilled, noFee });
  }

  // ── One-off invoice (admission fee, exam fee, books …) ────────────────
  if (action === "one_off") {
    const studentId = str(b.studentId);
    const title = str(b.title);
    const amount = num(b.amount);
    const dueDate = parseDay(b.dueDate);
    if (!studentId || !title || amount <= 0 || !dueDate) return bad("Student, title, amount and due date are required");
    const student = await prisma.schoolStudent.findFirst({ where: { id: studentId, companyId: ctx.companyId }, select: { id: true } });
    if (!student) return bad("Student not found", 404);
    try {
      const row = await prisma.schoolFeeInvoice.create({ data: { companyId: ctx.companyId, studentId, title, period: str(b.period) || title, amount, dueDate } });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return bad("This invoice already exists for the student", 409);
      throw e;
    }
  }

  // ── Late fee: flat amount on overdue unpaid invoices of a period ──────
  if (action === "late_fee") {
    const period = str(b.period);
    const amount = num(b.amount);
    if (!PERIOD_RE.test(period) || amount <= 0) return bad("Period and a positive late fee are required");
    const overdue = await prisma.schoolFeeInvoice.findMany({
      where: { companyId: ctx.companyId, period, dueDate: { lt: new Date(Date.now() - 86_400_000) }, lateFee: 0 },
      include: { payments: { select: { amount: true } } },
    });
    const ids = overdue.filter((i) => invoiceTotals(i).balance > 0.005).map((i) => i.id);
    const res = await prisma.schoolFeeInvoice.updateMany({ where: { id: { in: ids }, companyId: ctx.companyId }, data: { lateFee: amount } });
    return NextResponse.json({ updated: res.count });
  }

  // ── Post any receipts missing from the general ledger ────────────────
  if (action === "sync_books") {
    return NextResponse.json(await syncSchoolFeeReceipts(ctx.companyId));
  }

  // ── Collect a payment ──────────────────────────────────────────────────
  if (action === "pay") {
    const invoiceId = str(b.invoiceId);
    const amount = num(b.amount);
    const method = METHODS.includes(str(b.method).toUpperCase()) ? str(b.method).toUpperCase() : "CASH";
    if (!invoiceId || amount <= 0) return bad("Invoice and a positive amount are required");

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const payment = await prisma.$transaction(async (tx) => {
          const inv = await tx.schoolFeeInvoice.findFirst({
            where: { id: invoiceId, companyId: ctx.companyId },
            include: { payments: { select: { amount: true } } },
          });
          if (!inv) throw new HttpError("Invoice not found", 404);
          const { balance } = invoiceTotals(inv);
          if (amount > balance + 0.005) throw new HttpError(`Amount exceeds the balance of ${balance}`, 409);
          const seq = await tx.schoolPayment.count({ where: { companyId: ctx.companyId } });
          const receiptNo = `RCP-${new Date().getFullYear()}-${String(seq + 1 + attempt).padStart(5, "0")}`;
          return tx.schoolPayment.create({ data: { companyId: ctx.companyId, invoiceId, amount, method, receiptNo, note: str(b.note) || null } });
        });
        // Book it in the general ledger. The receipt stands even if posting fails;
        // "Sync to books" on the fee page picks up anything missed.
        const student = await prisma.schoolFeeInvoice.findUnique({ where: { id: invoiceId }, select: { student: { select: { name: true } } } });
        let booked = true;
        try {
          await postSchoolFeeReceipt({ companyId: ctx.companyId, paymentId: payment.id, receiptNo: payment.receiptNo, studentName: student?.student.name ?? "", amount: payment.amount, method: payment.method, paidAt: payment.paidAt });
        } catch (err) {
          booked = false;
          console.error("[school] ledger posting failed", err);
        }
        return NextResponse.json({ ...payment, booked }, { status: 201 });
      } catch (e) {
        if (e instanceof HttpError) return bad(e.message, e.status);
        if ((e as { code?: string }).code !== "P2002") throw e;
      }
    }
    return bad("Could not allocate a receipt number, try again", 409);
  }

  return bad("Unknown action");
}

class HttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
