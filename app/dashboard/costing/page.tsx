"use client";
// FILE: app/dashboard/costing/page.tsx
//
// Run a saved formula: pick it, fill the inputs, read the cost. The working is
// shown alongside the answer — a number nobody can check is a number nobody
// will trust on a quotation.
//
// A result can be saved as a sheet. The sheet stores the formula version and
// the inputs used, so a quote given last month still shows the cost it was
// quoted at even after the formula moves on.
//
// A result can also be turned into a BOM. The formula works out how many
// pieces come off one roll and what the conversion costs; the BOM is what the
// factory actually produces against. Copying those two numbers across by hand
// was the one manual join in the whole chain, and the place a typo turned a
// correct quote into a wrong batch cost.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";
import {
  runFormula,
  type CostingFormula,
  type FormulaInput,
  type FormulaStep,
  type FormulaOutput,
} from "@/lib/formulaEngine";

const CARD = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.09)";
const FONT = "'Outfit','DM Sans',system-ui,sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
  color: "white", fontSize: 13.5, outline: "none", fontFamily: MONO,
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "rgba(255,255,255,.45)", marginBottom: 5, fontFamily: FONT,
};
const btn = (primary = false): React.CSSProperties => ({
  padding: "10px 18px", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
  cursor: "pointer", fontFamily: FONT,
  background: primary ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "rgba(255,255,255,.05)",
  border: primary ? "none" : `1px solid ${BORDER}`,
  color: primary ? "white" : "rgba(255,255,255,.7)",
});

/** Inventory the BOM builder can point at — the same rows purchasing uses. */
type StockItem = { id: string; name: string; unit: string; unitCost: number };

