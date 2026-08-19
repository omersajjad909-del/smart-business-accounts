"use client";
// FILE: app/dashboard/costing/formulas/page.tsx
//
// Where costing formulas are written. Categories on top, formulas inside them,
// and an editor that shows every step's value as you type — a formula you
// cannot see running is a formula you cannot debug.
//
// The editor is laid out as four numbered stages (describe → inputs → steps →
// outputs) with a labelled header above every grid, because an unlabelled row
// of four identical boxes is the fastest way to get a formula wrong. The two
// things that used to break a formula silently — a scalar input flipped to a
// list, and a list left empty — now name themselves at the top of the page.

import { useMemo, useState } from "react";
import Link from "next/link";

import { useBusinessRecords, type BusinessRecord } from "@/lib/useBusinessRecords";
import {
  runFormula,
  checkExpression,
  validateKey,
  FUNCTIONS,
  type CostingFormula,
  type FormulaInput,
  type FormulaStep,
  type FormulaOutput,
  type OutputRole,
  type StepResult,
} from "@/lib/formulaEngine";
import { FORMULA_CATEGORIES, FORMULA_TEMPLATES } from "@/lib/formulaTemplates";

const CARD = "rgba(255,255,255,.03)";
const BORDER = "rgba(255,255,255,.09)";
const FONT = "'Outfit','DM Sans',system-ui,sans-serif";
const MONO = "ui-monospace,'Cascadia Code','SF Mono',Consolas,monospace";

const input: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: 9,
  background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
  color: "white", fontSize: 13, outline: "none", fontFamily: FONT,
  boxSizing: "border-box",
};
const monoInput: React.CSSProperties = { ...input, fontFamily: MONO, fontSize: 12.5 };
const label: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
  textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 5,
};
const btn = (kind: "primary" | "ghost" | "danger" = "ghost"): React.CSSProperties => ({
  padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: FONT, border: `1px solid ${BORDER}`,
  background: kind === "primary" ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "rgba(255,255,255,.05)",
  color: kind === "danger" ? "#f87171" : kind === "primary" ? "white" : "rgba(255,255,255,.7)",
  ...(kind === "primary" ? { border: "none" } : {}),
});
const iconBtn: React.CSSProperties = { ...btn(), padding: "8px 10px", fontSize: 12 };

/* Grid shapes live in CSS, not inline styles, so the column headers and the
   rows below them stay locked together and the whole editor can stack on a
   narrow screen. */
const CSS = `
.fxWrap{max-width:1240px;margin:0 auto;padding:0 18px 90px}
.fxBar{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:10px;
  padding:14px 0;margin-bottom:14px;background:rgba(8,11,20,.88);
  backdrop-filter:blur(14px);border-bottom:1px solid ${BORDER};flex-wrap:wrap}
.fxBar .grow{flex:1;min-width:180px}
.fxCols{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:start}
.fxSide{display:flex;flex-direction:column;gap:14px;position:sticky;top:82px}
/* Simple keeps a row down to what a trade actually thinks about — the name,
   the unit, the number. Detailed adds the machinery: keys, type, ask, roles. */
.fxInS{display:grid;grid-template-columns:1.7fr .5fr 1fr auto;gap:8px;align-items:center}
.fxStepS{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.fxOutS{display:grid;grid-template-columns:1.1fr 1.6fr auto auto;gap:8px;align-items:center}
.fxIn{display:grid;grid-template-columns:1.05fr 1.3fr .6fr .95fr 1.05fr auto auto;gap:8px;align-items:center}
.fxOut{display:grid;grid-template-columns:1.05fr 1.3fr .6fr 1.1fr auto auto;gap:8px;align-items:center}
.fxStep{display:grid;grid-template-columns:1.05fr 1.3fr .6fr auto;gap:8px;align-items:center}
.fxHead{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:rgba(255,255,255,.32);padding:0 2px 3px}
@media(max-width:1080px){
  .fxCols{grid-template-columns:1fr}
  .fxSide{position:static}
}
/* Under 768px the dashboard's own topbar is sticky against the window, so the
   action bar parks below it instead of covering it. */
@media(max-width:767px){
  .fxIn,.fxOut,.fxStep,.fxInS,.fxOutS{grid-template-columns:1fr 1fr}
  .fxHeadRow{display:none}
  .fxBar{top:52px;z-index:9}
}
`;

