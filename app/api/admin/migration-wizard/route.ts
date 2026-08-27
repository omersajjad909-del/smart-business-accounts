import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson, clip } from "@/lib/ai/adminAI";
import { parseCsv, toCsv } from "@/lib/csvParse";
import { IMPORT_DATA_TYPES, IMPORT_SOURCES, findDataType } from "@/lib/importEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Migration Wizard — turn a customer's export into a file our importer accepts.
 *
 * The importer at /api/import is already good: it has a dry run, an alias table
 * covering the headings we have seen before, and readers that reject a bad row
 * rather than writing it. What it cannot do is read a heading nobody has met
 * yet — "A/C TITLE", "Party Nm", "Op Bal Dr", a Tally export whose first four
 * lines are a report banner. Every one of those is a migration that stops on
 * the phone with a founder squinting at a spreadsheet.
 *
 * The division of labour here is the whole design:
 *
 *   The model decides WHAT each column means. That is a language problem and it
 *   is genuinely good at it.
 *
 *   Code does the transform. Every cell in the output is copied verbatim from
 *   the input by `applyMapping` below. The model never sees a full file and
 *   never emits a data row, so it cannot alter an amount, invent a customer, or
 *   quietly drop a line — the three ways an AI import would corrupt a set of
 *   books.
 *
 * The result is a CSV in our own template shape, which then goes through the
 * existing dry run like any other file. Nothing here writes to the database.
 */

/** Rows the model sees. Enough to judge a column, nowhere near the whole file. */
const SAMPLE_ROWS = 12;

/** Refuse a paste larger than this rather than timing out mid-parse. */
const MAX_CSV_CHARS = 2_000_000;

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  return NextResponse.json({
    aiConfigured: aiConfigured(),
    dataTypes: IMPORT_DATA_TYPES.map((d) => ({
      id: d.id, name: d.name, icon: d.icon, desc: d.desc,
      template: d.template, required: d.required, order: d.order, why: d.why,
    })),
    sources: IMPORT_SOURCES.map((s) => ({ id: s.id, name: s.name, badge: s.badge, color: s.color })),
  });
}

