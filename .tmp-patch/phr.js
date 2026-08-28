const fs=require("fs");

/* ── 1. metaFromItem: focusOnPick sirf tab clear kare jab item ko pata hi na ho ── */
let p="lib/rateFormula.ts";
let s=fs.readFileSync(p,"utf8");
let a = `  const known = itemMetaWithName(settings, itemMeta, itemText);
  const out: Record<string, RateFormulaValue> = {};
  for (const f of settings.fields) {
    // The typed-per-document column is cleared rather than filled, so the
    // cursor that lands there lands on an empty box.
    if (f.focusOnPick) { out[f.key] = ""; continue; }
    const value = known[f.key];
    out[f.key] = value === "" ? (currentMeta?.[f.key] ?? "") : value;
  }
  return out;`;
if(!s.includes(a)) throw new Error("metaFromItem");
s = s.replace(a, `  const known = itemMetaWithName(settings, itemMeta, itemText);
  const out: Record<string, RateFormulaValue> = {};
  for (const f of settings.fields) {
    const value = known[f.key];
    const itemKnows = value !== "" && value !== undefined;
    // The typed-per-document column is cleared rather than filled, so the
    // cursor that lands there lands on an empty box — but only when the item
    // genuinely has nothing to say. An item whose name already carries "PHR24"
    // knows its own PHR, and asking the operator to type it back in is the
    // opposite of what that column is for.
    if (f.focusOnPick && !itemKnows) { out[f.key] = ""; continue; }
    out[f.key] = itemKnows ? value : (currentMeta?.[f.key] ?? "");
  }
  return out;`);
fs.writeFileSync(p,s);

/* ── 2. Enter: nominated column already bhara ho to aage barh jao ── */
p="components/RateFormulaCells.tsx";
s=fs.readFileSync(p,"utf8");
a = `export function rateFormulaEnterHandler(
  settings: RateFormulaSettings,
  active: boolean,
  rowIndex: number
) {
  return (e: KeyboardEvent | { key: string; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }) => {
    if (!active || e.key !== "Enter" || e.shiftKey) return;
    const key = settings.fields.find((f) => f.focusOnPick)?.key;
    if (!key) return; // no column claims the cursor — leave Enter alone
    e.preventDefault();
    e.stopPropagation();
    focusRateFormulaCell(rowIndex, key);
  };
}`;
if(!s.includes(a)) throw new Error("enter handler");
s = s.replace(a, `export function rateFormulaEnterHandler(
  settings: RateFormulaSettings,
  active: boolean,
  rowIndex: number,
  /**
   * The values the line is about to carry. Read through a function because the
   * picker calls this straight after its own onChange, before React has
   * committed the new row — the caller keeps the freshly resolved values in a
   * ref and hands them over here.
   */
  pickedMeta?: () => RateFormulaMeta | null | undefined
) {
  return (e: KeyboardEvent | { key: string; shiftKey: boolean; preventDefault(): void; stopPropagation(): void }) => {
    if (!active || e.key !== "Enter" || e.shiftKey) return;
    const key = settings.fields.find((f) => f.focusOnPick)?.key;
    if (!key) return; // no column claims the cursor — leave Enter alone
    // The item just picked may have answered that column itself. Parking the
    // cursor on a filled box makes the operator tab past a number they never
    // needed to touch, so let Enter walk on to the next thing that is blank.
    const already = pickedMeta?.()?.[key];
    if (already !== undefined && already !== "") return;
    e.preventDefault();
    e.stopPropagation();
    focusRateFormulaCell(rowIndex, key);
  };
}`);
fs.writeFileSync(p,s);
console.log("ok");
