import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { parseCsv } from "@/lib/csvParse";
import { findDataType } from "@/lib/importEngine";
import { suggestColumns } from "@/lib/importColumnMap";
import { consumeTrialQuota } from "@/lib/trialLimits";

export const runtime = "nodejs";

/**
 * POST /api/import/suggest-columns { csv, dataType, useAI }
 *
 * Lists the columns the importer would not recognise and proposes a field for
 * each. Rules run first and cost nothing; the model is only asked when the
 * caller sets useAI, and then sees headings plus three short sample values for
 * the unrecognised columns alone (see lib/importColumnMap.ts). Writes nothing.
 */
const MAX_CSV_CHARS = 60_000;

export async function POST(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const dataType = String(body?.dataType || "");
  if (!findDataType(dataType)) return NextResponse.json({ error: "Unknown data type" }, { status: 400 });

  // Only the top of the file: headings and a few rows are all this looks at.
  const parsed = parseCsv(String(body?.csv || "").slice(0, MAX_CSV_CHARS));
  if (parsed.headers.length === 0) return NextResponse.json({ suggestions: [], aiAvailable: false, aiUsed: false });

  const useAI = body?.useAI === true;
  if (useAI) {
    const quota = await consumeTrialQuota(companyId, "AI");
    if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 402 });
  }

  const out = await suggestColumns(dataType as any, parsed, useAI);
  return NextResponse.json({ ...out, fields: findDataType(dataType)!.template });
}
