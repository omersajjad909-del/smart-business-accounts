import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const STATUSES = ["APPLICANT", "ACTIVE", "LEFT", "GRADUATED"];
const DOC_KEYS = ["BFORM", "PREV_RESULT", "LEAVING_CERT", "PHOTOS", "GUARDIAN_CNIC", "VACCINATION"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const digits = (v: string) => v.replace(/\D/g, "");
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
  const ctx = await schoolGuard(req, false);
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
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { admissionNo: { contains: q, mode: "insensitive" } }, { guardianName: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { admissionNo: "asc" },
    take: 2000,
    include: { class: { select: { name: true, section: true } } },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true);
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
          companyId: ctx.companyId, classId, admissionNo, name, status,
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
  const ctx = await schoolGuard(req, true);
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
  if (b.status !== undefined) {
    const s = str(b.status).toUpperCase();
    if (!STATUSES.includes(s)) return bad("Invalid status");
    data.status = s;
  }
  for (const k of ["guardianName", "phone", "address", "gender"] as const) if (b[k] !== undefined) data[k] = str(b[k]) || null;
  if (b.discount !== undefined) data.discount = Math.max(0, num(b.discount));
  if (b.dob !== undefined) data.dob = parseDay(b.dob);
  const extras = admissionExtras(b, true);
  if ("error" in extras) return bad(extras.error);
  Object.assign(data, extras.data);
  const res = await prisma.schoolStudent.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Student not found", 404);
  return NextResponse.json({ ok: true });
}
