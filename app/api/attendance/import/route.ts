import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { resolveCompanyId } from "@/lib/tenant";
import { parseDeviceTime } from "@/lib/biometric";
import { processPunches } from "@/lib/attendanceProcessing";

/**
 * Upload the log a vendor tool exported (ZKTime, iVMS, eSSL eTimeTrack…).
 *
 * The escape hatch for machines with no network path to us at all: someone
 * exports a file at month end and drops it here. Same dedupe as live ingest,
 * so re-uploading an overlapping export is harmless.
 */

const MAX_ROWS = 20_000;

/** Column names these exports actually use, lower-cased and stripped. */
const ENROLL_KEYS = ["userid", "user", "empid", "employeeid", "enrollno", "enrollmentno", "acno", "id", "pin"];
const DATETIME_KEYS = ["datetime", "date/time", "punchtime", "recordtime", "checktime", "time", "timestamp"];
const DATE_KEYS = ["date", "punchdate"];
const TIME_KEYS = ["time", "punchtime", "clock"];
const STATE_KEYS = ["state", "status", "inout", "direction", "checktype"];

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_."']/g, "");
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function detectDelimiter(line: string): string {
  const counts: Record<string, number> = {
    "\t": (line.match(/\t/g) || []).length,
    ",": (line.match(/,/g) || []).length,
    ";": (line.match(/;/g) || []).length,
  };
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : /\s{2,}/.test(line) ? "\t" : ",";
}

function indexOfAny(headers: string[], keys: string[]): number {
  for (const key of keys) {
    const i = headers.indexOf(key);
    if (i >= 0) return i;
  }
  return -1;
}

/** ZKTeco writes 0/4 for in and 1/5 for out; anything else we leave to the rules. */
function directionFrom(state: string | undefined): string {
  const v = String(state ?? "").trim().toUpperCase();
  if (v === "IN" || v === "0" || v === "4") return "IN";
  if (v === "OUT" || v === "1" || v === "5") return "OUT";
  return "AUTO";
}

type Parsed = { biometricId: string; time: string; direction: string; raw: string };

function parseLog(text: string): { rows: Parsed[]; malformed: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], malformed: 0 };

  const delimiter = detectDelimiter(lines[0]);
  const firstCells = splitLine(lines[0], delimiter).map(norm);

  // A header row is one where a cell names an enrollment column and no cell
  // looks like a timestamp.
  const hasHeader =
    indexOfAny(firstCells, ENROLL_KEYS) >= 0 && !lines[0].match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);

  let iEnroll = 0;
  let iDateTime = 1;
  let iDate = -1;
  let iTime = -1;
  let iState = -1;

  if (hasHeader) {
    iEnroll = indexOfAny(firstCells, ENROLL_KEYS);
    iDateTime = indexOfAny(firstCells, DATETIME_KEYS);
    iDate = indexOfAny(firstCells, DATE_KEYS);
    iTime = indexOfAny(firstCells, TIME_KEYS);
    iState = indexOfAny(firstCells, STATE_KEYS);
    // "Date" + "Time" as separate columns beats a single column named "Time".
    if (iDate >= 0 && iTime >= 0 && iTime !== iDateTime) iDateTime = -1;
  }

  const rows: Parsed[] = [];
  let malformed = 0;

  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = splitLine(line, delimiter);
    const biometricId = String(cells[iEnroll] ?? "").trim();

    let time = "";
    if (iDateTime >= 0 && cells[iDateTime]) {
      time = cells[iDateTime];
    } else if (iDate >= 0 && iTime >= 0) {
      time = `${cells[iDate] ?? ""} ${cells[iTime] ?? ""}`.trim();
    } else {
      time = String(cells[1] ?? "").trim();
    }

    // Normalise dd-mm-yyyy and dd/mm/yyyy — the formats the local tools emit.
    const dmy = time.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
    if (dmy) time = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}${dmy[4]}`;
    time = time.replace(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+/, (_m, d) => `${String(d).replace(/\//g, "-")} `);

    if (!biometricId || !time || !/\d{4}-\d{1,2}-\d{1,2}/.test(time)) {
      malformed += 1;
      continue;
    }

    rows.push({
      biometricId,
      time,
      direction: directionFrom(iState >= 0 ? cells[iState] : undefined),
      raw: line.slice(0, 500),
    });
    if (rows.length >= MAX_ROWS) break;
  }

  return { rows, malformed };
}

export async function POST(req: NextRequest) {
  const guard = requireRole(req, ["ADMIN", "ACCOUNTANT"]);
  if (guard) return guard;

  try {
    const companyId = await resolveCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json();
    const deviceId = String(body?.deviceId || "");
    const text = String(body?.content || "");

    if (!deviceId) return NextResponse.json({ error: "Pick a device to import against" }, { status: 400 });
    if (!text.trim()) return NextResponse.json({ error: "File is empty" }, { status: 400 });

    const device = await prisma.biometricDevice.findFirst({
      where: { id: deviceId, companyId },
      select: { id: true, tzOffsetMin: true },
    });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const { rows, malformed } = parseLog(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No punches found — expected columns for enrollment number and date/time" },
        { status: 400 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: { companyId, biometricId: { in: Array.from(new Set(rows.map((r) => r.biometricId))) } },
      select: { id: true, biometricId: true },
    });
    const empByEnrollment = new Map(employees.map((e) => [e.biometricId!, e.id]));

    const data = [];
    let unparsedTime = 0;
    let min: Date | null = null;
    let max: Date | null = null;

    for (const r of rows) {
      const punchTime = parseDeviceTime(r.time, device.tzOffsetMin);
      if (!punchTime) {
        unparsedTime += 1;
        continue;
      }
      if (!min || punchTime < min) min = punchTime;
      if (!max || punchTime > max) max = punchTime;

      data.push({
        companyId,
        deviceId: device.id,
        biometricId: r.biometricId,
        employeeId: empByEnrollment.get(r.biometricId) ?? null,
        punchTime,
        direction: r.direction,
        source: "IMPORT",
        raw: r.raw,
      });
    }

    const inserted = data.length
      ? (await prisma.attendancePunch.createMany({ data, skipDuplicates: true })).count
      : 0;

    let processed = null;
    if (inserted > 0 && min && max) {
      processed = await processPunches(companyId, {
        from: new Date(min.getTime() - 12 * 3_600_000),
        to: new Date(max.getTime() + 12 * 3_600_000),
        onlyUnprocessed: false,
      });
    }

    return NextResponse.json({
      parsed: rows.length,
      inserted,
      duplicates: data.length - inserted,
      malformed: malformed + unparsedTime,
      unmapped: data.filter((d) => !d.employeeId).length,
      processed,
    });
  } catch (error) {
    console.error("Error importing attendance log:", error);
    return NextResponse.json({ error: "Failed to import log" }, { status: 500 });
  }
}