const ROLE_LABELS: Record<OutputRole, string> = {
  none: "—",
  cost_per_unit: "Cost per unit",
  cost_per_batch: "Cost per batch",
  units_per_batch: "Units per batch",
  material_qty: "Material quantity",
  waste_qty: "Waste quantity",
};

type Draft = CostingFormula;

function emptyDraft(category: string): Draft {
  return {
    name: "", category, description: "", version: 1,
    inputs: [{ key: "materialCost", label: "Material cost", unit: "Rs", defaultValue: 100, askOnRun: true }],
    steps: [{ key: "costPerPc", label: "Cost per unit", expression: "materialCost", unit: "Rs" }],
    outputs: [{ key: "costPerPc", label: "Cost per unit", unit: "Rs", role: "cost_per_unit", primary: true }],
  };
}

function toDraft(record: BusinessRecord): Draft {
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

/**
 * Keys the editor invented for a brand-new row. While a key still looks like
 * this, nothing can be referring to it yet, so it is safe to rewrite from the
 * label — which is how Simple view gets away with never showing keys at all.
 */
const AUTO_KEY = /^(input|step)\d+$/;

function keyFromLabel(label: string, taken: string[]): string | null {
  const words = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const key = words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  if (validateKey(key)) return null;      // reserved word, or starts with a digit
  if (taken.includes(key)) return null;   // already used by another row
  return key;
}

function fmt(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v !== "number") return "—";
  if (!Number.isFinite(v)) return "—";
  return Math.abs(v % 1) < 1e-9
    ? v.toLocaleString()
    : (Math.round(v * 10000) / 10000).toLocaleString();
}

