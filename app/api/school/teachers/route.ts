import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bad, isResponse, num, parseDay, schoolGuard, str } from "@/lib/schoolApi";

const DOC_KEYS = ["CNIC", "DEGREES", "EXPERIENCE_LETTER", "PHOTOS", "APPOINTMENT_LETTER"];
const EMPLOYMENT = ["PERMANENT", "CONTRACT", "PART_TIME", "VISITING"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const digits = (v: string) => v.replace(/\D/g, "");
const opt = (v: unknown) => str(v) || null;

/** Validates the optional profile fields. `partial` = only touch fields that were sent (PATCH). */
function profileFields(b: Record<string, unknown>, partial: boolean): { error: string } | { data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  const has = (k: string) => !partial || b[k] !== undefined;
  for (const k of ["fatherName", "address", "city", "designation", "specialization", "previousInstitute", "emergencyContact"] as const) if (has(k)) data[k] = opt(b[k]);
  if (has("cnic")) { const v = digits(str(b.cnic)); if (v && v.length !== 13) return { error: "CNIC must be 13 digits" }; data.cnic = v || null; }
  if (has("emergencyPhone")) { const v = digits(str(b.emergencyPhone)); if (v && (v.length < 10 || v.length > 13)) return { error: "Enter a valid emergency phone" }; data.emergencyPhone = v || null; }
  if (has("gender")) { const v = str(b.gender).toUpperCase(); if (v && !["MALE", "FEMALE", "OTHER"].includes(v)) return { error: "Invalid gender" }; data.gender = v || null; }
  if (has("bloodGroup")) { const v = str(b.bloodGroup).toUpperCase(); if (v && !BLOOD.includes(v)) return { error: "Invalid blood group" }; data.bloodGroup = v || null; }
  if (has("employmentType")) { const v = str(b.employmentType).toUpperCase(); if (v && !EMPLOYMENT.includes(v)) return { error: "Invalid employment type" }; data.employmentType = v || null; }
  if (has("dob")) { const d = parseDay(b.dob); if (d && (d > new Date() || d.getUTCFullYear() < 1940)) return { error: "Check the date of birth" }; data.dob = d; }
  if (has("experienceYears")) { const v = b.experienceYears === "" || b.experienceYears == null ? null : num(b.experienceYears, -1); if (v !== null && (v < 0 || v > 60)) return { error: "Experience must be between 0 and 60 years" }; data.experienceYears = v; }
  if (has("monthlySalary")) { const v = b.monthlySalary === "" || b.monthlySalary == null ? null : num(b.monthlySalary, -1); if (v !== null && v < 0) return { error: "Salary cannot be negative" }; data.monthlySalary = v; }
  if (has("documents")) data.documents = [...new Set((Array.isArray(b.documents) ? b.documents.map(String) : []).filter((d) => DOC_KEYS.includes(d)))];
  return { data };
}

export async function GET(req: NextRequest) {
  const ctx = await schoolGuard(req, false, "SCHOOL_VIEW");
  if (isResponse(ctx)) return ctx;
  const status = str(new URL(req.url).searchParams.get("status")).toUpperCase();
  const rows = await prisma.schoolTeacher.findMany({
    where: { companyId: ctx.companyId, ...(status ? { status } : {}) },
    orderBy: { employeeNo: "asc" },
    include: { classSubjects: { select: { class: { select: { name: true, section: true } }, subject: { select: { name: true } } } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const name = str(b.name);
  if (!name) return bad("Teacher name is required");
  const phoneDigits = digits(str(b.phone));
  if (!phoneDigits) return bad("Phone number is required");
  if (phoneDigits.length < 10 || phoneDigits.length > 13) return bad("Enter a valid phone number");
  const extras = profileFields(b, false);
  if ("error" in extras) return bad(extras.error);
  let employeeNo = str(b.employeeNo);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!employeeNo || attempt > 0) {
      const n = await prisma.schoolTeacher.count({ where: { companyId: ctx.companyId } });
      employeeNo = `T-${String(n + 1 + attempt).padStart(3, "0")}`;
    }
    try {
      const row = await prisma.schoolTeacher.create({
        data: { companyId: ctx.companyId, employeeNo, name, phone: phoneDigits, email: str(b.email) || null, qualification: str(b.qualification) || null, joiningDate: parseDay(b.joiningDate) ?? new Date(), ...extras.data },
      });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      if (str(b.employeeNo)) return bad("This employee number already exists", 409);
    }
  }
  return bad("Could not allocate an employee number, try again", 409);
}

export async function PATCH(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_ACADEMICS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const id = str(b.id);
  if (!id) return bad("id is required");
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) { if (!str(b.name)) return bad("Name cannot be empty"); data.name = str(b.name); }
  if (b.status !== undefined) { const s = str(b.status).toUpperCase(); if (!["ACTIVE", "LEFT"].includes(s)) return bad("Invalid status"); data.status = s; }
  for (const k of ["phone", "email", "qualification"] as const) if (b[k] !== undefined) data[k] = str(b[k]) || null;
  const extras = profileFields(b, true);
  if ("error" in extras) return bad(extras.error);
  Object.assign(data, extras.data);
  if (b.joiningDate !== undefined) { const d = parseDay(b.joiningDate); if (d) data.joiningDate = d; }
  const res = await prisma.schoolTeacher.updateMany({ where: { id, companyId: ctx.companyId }, data });
  if (!res.count) return bad("Teacher not found", 404);
  return NextResponse.json({ ok: true });
}