type ColumnMapping = {
  sourceColumn: string;
  targetField: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

type Analysis = {
  dataType: string;
  dataTypeConfidence: "high" | "medium" | "low";
  detectedSystem: string;
  mappings: ColumnMapping[];
  problems: string[];
  notes: string;
};

const ANALYSE_SYSTEM = `
You read the first rows of a spreadsheet exported from an old accounting system
and work out what it is and what each column means, so it can be imported into
FinovaOS.

You will be given:
- the column headings
- a handful of sample rows
- the list of FinovaOS data types and the exact target fields each one accepts

Decide:
1. dataType — which FinovaOS data type this file is, by its id. If it is none of
   them, use "unknown".
2. dataTypeConfidence — high, medium or low.
3. detectedSystem — which system this looks like it came from (Tally, QuickBooks,
   Excel by hand, Oracle, Peachtree, Busy, Zoho, unknown). Say unknown rather
   than guessing.
4. mappings — one entry for EVERY heading in the file, in the order given:
     sourceColumn  the heading exactly as it appears, character for character
     targetField   the FinovaOS field it maps to, or null to drop the column
     confidence    high, medium or low
     reason        a few words on why. For a null, why it is being dropped.
5. problems — anything that will break the import: a debit and credit in one
   column, amounts with currency symbols, dates in an ambiguous format, a
   customer and supplier mixed in one file, a total row at the bottom, merged
   header rows. Be specific and quote the value you saw.
6. notes — two or three sentences to the person running the migration.

Hard rules:
- sourceColumn must be copied exactly from the headings given. Never invent,
  correct, or re-case a heading — the mapping is applied by exact match and a
  changed character silently drops that column.
- Never map two source columns to the same target field. Pick the better one
  and map the other to null with the reason.
- A column you are not sure about maps to null with low confidence, not to a
  plausible guess. A dropped column is a question the operator answers in ten
  seconds; a wrongly mapped one is a corrupted ledger nobody notices.
- Do not output any data rows. You are describing columns only.

Return one JSON object with those six keys.
`;

/**
 * Apply the mapping to every row, in code.
 *
 * The output has one column per target field the mapping names, in the order
 * the FinovaOS template declares, and every value is the source cell unchanged.
 */
function applyMapping(
  rows: Array<Record<string, string>>,
  mappings: ColumnMapping[],
  template: string[],
): { headers: string[]; data: string[][] } {
  const pairs = mappings.filter((m) => m.targetField);

  // Template order first so the file looks like our own template, then any
  // mapped field the template does not list, so nothing is lost.
  const targets = [
    ...template.filter((t) => pairs.some((p) => p.targetField === t)),
    ...pairs.map((p) => p.targetField!).filter((t) => !template.includes(t)),
  ].filter((t, i, arr) => arr.indexOf(t) === i);

  const sourceFor = new Map<string, string>();
  for (const p of pairs) {
    // First mapping wins if the model broke its own rule and mapped two
    // columns to one field; the duplicate is reported to the operator.
    if (p.targetField && !sourceFor.has(p.targetField)) sourceFor.set(p.targetField, p.sourceColumn);
  }

  const data = rows.map((row) =>
    targets.map((t) => {
      const src = sourceFor.get(t);
      return src ? (row[src] ?? "") : "";
    }),
  );

  return { headers: targets, data };
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      csv?: string;
      hintType?: string;
      hint?: string;
    };

    const raw = String(body.csv || "");
    if (!raw.trim()) return NextResponse.json({ error: "Paste a file first" }, { status: 400 });
    if (raw.length > MAX_CSV_CHARS) {
      return NextResponse.json({
        error: `That file is ${Math.round(raw.length / 1024)}KB. Split it, or send the first few thousand rows — the mapping only needs to see the shape.`,
      }, { status: 413 });
    }

    const parsed = parseCsv(raw);
    if (!parsed.headers.length || !parsed.rows.length) {
      return NextResponse.json({
        error: "Nothing table-shaped was found. If the export starts with report banner lines, delete them so the heading row is first.",
      }, { status: 400 });
    }

    const sample = parsed.rows.slice(0, SAMPLE_ROWS);
    const typeCatalogue = IMPORT_DATA_TYPES
      .map((d) => `  ${d.id} — ${d.name}: ${d.desc}\n    fields: ${d.template.join(", ")}\n    required: ${d.required.join(", ") || "(none)"}`)
      .join("\n");

    const analysis = await askJson<Analysis>(
      ANALYSE_SYSTEM,
      [
        `FinovaOS data types and their fields:`,
        typeCatalogue,
        ``,
        body.hintType ? `The operator says this file is: ${body.hintType}` : "",
        body.hint ? `The operator adds: ${String(body.hint).slice(0, 500)}` : "",
        ``,
        `Delimiter detected: ${JSON.stringify(parsed.delimiter)}`,
        `Total rows in file: ${parsed.rows.length}`,
        ``,
        `Column headings (${parsed.headers.length}):`,
        ...parsed.headers.map((h) => `  ${JSON.stringify(h)}`),
        ``,
        `First ${sample.length} rows:`,
        clip(
          sample.map((r, i) => `${i + 1}. ${parsed.headers.map((h) => `${h}=${JSON.stringify(r[h] ?? "")}`).join(" | ")}`).join("\n"),
          8000,
        ),
      ].filter(Boolean).join("\n"),
      3000,
    );

    if (!analysis || !Array.isArray(analysis.mappings)) {
      return NextResponse.json({ error: "The model did not return a usable mapping. Try again." }, { status: 502 });
    }

    // A heading the model renamed maps nothing, so those are caught and
    // reported rather than silently producing an empty column.
    const knownHeaders = new Set(parsed.headers);
    const badSource = analysis.mappings
      .filter((m) => !knownHeaders.has(m.sourceColumn))
      .map((m) => m.sourceColumn);
    const mappings = analysis.mappings.filter((m) => knownHeaders.has(m.sourceColumn));

    const missedHeaders = parsed.headers.filter((h) => !mappings.some((m) => m.sourceColumn === h));

    const def = findDataType(analysis.dataType);
    const template = def?.template ?? [];

    const duplicateTargets: string[] = [];
    const seenTargets = new Set<string>();
    for (const m of mappings) {
      if (!m.targetField) continue;
      if (seenTargets.has(m.targetField)) duplicateTargets.push(m.targetField);
      seenTargets.add(m.targetField);
    }

    const { headers, data } = applyMapping(parsed.rows, mappings, template);

    // Which required fields the mapping does not supply. This is the single most
    // useful thing on the page: it says up front that the import will reject
    // every row, instead of letting the dry run discover it later.
    const missingRequired = (def?.required ?? []).filter((r) => !headers.includes(r));

    const convertedCsv = headers.length ? toCsv(headers, data) : "";

    return NextResponse.json({
      analysis: { ...analysis, mappings },
      source: {
        headers: parsed.headers,
        rowCount: parsed.rows.length,
        delimiter: parsed.delimiter,
        sample: sample.map((r) => parsed.headers.map((h) => r[h] ?? "")),
      },
      converted: {
        headers,
        rowCount: data.length,
        preview: data.slice(0, SAMPLE_ROWS),
        csv: convertedCsv,
      },
      dataType: def ? { id: def.id, name: def.name, template: def.template, required: def.required, why: def.why } : null,
      warnings: {
        missingRequired,
        droppedColumns: mappings.filter((m) => !m.targetField).map((m) => m.sourceColumn),
        unmappedHeadings: missedHeaders,
        invalidSourceColumns: badSource,
        duplicateTargets: [...new Set(duplicateTargets)],
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[migration-wizard] POST failed:", err);
    return NextResponse.json({ error: "The file could not be analysed" }, { status: 500 });
  }
}