export default function FormulasPage() {
  const store = useBusinessRecords("costing_formula");
  const [category, setCategory] = useState<string>("");
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  // Which formula box was used last — a key chip types itself in there.
  const [activeStep, setActiveStep] = useState<number | null>(null);
  // Simple hides the plumbing (keys, type, ask, roles) and shows a trade the
  // three things it cares about. Detailed is the full table.
  const [detailed, setDetailed] = useState(false);

  const formulas = useMemo(
    () => store.records.map((r) => ({ record: r, draft: toDraft(r) })),
    [store.records],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of FORMULA_CATEGORIES) counts.set(c, 0);
    for (const f of formulas) counts.set(f.draft.category, (counts.get(f.draft.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [formulas]);

  const visible = category ? formulas.filter((f) => f.draft.category === category) : formulas;

  /* ── live evaluation of the draft ── */
  const preview = useMemo(() => {
    if (!editing) return null;
    return runFormula(editing.draft);
  }, [editing]);

  function patch(mut: (d: Draft) => void) {
    setEditing((cur) => {
      if (!cur) return cur;
      const next = structuredClone(cur.draft);
      mut(next);
      return { ...cur, draft: next };
    });
  }

  function close() { setEditing(null); setErr(""); setActiveStep(null); }

  async function save() {
    if (!editing) return;
    const d = editing.draft;
    if (!d.name.trim()) { setErr("Give the formula a name."); return; }

    for (const list of [d.inputs, d.steps]) {
      for (const row of list) {
        const keyErr = validateKey(row.key);
        if (keyErr) { setErr(`"${row.key || "(blank)"}" — ${keyErr}`); return; }
      }
    }
    const keys = [...d.inputs, ...d.steps].map((r) => r.key);
    const dupe = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dupe) { setErr(`"${dupe}" is used twice — every input and step needs its own key.`); return; }

    // A list input with nothing in it evaluates to [] and takes every step that
    // reads it down with it, so it is caught here rather than at run time.
    const emptyList = d.inputs.find((i) => i.isList && !(i.listValue ?? []).length);
    if (emptyList) {
      setErr(`"${emptyList.label || emptyList.key}" is set to List but has no values — type them like 48, 50, 52, or set it back to Number.`);
      return;
    }

    for (const step of d.steps) {
      const syntax = checkExpression(step.expression);
      if (syntax) { setErr(`${step.label || step.key}: ${syntax}`); return; }
    }

    setErr("");
    setSaving(true);
    try {
      const payload = {
        title: d.name.trim(),
        status: "active",
        data: {
          category: d.category,
          description: d.description,
          version: editing.id ? d.version + 1 : 1,
          inputs: d.inputs,
          steps: d.steps,
          outputs: d.outputs,
        },
      };
      if (editing.id) await store.update(editing.id, payload);
      else await store.create(payload);
      close();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the formula.");
    } finally {
      setSaving(false);
    }
  }

  /* ─────────────────────────── Editor ─────────────────────────── */
  if (editing) {
    const d = editing.draft;
    const stepValues = new Map<string, StepResult>(
      preview?.steps.map((s): [string, StepResult] => [s.key, s]) ?? [],
    );
    const emptyLists = d.inputs.filter((i) => i.isList && !(i.listValue ?? []).length);

    /* Simple view never shows a key, so the label writes one — but only while
       the key is still the placeholder the editor invented, never over a key a
       step could already be using. */
    const setInputLabel = (i: number, text: string) => patch((x) => {
      const row = x.inputs[i];
      const auto = !row.key || AUTO_KEY.test(row.key);
      row.label = text;
      if (!auto) return;
      const taken = x.inputs.filter((_, j) => j !== i).map((r) => r.key).concat(x.steps.map((r) => r.key));
      const next = keyFromLabel(text, taken);
      if (next) row.key = next;
    });

    const setStepLabel = (i: number, text: string) => patch((x) => {
      const row = x.steps[i];
      const auto = !row.key || AUTO_KEY.test(row.key);
      const before = row.key;
      row.label = text;
      if (!auto) return;
      const taken = x.steps.filter((_, j) => j !== i).map((r) => r.key).concat(x.inputs.map((r) => r.key));
      const next = keyFromLabel(text, taken);
      if (!next) return;
      row.key = next;
      // An output already pointing at the placeholder follows it across.
      x.outputs.forEach((o) => { if (o.key === before) o.key = next; });
    });

    // Appends a key to whichever formula box was last used, so an author never
    // has to remember or retype a key.
    const insertKey = (k: string) => {
      if (activeStep === null) return;
      patch((x) => {
        const st = x.steps[activeStep];
        if (!st) return;
        st.expression = st.expression.trim() ? `${st.expression.trimEnd()} ${k}` : k;
      });
    };

    return (
      <div className="fxWrap" style={{ fontFamily: FONT, color: "white" }}>
        <style>{CSS}</style>

        {/* ── Action bar: name, category and Save always in reach ── */}
        <div className="fxBar">
          <button onClick={close} style={iconBtn} title="Back to formulas">←</button>
          <input
            value={d.name}
            onChange={(e) => patch((x) => { x.name = e.target.value; })}
            placeholder="Name this formula — e.g. PVC Bag — Simple"
            className="grow"
            style={{ ...input, fontSize: 15, fontWeight: 700, padding: "10px 13px" }}
          />
          <select value={d.category} onChange={(e) => patch((x) => { x.category = e.target.value; })}
            style={{ ...input, width: "auto", minWidth: 150 }}>
            {FORMULA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 11, background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}` }}>
            {([["Simple", false], ["Detailed", true]] as const).map(([text, on]) => (
              <button key={text} onClick={() => setDetailed(on)} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                cursor: "pointer", fontFamily: FONT, border: "none",
                background: detailed === on ? "rgba(99,102,241,.28)" : "transparent",
                color: detailed === on ? "#c7d2fe" : "rgba(255,255,255,.45)",
              }}>{text}</button>
            ))}
          </div>
          <button onClick={close} style={btn()}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...btn("primary"), opacity: saving ? .6 : 1 }}>
            {saving ? "Saving…" : editing.id ? "Save new version" : "Create formula"}
          </button>
        </div>

        {err && <Banner tone="error" text={err} />}
        {!err && emptyLists.map((i) => (
          <Banner
            key={i.key}
            tone="warn"
            text={`"${i.label || i.key}" is set to List but has no values yet. Type the sizes like 48, 50, 52 — or set its Type back to Number.`}
          />
        ))}

        <div className="fxCols">
          {/* ── Left: definition ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <Section n={1} title="What it is for" hint="One line an operator can read before running it.">
              <input value={d.description ?? ""} onChange={(e) => patch((x) => { x.description = e.target.value; })}
                placeholder="Bags cut from a roll — change stock widths to match your supplier" style={input}/>
            </Section>

            {/* Inputs */}
            <Section
              n={2}
              title="Inputs"
              hint="What the operator types in, or a constant your trade always uses."
              onAdd={() => patch((x) => { x.inputs.push({ key: `input${x.inputs.length + 1}`, label: "", defaultValue: 0, askOnRun: true }); })}
              head={detailed ? (
                <div className="fxIn fxHeadRow">
                  <div className="fxHead">Key (used in steps)</div>
                  <div className="fxHead">Shown as</div>
                  <div className="fxHead">Unit</div>
                  <div className="fxHead">Type</div>
                  <div className="fxHead">Value</div>
                  <div className="fxHead">Ask</div>
                  <div />
                </div>
              ) : (
                <div className="fxInS fxHeadRow">
                  <div className="fxHead">Name</div>
                  <div className="fxHead">Unit</div>
                  <div className="fxHead">Value</div>
                  <div />
                </div>
              )}
            >
              {d.inputs.map((inp, i) => {
                const badList = !!inp.isList && !(inp.listValue ?? []).length;

                const valueCell = inp.isList ? (
                  <input value={(inp.listValue ?? []).join(", ")}
                    onChange={(e) => patch((x) => {
                      x.inputs[i].listValue = e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => Number.isFinite(n));
                    })}
                    placeholder="48, 50, 52"
                    style={{ ...monoInput, borderColor: badList ? "rgba(251,191,36,.55)" : BORDER }}/>
                ) : (
                  <input type="number" step="any" value={inp.defaultValue ?? 0}
                    onChange={(e) => patch((x) => { x.inputs[i].defaultValue = Number(e.target.value); })}
                    style={monoInput}/>
                );

                const removeBtn = (
                  <button title="Remove" onClick={() => patch((x) => { x.inputs.splice(i, 1); })}
                    style={{ ...btn("danger"), padding: "8px 10px", fontSize: 12 }}>✕</button>
                );

                if (!detailed) {
                  return (
                    <div className="fxInS" key={i}>
                      <input value={inp.label} onChange={(e) => setInputLabel(i, e.target.value)}
                        placeholder="Piece width" style={input}/>
                      <input value={inp.unit ?? ""} onChange={(e) => patch((x) => { x.inputs[i].unit = e.target.value; })}
                        placeholder="in" style={input}/>
                      {valueCell}
                      {removeBtn}
                    </div>
                  );
                }

                return (
                  <div className="fxIn" key={i}>
                    <input value={inp.key} onChange={(e) => patch((x) => { x.inputs[i].key = e.target.value; })}
                      placeholder="pieceWidth" style={monoInput}/>
                    <input value={inp.label} onChange={(e) => setInputLabel(i, e.target.value)}
                      placeholder="Piece width" style={input}/>
                    <input value={inp.unit ?? ""} onChange={(e) => patch((x) => { x.inputs[i].unit = e.target.value; })}
                      placeholder="in" style={input}/>
                    {/* Was a bare "[ ]" toggle. A named choice, because getting
                        this wrong hands a list to a step that wants a number. */}
                    <select
                      value={inp.isList ? "list" : "number"}
                      onChange={(e) => patch((x) => {
                        const isList = e.target.value === "list";
                        x.inputs[i].isList = isList;
                        if (isList && !x.inputs[i].listValue) x.inputs[i].listValue = [];
                      })}
                      style={{ ...input, color: inp.isList ? "#a5b4fc" : "white" }}
                      title="Number = one value. List = several stock sizes to choose between."
                    >
                      <option value="number">Number</option>
                      <option value="list">List</option>
                    </select>
                    {valueCell}
                    <button
                      title={inp.askOnRun
                        ? "The operator is asked for this on every run"
                        : "Fixed — sits under Settings when the formula runs"}
                      onClick={() => patch((x) => { x.inputs[i].askOnRun = !x.inputs[i].askOnRun; })}
                      style={{ ...iconBtn, padding: "8px 9px", fontSize: 11,
                        color: inp.askOnRun ? "#34d399" : "rgba(255,255,255,.35)" }}>
                      {inp.askOnRun ? "Ask" : "Fixed"}
                    </button>
                    {removeBtn}
                  </div>
                );
              })}
              {!detailed && (
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.28)", lineHeight: 1.6, paddingTop: 4 }}>
                  Switch to <strong style={{ color: "rgba(255,255,255,.45)" }}>Detailed</strong> above to rename keys,
                  turn an input into a list of stock sizes, or stop the operator being asked for it.
                </div>
              )}
            </Section>

            {/* Steps */}
            <Section
              n={3}
              title="Steps"
              hint="Each step can use the inputs and every step above it. Order matters."
              onAdd={() => patch((x) => { x.steps.push({ key: `step${x.steps.length + 1}`, label: "", expression: "" }); })}
              head={detailed ? (
                <div className="fxStep fxHeadRow">
                  <div className="fxHead">Key</div>
                  <div className="fxHead">Shown as</div>
                  <div className="fxHead">Unit</div>
                  <div />
                </div>
              ) : null}
            >
              {d.steps.map((st, i) => {
                const result = stepValues.get(st.key);
                const stepErr = result?.error;
                return (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", gap: 7,
                    padding: 11, borderRadius: 11,
                    background: stepErr ? "rgba(248,113,113,.06)" : "rgba(255,255,255,.02)",
                    border: `1px solid ${stepErr ? "rgba(248,113,113,.3)" : BORDER}`,
                  }}>
                    {detailed ? (
                      <div className="fxStep">
                        <input value={st.key} onChange={(e) => patch((x) => { x.steps[i].key = e.target.value; })}
                          placeholder="key" style={monoInput}/>
                        <input value={st.label} onChange={(e) => setStepLabel(i, e.target.value)}
                          placeholder="What this step works out" style={input}/>
                        <input value={st.unit ?? ""} onChange={(e) => patch((x) => { x.steps[i].unit = e.target.value; })}
                          placeholder="unit" style={input}/>
                        <button title="Remove" onClick={() => patch((x) => { x.steps.splice(i, 1); })}
                          style={{ ...btn("danger"), padding: "8px 10px", fontSize: 12 }}>✕</button>
                      </div>
                    ) : (
                      <div className="fxStepS">
                        <input value={st.label} onChange={(e) => setStepLabel(i, e.target.value)}
                          placeholder="What this step works out" style={input}/>
                        <button title="Remove" onClick={() => patch((x) => { x.steps.splice(i, 1); })}
                          style={{ ...btn("danger"), padding: "8px 10px", fontSize: 12 }}>✕</button>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        width: 22, height: 22, flexShrink: 0, borderRadius: 7,
                        background: "rgba(99,102,241,.16)", color: "#a5b4fc",
                        fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center",
                      }}>{i + 1}</span>
                      <span style={{ fontFamily: MONO, color: "rgba(255,255,255,.3)", fontSize: 14 }}>=</span>
                      <input value={st.expression}
                        onFocus={() => setActiveStep(i)}
                        onChange={(e) => patch((x) => { x.steps[i].expression = e.target.value; })}
                        placeholder="materialCost + labour"
                        style={{ ...monoInput, borderColor: stepErr ? "rgba(248,113,113,.5)" : BORDER }}/>
                      <div style={{
                        minWidth: 108, textAlign: "right", fontFamily: MONO, fontSize: 12.5,
                        fontVariantNumeric: "tabular-nums",
                        color: stepErr ? "#f87171" : "#34d399", fontWeight: 700,
                      }}>
                        {stepErr ? "error" : fmt(result?.value)}
                        {!stepErr && st.unit && (
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginLeft: 4 }}>{st.unit}</span>
                        )}
                      </div>
                    </div>
                    {stepErr && <div style={{ fontSize: 11.5, color: "#f87171", paddingLeft: 30 }}>{stepErr}</div>}
                  </div>
                );
              })}
            </Section>

            {/* Outputs */}
            <Section
              n={4}
              title="Outputs"
              hint="Which values the result screen shows — and what they mean to the rest of the system."
              onAdd={() => patch((x) => { x.outputs.push({ key: "", label: "", role: "none" }); })}
              head={detailed ? (
                <div className="fxOut fxHeadRow">
                  <div className="fxHead">Value</div>
                  <div className="fxHead">Shown as</div>
                  <div className="fxHead">Unit</div>
                  <div className="fxHead">Means</div>
                  <div className="fxHead">Main</div>
                  <div />
                </div>
              ) : (
                <div className="fxOutS fxHeadRow">
                  <div className="fxHead">Value</div>
                  <div className="fxHead">Shown as</div>
                  <div className="fxHead">Main</div>
                  <div />
                </div>
              )}
            >
              {d.outputs.map((out, i) => {
                const picker = (
                  <select value={out.key} onChange={(e) => patch((x) => {
                    x.outputs[i].key = e.target.value;
                    // A fresh output takes the name and unit of what it shows.
                    if (!x.outputs[i].label) {
                      const src = [...x.inputs, ...x.steps].find((r) => r.key === e.target.value);
                      if (src) {
                        x.outputs[i].label = src.label || src.key;
                        if (!x.outputs[i].unit) x.outputs[i].unit = src.unit;
                      }
                    }
                  })} style={monoInput}>
                    <option value="">— pick —</option>
                    {[...d.inputs, ...d.steps].map((r) => (
                      <option key={r.key} value={r.key}>{detailed ? r.key : (r.label || r.key)}</option>
                    ))}
                  </select>
                );
                const labelBox = (
                  <input value={out.label} onChange={(e) => patch((x) => { x.outputs[i].label = e.target.value; })}
                    placeholder="Cost per piece" style={input}/>
                );
                const starBtn = (
                  <button title="Show as the headline number" onClick={() => patch((x) => {
                    x.outputs.forEach((o, j) => { o.primary = j === i ? !o.primary : false; });
                  })} style={{ ...iconBtn, padding: "8px 11px", color: out.primary ? "#fbbf24" : "rgba(255,255,255,.35)" }}>★</button>
                );
                const removeBtn = (
                  <button title="Remove" onClick={() => patch((x) => { x.outputs.splice(i, 1); })}
                    style={{ ...btn("danger"), padding: "8px 10px", fontSize: 12 }}>✕</button>
                );

                if (!detailed) {
                  return (
                    <div className="fxOutS" key={i}>
                      {picker}{labelBox}{starBtn}{removeBtn}
                    </div>
                  );
                }

                return (
                  <div className="fxOut" key={i}>
                    {picker}
                    {labelBox}
                    <input value={out.unit ?? ""} onChange={(e) => patch((x) => { x.outputs[i].unit = e.target.value; })}
                      placeholder="Rs" style={input}/>
                    <select value={out.role ?? "none"} onChange={(e) => patch((x) => { x.outputs[i].role = e.target.value as OutputRole; })} style={input}>
                      {(Object.keys(ROLE_LABELS) as OutputRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    {starBtn}
                    {removeBtn}
                  </div>
                );
              })}
            </Section>
          </div>

          {/* ── Right: live preview, the keys in scope, function reference ── */}
          <div className="fxSide">
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ ...label, marginBottom: 12 }}>Live result</div>
              {preview?.ok === false && (
                <div style={{
                  fontSize: 12, color: "#f87171", marginBottom: 12, lineHeight: 1.6,
                  padding: "9px 11px", borderRadius: 9,
                  background: "rgba(248,113,113,.09)", border: "1px solid rgba(248,113,113,.25)",
                }}>
                  {preview.error}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {d.outputs.filter((o) => o.key).map((o) => (
                  <div key={o.key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
                    padding: o.primary ? "10px 12px" : "4px 0",
                    background: o.primary ? "rgba(52,211,153,.09)" : "transparent",
                    border: o.primary ? "1px solid rgba(52,211,153,.25)" : "none",
                    borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>{o.label || o.key}</span>
                    <span style={{
                      fontFamily: MONO, fontVariantNumeric: "tabular-nums",
                      fontSize: o.primary ? 17 : 13, fontWeight: 700,
                      color: o.primary ? "#34d399" : "rgba(255,255,255,.85)",
                    }}>
                      {fmt(preview?.values[o.key])}<span style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginLeft: 4 }}>{o.unit}</span>
                    </span>
                  </div>
                ))}
                {!d.outputs.some((o) => o.key) && (
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)" }}>Add an output to see the result.</div>
                )}
              </div>
            </div>

            {/* Every name a step is allowed to mention, with what it holds right
                now. Clicking one types it into the formula box last used. */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ ...label, marginBottom: 4 }}>Values you can use</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", marginBottom: 12, lineHeight: 1.6 }}>
                {activeStep === null
                  ? "Click a step's formula box, then click a name to add it."
                  : `Click a name to add it to step ${activeStep + 1}.`}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...d.inputs, ...d.steps].filter((r) => r.key).map((r) => (
                  <button key={r.key} onClick={() => insertKey(r.key)} title={r.label || r.key}
                    style={{
                      ...btn(), padding: "6px 9px", fontSize: 11.5, fontFamily: MONO,
                      cursor: activeStep === null ? "default" : "pointer",
                      opacity: activeStep === null ? .5 : 1,
                      color: "#a5b4fc", display: "flex", gap: 6, alignItems: "baseline",
                    }}>
                    {r.key}
                    <span style={{ color: "rgba(255,255,255,.35)" }}>{fmt(preview?.values[r.key])}</span>
                  </button>
                ))}
              </div>
            </div>

            <details style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <summary style={{ ...label, marginBottom: 0, cursor: "pointer" }}>Functions you can use</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 14, maxHeight: 380, overflowY: "auto" }}>
                {FUNCTIONS.map((f) => (
                  <div key={f.name}>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: "#818cf8" }}>{f.signature}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", lineHeight: 1.6 }}>{f.description}</div>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.6, paddingTop: 6, borderTop: `1px solid ${BORDER}` }}>
                  Operators: <code style={{ fontFamily: MONO }}>+ − * / % ^</code> and comparisons{" "}
                  <code style={{ fontFamily: MONO }}>&gt; &lt; &gt;= &lt;= == !=</code>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────── List ─────────────────────────── */
  return (
    <div style={{ fontFamily: FONT, color: "white", padding: "24px 20px 80px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 4px" }}>Formulas</h1>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Write how your products are costed. Use them on the{" "}
            <Link href="/dashboard/costing" style={{ color: "#818cf8" }}>Costing</Link> page.
          </p>
        </div>
        <button onClick={() => setEditing({ id: null, draft: emptyDraft(category || "General") })} style={btn("primary")}>
          + New formula
        </button>
      </div>

      {/* Category boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 26 }}>
        <CategoryBox label="All" count={formulas.length} active={!category} onClick={() => setCategory("")}/>
        {categories.map(([c, n]) => (
          <CategoryBox key={c} label={c} count={n} active={category === c} onClick={() => setCategory(c)}/>
        ))}
      </div>

      {store.loading ? (
        <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading…</div>
      ) : visible.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map(({ record, draft }) => (
            <div key={record.id} style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{draft.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                  {draft.category} · {draft.inputs.length} inputs · {draft.steps.length} steps · v{draft.version}
                </div>
              </div>
              <Link href={`/dashboard/costing?formula=${record.id}`} style={{ ...btn(), textDecoration: "none" }}>Run</Link>
              <button onClick={() => setEditing({ id: record.id, draft })} style={btn()}>Edit</button>
              <button onClick={() => { if (confirm(`Delete "${draft.name}"?`)) store.remove(record.id); }}
                style={btn("danger")}>Delete</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 14, padding: "34px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", margin: "0 0 6px" }}>
            No formulas here yet.
          </p>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.3)", margin: "0 0 20px" }}>
            Start from a worked example and change it to match your own trade.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10, textAlign: "left" }}>
            {FORMULA_TEMPLATES.filter((t) => !category || t.category === category).map((t) => (
              <button key={t.templateId}
                onClick={() => setEditing({ id: null, draft: { ...structuredClone(t), name: t.name } })}
                style={{ ...btn(), display: "block", textAlign: "left", padding: "13px 15px", lineHeight: 1.5 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3 }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", fontWeight: 400 }}>{t.summary}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Banner({ tone, text }: { tone: "error" | "warn"; text: string }) {
  const c = tone === "error" ? "248,113,113" : "251,191,36";
  return (
    <div style={{
      padding: "11px 14px", borderRadius: 10, marginBottom: 12,
      background: `rgba(${c},.1)`, border: `1px solid rgba(${c},.28)`,
      color: `rgb(${c})`, fontSize: 13, lineHeight: 1.6,
    }}>
      {text}
    </div>
  );
}

function CategoryBox({ label: text, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? "rgba(99,102,241,.16)" : CARD,
      border: `1px solid ${active ? "rgba(99,102,241,.45)" : BORDER}`,
      borderRadius: 12, padding: "13px 14px", cursor: "pointer",
      textAlign: "left", fontFamily: FONT, transition: "all .15s",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: active ? "#a5b4fc" : "white" }}>{text}</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.33)", marginTop: 2 }}>
        {count} {count === 1 ? "formula" : "formulas"}
      </div>
    </button>
  );
}

function Section({ n, title, hint, onAdd, head, children }: {
  n: number; title: string; hint: string;
  onAdd?: () => void; head?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{
            width: 24, height: 24, flexShrink: 0, borderRadius: 8, marginTop: 1,
            background: "rgba(99,102,241,.16)", color: "#a5b4fc",
            fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center",
          }}>{n}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{hint}</div>
          </div>
        </div>
        {onAdd && <button onClick={onAdd} style={{ ...btn(), padding: "7px 12px", fontSize: 12, whiteSpace: "nowrap" }}>+ Add</button>}
      </div>
      {head}
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
    </div>
  );
}
