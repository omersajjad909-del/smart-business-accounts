import fs from "node:fs";
import { flattenHeaderPrefixExport, flattenRepeatedReportExport, flattenLedgerExport } from "@/lib/reportFlatten";
import { parseCsv } from "@/lib/csvParse";
import { mapRows, readItemRow, readOpeningStockRow } from "@/lib/importEngine";

const raw = fs.readFileSync(".tmp-test/stock.txt", "utf8");
console.log("ledger flattener claims it? ", flattenLedgerExport(raw).converted);
console.log("trial-balance flattener claims it? ", flattenRepeatedReportExport(raw).converted);
const flat = flattenHeaderPrefixExport(raw);
console.log("prefix flattener:", flat.converted, "|", flat.note);
console.log(flat.text.split("\n").slice(0, 4).join("\n"));

const rows = parseCsv(flat.text).rows;
console.log("\n--- items (step 4) ---");
for (const r of mapRows(rows, (x) => readItemRow(x)).rows) {
  console.log(`${r.value.code.padEnd(5)} ${r.value.unit.padEnd(6)} ${r.value.purchaseRate.toFixed(2).padStart(9)}  ${r.value.name}`);
}
console.log("\n--- opening stock (step 6) ---");
for (const r of mapRows(rows, (x) => readOpeningStockRow(x)).rows) {
  console.log(r.line, r.value.code, "qty", r.value.qty, "rate", r.value.rate.toFixed(2), "|", r.error ?? r.warning ?? "ok");
}
