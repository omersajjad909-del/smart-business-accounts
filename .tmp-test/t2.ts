import fs from "node:fs";
import { flattenLedgerExport } from "@/lib/reportFlatten";
import { parseCsv } from "@/lib/csvParse";
import { mapRows, readLedgerHistoryRow } from "@/lib/importEngine";

const raw = fs.readFileSync(".tmp-test/sample.txt", "utf8");
const flat = flattenLedgerExport(raw);
console.log("converted:", flat.converted);
console.log("note:", flat.note);
console.log("---- flattened csv ----");
console.log(flat.text);

const m = mapRows(parseCsv(flat.text).rows, (r, line) => readLedgerHistoryRow(r, line));
console.log("---- mapped ---- ok", m.ok, "failed", m.failed, "warn", m.warnings);
let bal = 0;
for (const r of m.rows) {
  const v = r.value;
  if (!r.error) bal += v.debit - v.credit;
  console.log(
    r.line, v.partyCode, v.voucherNo, v.voucherType,
    v.date?.toISOString().slice(0, 10), JSON.stringify(v.narration),
    "dr", v.debit, "cr", v.credit, "bal", v.balanceAfter,
    v.isOpening ? "[OPENING]" : "", r.error ?? "", r.warning ?? "",
  );
}
const f = m.rows[0].value;
const derivedOpening = (f.balanceAfter ?? 0) - (f.debit - f.credit);
console.log("derived opening:", derivedOpening, "| running total after all rows:", derivedOpening + bal);
