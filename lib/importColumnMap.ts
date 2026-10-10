/**
 * Column suggestions for an import file whose headings we do not recognise.
 *
 * The importer reads columns by name — "Sale Price" is found because it is a
 * known alias of `rate`. A heading nobody has listed ("Rate/Unit", "MRP") is
 * silently ignored and the field comes out empty, which is the worst kind of
 * import error. This looks at the headings the importer did NOT recognise and
 * proposes which template field each probably is.
 *
 * Privacy: nothing leaves the server unless the caller asks for the model.
 * When it does, the model sees the data type, the allowed field names and, for
 * each unrecognised column only, the heading and at most three sample values cut
 * to 30 characters. Recognised columns and every other row stay here. The model
 * proposes names only — it never imports anything — and the person confirms each
 * suggestion before it is used.
 */

import { field, findDataType, type ImportDataType } from "@/lib/importEngine";
import { normalizeHeader, type CsvRow, type ParsedCsv } from "@/lib/csvParse";
import { groqRequest, HAS_GROQ } from "@/lib/groqKeyRotator";

export type ColumnSuggestion = {
  header: string;
  field: string | null;
  source: "rules" | "ai" | "none";
  samples: string[];
};

const SAMPLE_ROWS = 3;
const SAMPLE_LEN = 30;
const MODEL = "llama-3.3-70b-versatile";

/** Which template field, if any, this heading already resolves to. */
export function recognisedField(header: string, fields: string[]): string | null {
  const probe: CsvRow = { [header]: "x" };
  for (const f of fields) if (field(probe, f)) return f;
  return null;
}

/** Words a heading is made of, lower-cased, camelCase split. */
function words(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Cheap guesses that need no model: a template field's own words appear in the heading. */
function ruleGuess(header: string, fields: string[], taken: Set<string>): string | null {
  const h = new Set(words(header));
  const squashed = normalizeHeader(header);
  let best: { f: string; score: number } | null = null;
  for (const f of fields) {
    if (taken.has(f)) continue;
    const fw = words(f);
    const hit = fw.filter((w) => h.has(w) || (w.length > 3 && squashed.includes(w))).length;
    if (hit === 0) continue;
    const score = hit / fw.length;
    if (score === 1 && (!best || score > best.score)) best = { f, score };
  }
  return best ? best.f : null;
}

function samplesFor(parsed: ParsedCsv, header: string): string[] {
  const out: string[] = [];
  for (const row of parsed.rows) {
    const v = String(row[header] ?? "").trim();
    if (v) out.push(v.slice(0, SAMPLE_LEN));
    if (out.length >= SAMPLE_ROWS) break;
  }
  return out;
}

export async function suggestColumns(
  dataType: ImportDataType,
  parsed: ParsedCsv,
  useAI: boolean,
): Promise<{ suggestions: ColumnSuggestion[]; aiAvailable: boolean; aiUsed: boolean }> {
  const def = findDataType(dataType);
  const fields = def?.template ?? [];
  if (!def || fields.length === 0) return { suggestions: [], aiAvailable: HAS_GROQ, aiUsed: false };

  // Fields some heading already supplies are not offered again.
  const taken = new Set<string>();
  const unknown: string[] = [];
  for (const header of parsed.headers) {
    if (!header.trim()) continue;
    const f = recognisedField(header, fields);
    if (f) taken.add(f);
    else unknown.push(header);
  }

  const suggestions: ColumnSuggestion[] = unknown.map((header) => {
    const guess = ruleGuess(header, fields, taken);
    if (guess) taken.add(guess);
    return { header, field: guess, source: guess ? "rules" : "none", samples: samplesFor(parsed, header) };
  });

  let aiUsed = false;
  const open = suggestions.filter((s) => !s.field);
  if (useAI && HAS_GROQ && open.length > 0) {
    const free = fields.filter((f) => !taken.has(f));
    if (free.length > 0) {
      const payload = open.map((s) => ({ column: s.header, samples: s.samples }));
      const reply = await groqRequest(
        [
          {
            role: "system",
            content:
              "You match spreadsheet column headings to fields of an accounting import. " +
              "Reply with ONLY a JSON object mapping each column heading to one allowed field name, or null when none fits. " +
              "Use each field at most once. Never invent a field name.",
          },
          {
            role: "user",
            content:
              `Importing: ${def.name}\nAllowed fields: ${free.join(", ")}\nColumns:\n${JSON.stringify(payload)}`,
          },
        ],
        MODEL,
        400,
        0,
      ).catch(() => null);

      if (reply) {
        try {
          const json = JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
          aiUsed = true;
          for (const s of open) {
            const f = json[s.header];
            if (typeof f === "string" && free.includes(f) && !taken.has(f)) {
              s.field = f;
              s.source = "ai";
              taken.add(f);
            }
          }
        } catch { /* an unreadable reply just leaves the columns unmatched */ }
      }
    }
  }

  return { suggestions, aiAvailable: HAS_GROQ, aiUsed };
}

/**
 * Renames columns to the template field the person confirmed. Only fields the
 * data type actually has are accepted, so a hand-made request cannot rename a
 * column to something the readers treat specially.
 */
export function applyColumnMap(
  parsed: ParsedCsv,
  dataType: string,
  map: Record<string, string> | undefined,
): ParsedCsv {
  if (!map || Object.keys(map).length === 0) return parsed;
  const allowed = new Set(findDataType(dataType)?.template ?? []);
  const rename = new Map<string, string>();
  const usedTargets = new Set<string>();
  for (const [header, target] of Object.entries(map)) {
    if (!allowed.has(target) || usedTargets.has(target)) continue;
    if (!parsed.headers.includes(header)) continue;
    rename.set(header, target);
    usedTargets.add(target);
  }
  if (rename.size === 0) return parsed;

  const headers = parsed.headers.map((h) => rename.get(h) ?? h);
  const rows = parsed.rows.map((row) => {
    const next: CsvRow = {};
    for (const [k, v] of Object.entries(row)) next[rename.get(k) ?? k] = v;
    return next;
  });
  return { ...parsed, headers, rows };
}
