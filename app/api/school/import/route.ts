import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStudentLimit } from "@/lib/schoolLimits";
import { bad, isResponse, schoolGuard, str } from "@/lib/schoolApi";

const MAX_ROWS = 2000;
const digits = (v: string) => v.replace(/\D/g, "");

/** Accepts 2026-11-18, 18/11/2026 and 18-11-2026. Returns null if it is not a real date. */
function parseDate(v: string): Date | null {
  const s = v.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s))) { d = +r[1]; m = +r[2]; y = +r[3]; }
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

type InRow = Record<string, unknown>;
type Checked = { line: number; errors: string[]; warnings: string[]; data?: Record<string, unknown>; classKey?: string; active: boolean; name: string };

/**
 * POST { rows: [...], dryRun: boolean, createClasses?: boolean, skipInvalid?: boolean }
 * dryRun validates and reports; otherwise valid rows are inserted. Nothing is written
 * unless every row is valid or skipInvalid is set.
 */
export async function POST(req: NextRequest) {
  const ctx = await schoolGuard(req, true, "SCHOOL_STUDENTS_MANAGE");
  if (isResponse(ctx)) return ctx;
  const b = await req.json().catch(() => ({}));
  const rows: InRow[] = Array.isArray(b.rows) ? b.rows : [];
  if (rows.length === 0) return bad("The file has no rows");
  if (rows.length > MAX_ROWS) return bad(`Import up to ${MAX_ROWS} students at a time — split the file`);
  const dryRun = b.dryRun !== false;

  const [classes, existing] = await Promise.all([
    prisma.schoolClass.findMany({ where: { companyId: ctx.companyId }, select: { id: true, name: true, section: true } }),
    prisma.schoolStudent.findMany({ where: { companyId: ctx.companyId }, select: { admissionNo: true } }),
  ]);
  const classByKey = new Map(classes.map((c) => [`${c.name.toLowerCase()}|${c.section.toLowerCase()}`, c.id]));
  const taken = new Set(existing.map((e) => e.admissionNo));
  let nextNo = existing.reduce((m, e) => Math.max(m, parseInt(e.admissionNo.replace(/\D/g, ""), 10) || 0), 0);
  const seenInFile = new Set<string>();

  const checked: Checked[] = rows.map((raw, i) => {
    const g = (k: string) => str(raw[k]);
    const errors: string[] = [], warnings: string[] = [];
    const name = g("name");
    if (!name) errors.push("Name is missing");
    const guardianName = g("guardian_name"), phone = digits(g("guardian_phone"));
    if (!guardianName) errors.push("Guardian name is missing");
    if (!phone) errors.push("Guardian phone is missing");
    else if (phone.length < 10 || phone.length > 13) errors.push("Guardian phone must be 10–13 digits");

    const className = g("class"), section = g("section");
    const classKey = className ? `${className.toLowerCase()}|${section.toLowerCase()}` : "";
    if (!className) errors.push("Class is missing");
    else if (!classByKey.has(classKey)) warnings.push(`Class "${className}${section ? ` - ${section}` : ""}" does not exist yet`);

    const dobRaw = g("dob"); const dob = parseDate(dobRaw);
    if (dobRaw && !dob) errors.push("Date of birth is not a valid date (use 2012-05-21 or 21/05/2012)");
    if (dob && (dob > new Date() || dob.getUTCFullYear() < 1990)) errors.push("Date of birth looks wrong");
    const admRaw = g("admission_date"); const admissionDate = parseDate(admRaw);
    if (admRaw && !admissionDate) errors.push("Admission date is not a valid date");

    const bForm = digits(g("b_form")); if (bForm && bForm.length !== 13) errors.push("B-Form must be 13 digits");
    const cnic = digits(g("guardian_cnic")); if (cnic && cnic.length !== 13) errors.push("Guardian CNIC must be 13 digits");
    const gender = g("gender").toUpperCase(); if (gender && !["MALE", "FEMALE", "OTHER"].includes(gender)) errors.push("Gender must be Male, Female or Other");
    const relation = (g("guardian_relation") || "FATHER").toUpperCase(); if (!["FATHER", "MOTHER", "OTHER"].includes(relation)) errors.push("Guardian relation must be Father, Mother or Other");
    const discount = g("discount") ? Number(g("discount")) : 0; if (!Number.isFinite(discount) || discount < 0) errors.push("Discount must be a number");

    let admissionNo = g("admission_no");
    if (admissionNo) {
      if (taken.has(admissionNo)) errors.push(`Admission no. ${admissionNo} already exists`);
      else if (seenInFile.has(admissionNo)) errors.push(`Admission no. ${admissionNo} appears twice in this file`);
    } else { do { nextNo++; admissionNo = String(nextNo).padStart(4, "0"); } while (taken.has(admissionNo) || seenInFile.has(admissionNo)); warnings.push(`Admission no. ${admissionNo} will be assigned`); }
    seenInFile.add(admissionNo);

    const status = (g("status") || "ACTIVE").toUpperCase();
    if (!["ACTIVE", "APPLICANT", "LEFT", "GRADUATED"].includes(status)) errors.push("Status must be Active, Applicant, Left or Graduated");

    return {
      line: i + 2, errors, warnings, classKey, active: status === "ACTIVE", name,
      data: errors.length ? undefined : {
        companyId: ctx.companyId, admissionNo, name, gender: gender || null, dob, bFormNo: bForm || null, religion: g("religion") || null,
        guardianName, guardianRelation: relation, guardianCnic: cnic || null, phone, motherName: g("mother_name") || null,
        address: g("address") || null, city: g("city") || null, previousSchool: g("previous_school") || null,
        admissionDate: admissionDate ?? new Date(), discount, status, documents: [] as string[],
      },
    };
  });

  const valid = checked.filter((c) => c.data);
  const invalid = checked.filter((c) => !c.data);
  const missingClasses = [...new Set(valid.filter((c) => c.classKey && !classByKey.has(c.classKey)).map((c) => c.classKey!))];
  const newSeats = valid.filter((c) => c.active).length;
  const limitError = newSeats > 0 ? await checkStudentLimit(ctx.companyId, newSeats) : null;

  const summary = { total: checked.length, valid: valid.length, invalid: invalid.length, missingClasses: missingClasses.map((k) => k.split("|")), seatsNeeded: newSeats, limitError };
  const report = checked.map((c) => ({ line: c.line, name: c.name, errors: c.errors, warnings: c.warnings }));
  if (dryRun) return NextResponse.json({ summary, report });

  // ── Commit ──
  if (limitError) return bad(limitError, 402);
  if (invalid.length && b.skipInvalid !== true) return bad("Fix the rows with errors first, or choose to skip them", 422);
  if (missingClasses.length && b.createClasses !== true) return bad("Some classes do not exist — allow creating them, or add them first", 422);

  for (const key of missingClasses) {
    const sample = valid.find((c) => c.classKey === key)!;
    const [name, section] = [str(rows[sample.line - 2].class), str(rows[sample.line - 2].section)];
    const row = await prisma.schoolClass.upsert({ where: { companyId_name_section: { companyId: ctx.companyId, name, section } }, create: { companyId: ctx.companyId, name, section }, update: {} });
    classByKey.set(key, row.id);
  }
  const data = valid.map((c) => ({ ...(c.data as Record<string, unknown>), classId: classByKey.get(c.classKey!) ?? null }));
  const res = await prisma.schoolStudent.createMany({ data: data as never, skipDuplicates: true });
  return NextResponse.json({ imported: res.count, skipped: invalid.length, classesCreated: missingClasses.length });
}
