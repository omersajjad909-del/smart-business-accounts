import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStudentLimit } from "@/lib/schoolLimits";
import { bad, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const STATUSES = ["APPLICANT", "ACTIVE", "LEFT", "GRADUATED"];
const DOC_KEYS = ["BFORM", "PREV_RESULT", "LEAVING_CERT", "PHOTOS", "GUARDIAN_CNIC", "VACCINATION"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const digits = (v: string) => v.replace(/\D/g, "");

/** Next free roll number in a class: one more than the highest numeric roll among its active students. */
async function nextRollNo(companyId: string, classId: string) {
  const rows = await prisma.schoolStudent.findMany({ where: { companyId, classId, status: "ACTIVE", rollNo: { not: null } }, select: { rollNo: true } });
  return String(rows.reduce((m, r) => Math.max(m, parseInt(r.rollNo ?? "", 10) || 0), 0) + 1);
}

/** The name of the class if this roll number is already used there by another active student. */
async function rollTaken(companyId: string, classId: string, rollNo: string, exceptId?: string) {
  const hit = await prisma.schoolStudent.findFirst({
    where: { companyId, classId, status: "ACTIVE", rollNo: { equals: rollNo, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { name: true },
  });
  return hit?.name ?? null;
}
const optional = (v: unknown) => str(v) || null;

/** Validates and normalises the optional admission-form fields. Returns an error string on bad input. */
function admissionExtras(b: Record<string, unknown>, partial: boolean): { error: string } | { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  const has = (k: string) => !partial || b[k] !== undefined;

  for (const k of ["religion", "previousSchool", "previousClass", "city", "guardianOccupation", "motherName", "emergencyContact", "medicalNotes"] as const)
    if (has(k)) data[k] = optional(b[k]);

  if (has("bFormNo")) {
    const v = digits(str(b.bFormNo));
    if (v && v.length !== 13) return { error: "B-Form number must be 13 digits" };
    data.bFormNo = v || null;
  }
  if (has("guardianCnic")) {
    const v = digits(str(b.guardianCnic));
    if (v && v.length !== 13) return { error: "Guardian CNIC must be 13 digits" };
    data.guardianCnic = v || null;
  }
  for (const k of ["alternatePhone", "emergencyPhone"] as const) {
    if (!has(k)) continue;
    const v = digits(str(b[k]));
    if (v && (v.length < 10 || v.length > 13)) return { error: "Enter a valid phone number" };
    data[k] = v || null;
  }
  if (has("bloodGroup")) {
    const v = str(b.bloodGroup).toUpperCase();
    if (v && !BLOOD.includes(v)) return { error: "Invalid blood group" };
    data.bloodGroup = v || null;
  }
  if (has("guardianRelation")) {
    const v = str(b.guardianRelation).toUpperCase();
    if (v && !["FATHER", "MOTHER", "OTHER"].includes(v)) return { error: "Invalid guardian relation" };
    data.guardianRelation = v || null;
  }
  if (has("documents")) {
    const docs = Array.isArray(b.documents) ? b.documents.map(String).filter((d) => DOC_KEYS.includes(d)) : [];
    data.documents = [...new Set(docs)];
  }
  return { data };
}

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const sp = new URL(req.url).searchParams;
  const q = str(sp.get("q"));
  const status = str(sp.get("status")).toUpperCase();
  const classId = str(sp.get("classId"));
  const students = await prisma.schoolStudent.findMany({
    where: {
      companyId: ctx.companyId,
      ...(STATUSES.includes(status) ? { status } : {}),
      ...(classId ? { classId } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { admissionNo: { contains: q, mode: "insensitive" } }, { guardianName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || "~~", mode: "insensitive" } }] } : {}),
    },
    orderBy: { admissionNo: "asc" },
    take: 2000,
    include: { class: { select: { name: true, section: true } } },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Student name is required");
  const classId = str(b.classId) || null;
  if (classId && !(await prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }))) {
    return bad("Class not found", 404);
  }
  const status = STATUSES.includes(str(b.status).toUpperCase()) ? str(b.status).toUpperCase() : "ACTIVE";
  const phoneDigits = digits(str(b.phone));
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) return bad("Enter a valid guardian phone number");
  const dob = parseDay(b.dob);
  if (dob && (dob > new Date() || dob.getUTCFullYear() < 1990)) return bad("Check the date of birth");
  const extras = admissionExtras(b, false);
  if ("error" in extras) return bad(extras.error);
  const admissionFee = Math.max(0, num(b.admissionFee));
  if (status === "ACTIVE") { const limitError = await checkStudentLimit(ctx.companyId); if (limitError) return bad(limitError, 402); }

  // Roll number: use the supplied one (must be free in the class), else the next free number.
  let rollNo = str(b.rollNo).slice(0, 12) || null;
  if (classId && status === "ACTIVE") {
    if (rollNo) { const who = await rollTaken(ctx.companyId, classId, rollNo); if (who) return bad(`Roll no. ${rollNo} is already taken in this class by ${who}`, 409); }
    else rollNo = await nextRollNo(ctx.companyId, classId);
  }

  // Admission number: use the supplied one, else next in sequence.
  let admissionNo = str(b.admissionNo);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!admissionNo || attempt > 0) {
      const count = await prisma.schoolStudent.count({ where: { companyId: ctx.companyId } });
      admissionNo = String(count + 1 + attempt).padStart(4, "0");
    }
    try {
      const row = await prisma.schoolStudent.create({
        data: {
          companyId: ctx.companyId, classId, admissionNo, rollNo, name, status,
          guardianName: str(b.guardianName) || null, phone: str(b.phone) || null,
          gender: str(b.gender).toUpperCase() || null, address: str(b.address) || null,
          dob, admissionDate: parseDay(b.admissionDate) ?? new Date(),
          discount: Math.max(0, num(b.discount)),
          ...extras.data,
        },
      });
      // One-off admission fee invoice, due on the day of admission.
      if (admissionFee > 0) {
        await prisma.schoolFeeInvoice.create({
          data: { companyId: ctx.companyId, studentId: row.id, period: "Admission", title: "Admission Fee", amount: admissionFee, dueDate: row.admissionDate },
        });
      }
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      if (str(b.admissionNo)) return bad("This admission number already exists", 409);
    }
  }
  return bad("Could not allocate an admission number, try again", 409);
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) { if (!str(b.name)) return bad("Name cannot be empty"); data.name = str(b.name); }
  if (b.classId !== undefined) {
    const classId = str(b.classId) || null;
    if (classId && !(await prisma.schoolClass.findFirst({ where: { id: classId, companyId: ctx.companyId }, select: { id: true } }))) return bad("Class not found", 404);
    data.classId = classId;
  }
  if (b.admissionNo !== undefined) {
    const no = str(b.admissionNo).slice(0, 20);
    if (!no) return bad("Admission number cannot be empty");
    const clash = await prisma.schoolStudent.findFirst({ where: { companyId: ctx.companyId, admissionNo: no, id: { not: id } }, select: { name: true } });
    if (clash) return bad(`Admission no. ${no} already belongs to ${clash.name}`, 409);
    data.admissionNo = no;
  }
  if (b.admissionDate !== undefined) { const d = parseDay(b.admissionDate); if (!d) return bad("Enter a valid admission date"); data.admissionDate = d; }
  if (b.phone !== undefined) {
    const ph = digits(str(b.phone));
    if (!ph) return bad("Guardian phone is required");
    if (ph.length < 10 || ph.length > 13) return bad("Enter a valid guardian phone number");
    data.phone = str(b.phone);
  }
  if (b.rollNo !== undefined) {
    const roll = str(b.rollNo).slice(0, 12) || null;
    const cur = await prisma.schoolStudent.findFirst({ where: { id, companyId: ctx.companyId }, select: { classId: true } });
    const cls = data.classId !== undefined ? (data.classId as string | null) : cur?.classId ?? null;
    if (roll && cls) { const who = await rollTaken(ctx.companyId, cls, roll, id); if (who) return bad(`Roll no. ${roll} is already taken in this class by ${who}`, 409); }
    data.rollNo = roll;
  }
  if (b.status !== undefined) {
    const s = str(b.status).toUpperCase();
    if (!STATUSES.includes(s)) return bad("Invalid status");
    data.status = s;
  }
  for (const k of ["guardianName", "address", "gender"] as const) if (b[k] !== undefined) data[k] = str(b[k]) || null;
  if (b.discount !== undefined) data.discount = Math.max(0, num(b.discount));
  if (b.dob !== undefined) data.dob = parseDay(b.dob);
  const extras = admissionExtras(b, true);
  if ("error" in extras) return bad(extras.error);
  Object.assign(data, extras.data);
  if (data.status === "ACTIVE") {
    // Re-activating (or confirming an applicant) takes a seat; saving an already-active student does not.
    const current = await prisma.schoolStudent.findFirst({ where: { id, companyId: ctx.companyId }, select: { status: true } });
    if (current && current.status !== "ACTIVE") { const limitError = await checkStudentLimit(ctx.companyId); if (limitError) return bad(limitError, 402); }
  }
  const res = await prisma.schoolStudent.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Student not found", 404);
  return NextResponse.json({ ok: true });
}