async function loadItems(category: "RAW_MATERIAL" | "FINISHED"): Promise<StockItem[]> {
  try {
    const res = await fetch(`/api/manufacturing/items?category=${category}`, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as StockItem[];
  } catch {
    return [];
  }
}

function toFormula(record: BusinessRecord): CostingFormula {
  const d = (record.data ?? {}) as Record<string, unknown>;
  return {
    name: record.title,
    category: String(d.category || "General"),
    description: String(d.description || ""),
    version: Number(d.version || 1),
    inputs: Array.isArray(d.inputs) ? (d.inputs as FormulaInput[]) : [],
    steps: Array.isArray(d.steps) ? (d.steps as FormulaStep[]) : [],
    outputs: Array.isArray(d.outputs) ? (d.outputs as FormulaOutput[]) : [],
  };
}

function fmt(v: unknown, decimals = 2): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return Math.abs(v % 1) < 1e-9
    ? v.toLocaleString()
    : v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function CostingInner() {
  const params = useSearchParams();
  const formulaStore = useBusinessRecords("costing_formula");
  const sheetStore = useBusinessRecords("costing_sheet");

  const [selectedId, setSelectedId] = useState("");
  const [values, setValues] = useState<Record<string, number | number[]>>({});
  const [sheetName, setSheetName] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [showWorking, setShowWorking] = useState(true);

  /* ── BOM builder ── */
  const bomStore = useBusinessRecords("bom");
  const [rawItems, setRawItems] = useState<StockItem[]>([]);
  const [finishedItems, setFinishedItems] = useState<StockItem[]>([]);
  const [bomOpen, setBomOpen] = useState(false);
  const [bomSaving, setBomSaving] = useState(false);
  const [bomError, setBomError] = useState("");
  const [bomDone, setBomDone] = useState("");
  const [bomForm, setBomForm] = useState({
    finishedItemId: "", materialItemId: "", materialQty: 1,
    version: "v1.0", yieldUnits: 1, labourPerBatch: 0, overheadPerBatch: 0,
    divisible: true,
  });

  useEffect(() => {
    loadItems("RAW_MATERIAL").then(setRawItems);
    loadItems("FINISHED").then(setFinishedItems);
  }, []);

  const formulas = useMemo(
    () => formulaStore.records.map((r) => ({ id: r.id, formula: toFormula(r) })),
    [formulaStore.records],
  );

  // Deep-linked from the Formulas page "Run" button.
  useEffect(() => {
    const wanted = params.get("formula");
    if (wanted && formulas.some((f) => f.id === wanted)) setSelectedId(wanted);
    else if (!selectedId && formulas.length) setSelectedId(formulas[0].id);
  }, [params, formulas, selectedId]);

  const selected = formulas.find((f) => f.id === selectedId) ?? null;

  // Reset the entered values whenever the chosen formula changes.
  useEffect(() => {
    if (!selected) return;
    const next: Record<string, number | number[]> = {};
    for (const inp of selected.formula.inputs) {
      next[inp.key] = inp.isList ? (inp.listValue ?? []) : (inp.defaultValue ?? 0);
    }
    setValues(next);
    setSheetName(selected.formula.name);
    setSavedNote("");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = useMemo(
    () => (selected ? runFormula(selected.formula, values) : null),
    [selected, values],
  );

  const askedInputs = selected?.formula.inputs.filter((i) => i.askOnRun !== false) ?? [];
  const fixedInputs = selected?.formula.inputs.filter((i) => i.askOnRun === false) ?? [];
  const outputs = selected?.formula.outputs.filter((o) => o.key) ?? [];
  const primary = outputs.find((o) => o.primary) ?? outputs[0];

  async function saveSheet() {
    if (!selected || !run) return;
    const resultSnapshot: Record<string, unknown> = {};
    for (const o of outputs) resultSnapshot[o.key] = run.values[o.key] ?? null;

    await sheetStore.create({
      title: sheetName.trim() || selected.formula.name,
      status: "saved",
      refId: selected.id,
      amount: typeof run.values[primary?.key ?? ""] === "number"
        ? (run.values[primary.key] as number)
        : undefined,
      date: new Date().toISOString(),
      data: {
        formulaId: selected.id,
        formulaName: selected.formula.name,
        // Stamped, not referenced: the formula can change later without
        // rewriting what this sheet quoted.
        formulaVersion: selected.formula.version,
        inputs: values,
        outputs: outputs.map((o) => ({ key: o.key, label: o.label, unit: o.unit, role: o.role })),
        results: resultSnapshot,
      },
    });
    setSavedNote(`Saved "${sheetName.trim() || selected.formula.name}"`);
    setTimeout(() => setSavedNote(""), 3500);
  }

  const recentSheets = sheetStore.records.slice(0, 6);

  /** The numbers the BOM needs, read off the outputs by their role. */
  const bomSeed = useMemo(() => {
    if (!selected || !run?.ok) return null;
    const valueFor = (role: string) => {
      const output = selected.formula.outputs.find((o) => o.role === role);
      const value = output ? run.values[output.key] : undefined;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    };
    const unitsPerBatch = valueFor("units_per_batch");
    const costPerBatch = valueFor("cost_per_batch");
    const costPerUnit = valueFor("cost_per_unit");
    // Whatever the formula charges beyond the material is the conversion cost —
    // labour, machine time — and that is what the BOM carries per batch.
    const conversion =
      unitsPerBatch != null && costPerBatch != null && costPerUnit != null
        ? Math.max(0, Math.round((costPerUnit * unitsPerBatch - costPerBatch) * 100) / 100)
        : null;
    return { unitsPerBatch, costPerBatch, costPerUnit, conversion };
  }, [selected, run]);

  function openBomBuilder() {
    setBomError("");
    setBomDone("");
    setBomForm((current) => ({
      ...current,
      yieldUnits: bomSeed?.unitsPerBatch ? Math.max(1, Math.round(bomSeed.unitsPerBatch)) : 1,
      labourPerBatch: bomSeed?.conversion ?? 0,
      version: `v${selected?.formula.version ?? 1}.0`,
    }));
    setBomOpen(true);
  }

  /**
   * Writes the BOM the factory produces against.
   *
   * Deliberately the same record shape Manufacturing → BOM writes, so a BOM
   * born here is not a second kind of BOM: it opens, edits and produces
   * exactly like a hand-made one. What it carries extra is where it came
   * from, so a wrong batch cost can be traced back to the formula run.
   */
  async function createBom() {
    const finished = finishedItems.find((i) => i.id === bomForm.finishedItemId);
    const material = rawItems.find((i) => i.id === bomForm.materialItemId);
    if (!finished) { setBomError("Pick the finished product this makes."); return; }
    if (!material) { setBomError("Pick the raw material it is made from."); return; }
    if (bomForm.materialQty <= 0) { setBomError("Material quantity must be greater than zero."); return; }
    if (bomForm.yieldUnits <= 0) { setBomError("Units per batch must be greater than zero."); return; }

    // Costed from what the material actually costs in stock, not from the rate
    // typed into the formula — the quote is an estimate, the BOM is the book.
    const batchCost =
      bomForm.materialQty * material.unitCost +
      (Number(bomForm.labourPerBatch) || 0) +
      (Number(bomForm.overheadPerBatch) || 0);

    setBomError("");
    setBomSaving(true);
    try {
      await bomStore.create({
        title: finished.name,
        status: "active",
        amount: batchCost / bomForm.yieldUnits,
        data: {
          version: bomForm.version.trim() || "v1.0",
          yield: bomForm.yieldUnits,
          finishedItemId: finished.id,
          lines: [{ itemId: material.id, qty: bomForm.materialQty, divisible: bomForm.divisible }],
          labourPerBatch: Number(bomForm.labourPerBatch) || 0,
          overheadPerBatch: Number(bomForm.overheadPerBatch) || 0,
          materials: material.name,
          // Traceability back to the run that produced these numbers.
          formulaId: selected?.id ?? null,
          formulaName: selected?.formula.name ?? null,
          formulaVersion: selected?.formula.version ?? null,
        },
      });
      setBomDone(`BOM created for ${finished.name} — ${bomForm.yieldUnits} per batch`);
      setBomOpen(false);
    } catch (e) {
      setBomError(e instanceof Error ? e.message : "Could not create the BOM.");
    } finally {
      setBomSaving(false);
    }
  }

  return (
    <div style={{ fontFamily: FONT, color: "white", padding: "24px 20px 80px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 4px" }}>Costing</h1>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Work out what a job costs using your own{" "}
            <Link href="/dashboard/costing/formulas" style={{ color: "#818cf8" }}>formulas</Link>.
          </p>
        </div>
        <Link href="/dashboard/costing/formulas" style={{ ...btn(), textDecoration: "none" }}>Manage formulas</Link>
      </div>

      {formulaStore.loading ? (
        <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading…</div>
      ) : !formulas.length ? (
        <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 14, padding: "38px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.5)", margin: "0 0 8px" }}>No formulas yet.</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.32)", margin: "0 0 22px" }}>
            Create one first — there are worked examples for packaging, textile, printing, wood, metal, food and moulding.
          </p>
          <Link href="/dashboard/costing/formulas" style={{ ...btn(true), textDecoration: "none" }}>Create a formula →</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)", gap: 22, alignItems: "start" }}>
          {/* ── Inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <label style={labelStyle}>Formula</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ ...inputStyle, fontFamily: FONT }}>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>{f.formula.category} — {f.formula.name}</option>
                ))}
              </select>
              {selected?.formula.description && (
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)", margin: "10px 0 0", lineHeight: 1.65 }}>
                  {selected.formula.description}
                </p>
              )}
            </div>

            {selected && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Enter the job</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {askedInputs.map((inp) => (
                    <div key={inp.key}>
                      <label style={labelStyle}>
                        {inp.label || inp.key}
                        {inp.unit && <span style={{ color: "rgba(255,255,255,.28)" }}> · {inp.unit}</span>}
                      </label>
                      {inp.isList ? (
                        <input
                          value={(values[inp.key] as number[] | undefined)?.join(", ") ?? ""}
                          onChange={(e) => setValues((v) => ({
                            ...v,
                            [inp.key]: e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => Number.isFinite(n)),
                          }))}
                          style={inputStyle}
                        />
                      ) : (
                        <input type="number" step="any"
                          value={String(values[inp.key] ?? "")}
                          onChange={(e) => setValues((v) => ({ ...v, [inp.key]: Number(e.target.value) }))}
                          style={inputStyle}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {fixedInputs.length > 0 && (
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ ...labelStyle, cursor: "pointer", marginBottom: 0 }}>
                      Settings ({fixedInputs.length})
                    </summary>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      {fixedInputs.map((inp) => (
                        <div key={inp.key}>
                          <label style={labelStyle}>
                            {inp.label || inp.key}
                            {inp.unit && <span style={{ color: "rgba(255,255,255,.28)" }}> · {inp.unit}</span>}
                          </label>
                          {inp.isList ? (
                            <input
                              value={(values[inp.key] as number[] | undefined)?.join(", ") ?? ""}
                              onChange={(e) => setValues((v) => ({
                                ...v,
                                [inp.key]: e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => Number.isFinite(n)),
                              }))}
                              style={inputStyle}
                            />
                          ) : (
                            <input type="number" step="any"
                              value={String(values[inp.key] ?? "")}
                              onChange={(e) => setValues((v) => ({ ...v, [inp.key]: Number(e.target.value) }))}
                              style={inputStyle}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {recentSheets.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent sheets</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {recentSheets.map((s) => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                      <span style={{ color: "rgba(255,255,255,.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title}
                      </span>
                      <span style={{ fontFamily: MONO, color: "#34d399", fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {fmt(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Result ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>
            {run && !run.ok && (
              <div style={{ padding: "12px 15px", borderRadius: 11, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.28)", color: "#f87171", fontSize: 13 }}>
                {run.error}
              </div>
            )}

            {primary && (
              <div style={{
                borderRadius: 16, padding: "26px 24px",
                background: "linear-gradient(135deg,rgba(52,211,153,.11),rgba(16,185,129,.04))",
                border: "1px solid rgba(52,211,153,.26)",
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(52,211,153,.8)", marginBottom: 8 }}>
                  {primary.label || primary.key}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 38, fontWeight: 800, color: "#34d399", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(run?.values[primary.key])}
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,.32)", marginLeft: 8, fontWeight: 600 }}>{primary.unit}</span>
                </div>
              </div>
            )}

            {outputs.length > 1 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
                  {outputs.filter((o) => o.key !== primary?.key).map((o) => (
                    <div key={o.key}>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginBottom: 3 }}>{o.label || o.key}</div>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmt(run?.values[o.key])}
                        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.28)", marginLeft: 4 }}>{o.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Working */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <button onClick={() => setShowWorking((v) => !v)} style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontFamily: FONT, fontSize: 14, fontWeight: 700, color: "white", marginBottom: showWorking ? 14 : 0,
              }}>
                {showWorking ? "▾" : "▸"} How this was calculated
              </button>
              {showWorking && (
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {run?.steps.map((s) => (
                    <div key={s.key} style={{
                      display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12,
                      padding: "8px 10px", borderRadius: 7,
                      background: s.error ? "rgba(248,113,113,.08)" : "transparent",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)" }}>{s.label}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,.28)", overflowWrap: "break-word" }}>
                          {s.expression}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: MONO, fontSize: 13, fontWeight: 700, textAlign: "right", whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        color: s.error ? "#f87171" : "rgba(255,255,255,.85)",
                      }}>
                        {s.error ? "error" : fmt(s.value)}
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginLeft: 4 }}>{s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            {selected && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <label style={labelStyle}>Save this as a sheet</label>
                <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                  <input value={sheetName} onChange={(e) => setSheetName(e.target.value)}
                    placeholder="PVC bag 11.5 × 11 — Ali Traders"
                    style={{ ...inputStyle, fontFamily: FONT, flex: 1, minWidth: 180 }}/>
                  <button onClick={saveSheet} disabled={!run?.ok} style={{ ...btn(true), opacity: run?.ok ? 1 : .5 }}>
                    Save sheet
                  </button>
                </div>
                {savedNote && <div style={{ fontSize: 12.5, color: "#34d399", marginTop: 9 }}>{savedNote}</div>}
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.28)", margin: "10px 0 0", lineHeight: 1.6 }}>
                  The sheet keeps the numbers you entered and the formula version used, so a
                  quote stays as quoted even if the formula changes later.
                </p>
              </div>
            )}

            {/* ── Turn the result into something the factory can produce against ── */}
            {selected && run?.ok && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Produce this</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 3 }}>
                      Creates the BOM the shop floor runs against, with these numbers already in it.
                    </div>
                  </div>
                  {!bomOpen && (
                    <button onClick={openBomBuilder} style={btn(true)}>Create BOM →</button>
                  )}
                </div>

                {bomDone && (
                  <div style={{ fontSize: 12.5, color: "#34d399", marginTop: 12 }}>
                    {bomDone} · <Link href="/dashboard/manufacturing/production-orders" style={{ color: "#818cf8" }}>raise a production order →</Link>
                  </div>
                )}

                {bomOpen && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {bomError && (
                      <div style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.28)", color: "#f87171", fontSize: 12.5 }}>
                        {bomError}
                      </div>
                    )}

                    {(!finishedItems.length || !rawItems.length) && (
                      <div style={{ padding: "10px 12px", borderRadius: 9, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.26)", color: "#fbbf24", fontSize: 12.5, lineHeight: 1.6 }}>
                        You need the item first — a raw material to consume and a finished product to make.
                        Add them in{" "}
                        <Link href="/dashboard/manufacturing/raw-materials" style={{ color: "#fcd34d" }}>Manufacturing → Raw Materials</Link>.
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Finished product</label>
                        <select value={bomForm.finishedItemId}
                          onChange={(e) => setBomForm((c) => ({ ...c, finishedItemId: e.target.value }))}
                          style={{ ...inputStyle, fontFamily: FONT }}>
                          <option value="">— Select —</option>
                          {finishedItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Raw material</label>
                        <select value={bomForm.materialItemId}
                          onChange={(e) => setBomForm((c) => ({ ...c, materialItemId: e.target.value }))}
                          style={{ ...inputStyle, fontFamily: FONT }}>
                          <option value="">— Select —</option>
                          {rawItems.map((i) => <option key={i.id} value={i.id}>{i.name} · Rs. {Math.round(i.unitCost).toLocaleString()}/{i.unit}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Material per batch</label>
                        <input type="number" min={0} step="any" value={bomForm.materialQty}
                          onChange={(e) => setBomForm((c) => ({ ...c, materialQty: Number(e.target.value) }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Units per batch</label>
                        <input type="number" min={1} value={bomForm.yieldUnits}
                          onChange={(e) => setBomForm((c) => ({ ...c, yieldUnits: Number(e.target.value) }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Labour per batch</label>
                        <input type="number" min={0} step="any" value={bomForm.labourPerBatch}
                          onChange={(e) => setBomForm((c) => ({ ...c, labourPerBatch: Number(e.target.value) }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Overhead per batch</label>
                        <input type="number" min={0} step="any" value={bomForm.overheadPerBatch}
                          onChange={(e) => setBomForm((c) => ({ ...c, overheadPerBatch: Number(e.target.value) }))}
                          style={inputStyle} />
                      </div>
                    </div>

                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,.5)", cursor: "pointer", lineHeight: 1.6 }}>
                      <input type="checkbox" checked={bomForm.divisible} style={{ marginTop: 3 }}
                        onChange={(e) => setBomForm((c) => ({ ...c, divisible: e.target.checked }))} />
                      Roll / sheet material — a run needing 12.66 rolls takes 13 and the balance stays
                      as open stock for the next order, instead of being charged to this batch.
                    </label>

                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.7 }}>
                      {bomSeed?.unitsPerBatch != null && <>Units per batch came from the formula ({fmt(bomSeed.unitsPerBatch)}). </>}
                      {bomSeed?.conversion != null && <>Labour is cost per unit × units per batch − batch material cost. </>}
                      Material cost is read from stock when the run is priced, so the BOM follows what you actually paid.
                    </div>

                    <div style={{ display: "flex", gap: 9 }}>
                      <button onClick={createBom} disabled={bomSaving} style={{ ...btn(true), opacity: bomSaving ? .6 : 1 }}>
                        {bomSaving ? "Creating…" : "Create BOM"}
                      </button>
                      <button onClick={() => setBomOpen(false)} style={btn()}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CostingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "rgba(255,255,255,.35)", fontFamily: FONT }}>Loading…</div>}>
      <CostingInner/>
    </Suspense>
  );
}
