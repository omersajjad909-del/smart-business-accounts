"use client";
// FILE: app/dashboard/costing/formulas/page.tsx
//
// Where costing formulas are written. Categories on top, formulas inside them,
// and an editor that shows every step's value as you type — a formula you
// cannot see running is a formula you cannot debug.

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
      setEditing(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the formula.");
    } finally {
      setSaving(false);
    }
  }

  /* ─────────────────────────── Editor ─────────────────────────── */
  if (editing) {
    const d = editing.draft;
    const stepValues = new Map(preview?.steps.map((s) => [s.key, s]) ?? []);

    return (
      <div style={{ fontFamily: FONT, color: "white", padding: "24px 20px 80px", maxWidth: 1180, margin: "0 auto" }}>
        <button onClick={() => { setEditing(null); setErr(""); }} style={{ ...btn(), marginBottom: 20 }}>
          ← Back to formulas
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.55fr) minmax(0,1fr)", gap: 22, alignItems: "start" }}>
          {/* ── Left: definition ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label}>Formula name</label>
                  <input value={d.name} onChange={(e) => patch((x) => { x.name = e.target.value; })}
                    placeholder="PVC Bag — Simple" style={input}/>
                </div>
                <div>
                  <label style={label}>Category</label>
                  <select value={d.category} onChange={(e) => patch((x) => { x.category = e.target.value; })} style={input}>
                    {FORMULA_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label style={label}>What it is for</label>
              <input value={d.description ?? ""} onChange={(e) => patch((x) => { x.description = e.target.value; })}
                placeholder="Bags cut from a roll — change stock widths to match your supplier" style={input}/>
            </div>

            {/* Inputs */}
            <Section
              title="Inputs"
              hint="What the operator types in, or a constant your trade always uses."
              onAdd={() => patch((x) => { x.inputs.push({ key: `input${x.inputs.length + 1}`, label: "", defaultValue: 0, askOnRun: true }); })}
            >
              {d.inputs.map((inp, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr .7fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <input value={inp.key} onChange={(e) => patch((x) => { x.inputs[i].key = e.target.value; })}
                    placeholder="key" style={monoInput}/>
                  <input value={inp.label} onChange={(e) => patch((x) => { x.inputs[i].label = e.target.value; })}
                    placeholder="Label" style={input}/>
                  <input value={inp.unit ?? ""} onChange={(e) => patch((x) => { x.inputs[i].unit = e.target.value; })}
                    placeholder="unit" style={input}/>
                  {inp.isList ? (
                    <input value={(inp.listValue ?? []).join(", ")}
                      onChange={(e) => patch((x) => {
                        x.inputs[i].listValue = e.target.value.split(",").map((n) => Number(n.trim())).filter((n) => Number.isFinite(n));
                      })}
                      placeholder="48, 50, 52" style={monoInput}/>
                  ) : (
                    <input type="number" step="any" value={inp.defaultValue ?? 0}
                      onChange={(e) => patch((x) => { x.inputs[i].defaultValue = Number(e.target.value); })}
                      style={monoInput}/>
                  )}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button title="List of sizes" onClick={() => patch((x) => {
                      x.inputs[i].isList = !x.inputs[i].isList;
                      if (x.inputs[i].isList && !x.inputs[i].listValue) x.inputs[i].listValue = [];
                    })} style={{ ...btn(), padding: "7px 9px", fontSize: 11, color: inp.isList ? "#818cf8" : "rgba(255,255,255,.4)" }}>
                      [ ]
                    </button>
                    <button title="Remove" onClick={() => patch((x) => { x.inputs.splice(i, 1); })}
                      style={{ ...btn("danger"), padding: "7px 9px", fontSize: 11 }}>✕</button>
                  </div>
                </div>
              ))}
            </Section>

            {/* Steps */}
            <Section
              title="Steps"
              hint="Each step can use the inputs and every step above it. Order matters."
              onAdd={() => patch((x) => { x.steps.push({ key: `step${x.steps.length + 1}`, label: "", expression: "" }); })}
            >
              {d.steps.map((st, i) => {
                const result = stepValues.get(st.key);
                const stepErr = result?.error;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr .7fr auto", gap: 8 }}>
                      <input value={st.key} onChange={(e) => patch((x) => { x.steps[i].key = e.target.value; })}
                        placeholder="key" style={monoInput}/>
                      <input value={st.label} onChange={(e) => patch((x) => { x.steps[i].label = e.target.value; })}
                        placeholder="Label" style={input}/>
                      <input value={st.unit ?? ""} onChange={(e) => patch((x) => { x.steps[i].unit = e.target.value; })}
                        placeholder="unit" style={input}/>
                      <button onClick={() => patch((x) => { x.steps.splice(i, 1); })}
                        style={{ ...btn("danger"), padding: "7px 9px", fontSize: 11 }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input value={st.expression} onChange={(e) => patch((x) => { x.steps[i].expression = e.target.value; })}
                        placeholder="materialCost + labour"
                        style={{ ...monoInput, borderColor: stepErr ? "rgba(248,113,113,.5)" : BORDER }}/>
                      <div style={{
                        minWidth: 110, textAlign: "right", fontFamily: MONO, fontSize: 12.5,
                        fontVariantNumeric: "tabular-nums",
                        color: stepErr ? "#f87171" : "#34d399", fontWeight: 700,
                      }}>
                        {stepErr ? "error" : fmt(result?.value)}
                      </div>
                    </div>
                    {stepErr && <div style={{ fontSize: 11.5, color: "#f87171" }}>{stepErr}</div>}
                  </div>
                );
              })}
            </Section>

            {/* Outputs */}
            <Section
              title="Outputs"
              hint="Which values the result screen shows — and what they mean to the rest of the system."
              onAdd={() => patch((x) => { x.outputs.push({ key: "", label: "", role: "none" }); })}
            >
              {d.outputs.map((out, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1.1fr auto auto", gap: 8, alignItems: "center" }}>
                  <select value={out.key} onChange={(e) => patch((x) => { x.outputs[i].key = e.target.value; })} style={monoInput}>
                    <option value="">— pick —</option>
                    {[...d.inputs, ...d.steps].map((r) => <option key={r.key} value={r.key}>{r.key}</option>)}
                  </select>
                  <input value={out.label} onChange={(e) => patch((x) => { x.outputs[i].label = e.target.value; })}
                    placeholder="Label" style={input}/>
                  <select value={out.role ?? "none"} onChange={(e) => patch((x) => { x.outputs[i].role = e.target.value as OutputRole; })} style={input}>
                    {(Object.keys(ROLE_LABELS) as OutputRole[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  <button title="Show as the headline number" onClick={() => patch((x) => {
                    x.outputs.forEach((o, j) => { o.primary = j === i ? !o.primary : false; });
                  })} style={{ ...btn(), padding: "7px 10px", fontSize: 11, color: out.primary ? "#fbbf24" : "rgba(255,255,255,.35)" }}>★</button>
                  <button onClick={() => patch((x) => { x.outputs.splice(i, 1); })}
                    style={{ ...btn("danger"), padding: "7px 9px", fontSize: 11 }}>✕</button>
                </div>
              ))}
            </Section>

            {err && (
              <div style={{ padding: "11px 14px", borderRadius: 10, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.28)", color: "#f87171", fontSize: 13 }}>
                {err}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={save} disabled={saving} style={{ ...btn("primary"), opacity: saving ? .6 : 1 }}>
                {saving ? "Saving…" : editing.id ? "Save new version" : "Create formula"}
              </button>
              <button onClick={() => { setEditing(null); setErr(""); }} style={btn()}>Cancel</button>
            </div>
          </div>

          {/* ── Right: live preview + function reference ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ ...label, marginBottom: 12 }}>Live result</div>
              {preview?.ok === false && (
                <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>{preview.error}</div>
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

            <details style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <summary style={{ ...label, marginBottom: 0, cursor: "pointer" }}>Functions you can use</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 14 }}>
                {FUNCTIONS.filter((f) => f.name !== "convert" || true).map((f) => (
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

function Section({ title, hint, onAdd, children }: {
  title: string; hint: string; onAdd: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{hint}</div>
        </div>
        <button onClick={onAdd} style={{ ...btn(), padding: "7px 12px", fontSize: 12 }}>+ Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
    </div>
  );
}
