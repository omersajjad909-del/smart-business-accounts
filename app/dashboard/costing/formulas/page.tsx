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
  inputVisible,
  applyProfit,
  toProfit,
  NO_PROFIT,
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

/* A block of inputs under one heading — a divider, not a second card inside
   the first one, so fifteen boxes read as three short lists. */
const groupBlock: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,.07)", borderRadius: 12,
  padding: "11px 12px 12px", background: "rgba(255,255,255,.015)",
};
const groupHeadRow: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9,
};
const groupTitle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, letterSpacing: ".04em",
  color: "rgba(255,255,255,.62)", display: "flex", alignItems: "center",
};
const countPill: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
  background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`,
  color: "rgba(255,255,255,.45)",
};
/** Sentinel option value — a section name nobody can type by accident. */
const NEW_SECTION = "\u0000new";

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
/* Detailed adds a Section column in front, because a row that cannot be moved
   out of its block is a block you can only fix by retyping the formula. */
.fxIn{display:grid;grid-template-columns:.9fr .95fr 1.2fr .55fr .85fr .95fr auto auto;gap:8px;align-items:center}
/* One column wider, used only once a formula actually has a choice on it —
   most never do, and a permanently empty "Only when" column would cost every
   other formula a column of nothing. */
.fxInW{display:grid;grid-template-columns:.8fr .8fr 1fr .5fr .8fr .85fr .95fr auto auto;gap:7px;align-items:center}
.fxOut{display:grid;grid-template-columns:1.05fr 1.3fr .6fr 1.1fr auto auto;gap:8px;align-items:center}
.fxStep{display:grid;grid-template-columns:1.05fr 1.3fr .6fr auto;gap:8px;align-items:center}
.fxProfit{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;align-items:center;max-width:330px}
/* Simple rows go two to a line, the way the run screen asks for the job —
   twelve inputs stacked one per line is a page you scroll rather than read.
   Both halves are the same 1fr of the same container and carry the same inner
   template, so the header above them lines up without needing subgrid.
   Detailed stays one per line: seven columns will not halve. */
.fxRows{display:flex;flex-direction:column;gap:9px}
.fxPairs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 14px;align-items:start}
.fxPairsHead{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 14px}
.fxHead{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:rgba(255,255,255,.32);padding:0 2px 3px}
.fxFormulaTitle{flex:1 1 220px;min-width:220px;word-break:normal;overflow-wrap:anywhere}
.fxFormulaActions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
/* Two columns: the live result belongs in the sticky side rail. */
.fxLiveMobile{display:none}
/* Below this a half-row cannot hold a name, a unit and a number without
   squeezing all three, so the pairs go back to one per line. */
@media(max-width:900px){
  .fxPairs{grid-template-columns:1fr}
  .fxPairsHead{grid-template-columns:1fr}
  .fxPairSecond{display:none}
}
@media(max-width:1080px){
  .fxCols{grid-template-columns:1fr}
  .fxSide{position:static}
  /* One column: the side rail now sits below everything, so the result moves
     up under Inputs and the rail's copy stands down. */
  .fxLiveMobile{display:block}
  .fxLiveDesk{display:none}
}
/* Under 768px the dashboard's own topbar is sticky against the window, so the
   action bar parks below it instead of covering it. */
@media(max-width:767px){
  .fxIn,.fxInW,.fxOut,.fxStep,.fxInS,.fxOutS{grid-template-columns:1fr 1fr}
  .fxHeadRow{display:none}
  .fxBar{top:52px;z-index:9}
  .fxFormulaCard{align-items:stretch!important}
  .fxFormulaTitle{flex-basis:100%!important;min-width:0!important;width:100%!important;word-break:normal!important}
  .fxFormulaActions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
  .fxFormulaActions>*{width:100%;text-align:center}
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
    profit: { ...NO_PROFIT },
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
    profit: toProfit(d.profit),
  };
}

/* Simple-mode column labels. Written as functions rather than constants
   because two-up draws them twice, once over each half, and React wants two
   elements rather than the same one in two places. */
const inputHeadCells = () => (
  <>
    <div className="fxHead">Name</div>
    <div className="fxHead">Unit</div>
    <div className="fxHead">Value</div>
    <div />
  </>
);

/* The header above a block of inputs. Drawn once per block rather than once
   per section, because the blocks are what an author is actually reading. */
const inputHead = (detailed: boolean, hasChoice: boolean) => detailed ? (
  <div className={`${hasChoice ? "fxInW" : "fxIn"} fxHeadRow`}>
    <div className="fxHead">Section</div>
    <div className="fxHead">Key (used in steps)</div>
    <div className="fxHead">Shown as</div>
    <div className="fxHead">Unit</div>
    <div className="fxHead">Type</div>
    <div className="fxHead">Value</div>
    {hasChoice && <div className="fxHead">Only when</div>}
    <div className="fxHead">Ask</div>
    <div />
  </div>
) : (
  <div className="fxPairsHead fxHeadRow">
    <div className="fxInS">{inputHeadCells()}</div>
    <div className="fxInS fxPairSecond">{inputHeadCells()}</div>
  </div>
);
const NO_SECTION = "Other details";
/** Sentinel for the "Only when" picker's unconditional entry. */
const ALWAYS = "\u0000always";

const outputHeadCells = () => (
  <>
    <div className="fxHead">Value</div>
    <div className="fxHead">Shown as</div>
    <div className="fxHead">Main</div>
    <div />
  </>
);

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
  // The two reference cards on the right open on demand — an author reads them
  // once and then wants the live result at the top of the rail, not below a
  // wall of chips. Values re-opens itself the moment a formula box is clicked,
  // which is the only time its chips can do anything.
  const [valuesOpen, setValuesOpen] = useState(false);
  const [funcsOpen, setFuncsOpen] = useState(false);

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

  /* Worked examples. The one belonging to the category you are standing in
     leads; the rest fold away below it. Picking one opens it as a brand-new
     formula — the template itself is never touched. */
  const ownTemplates = FORMULA_TEMPLATES.filter((t) => !category || t.category === category);
  const otherTemplates = category ? FORMULA_TEMPLATES.filter((t) => t.category !== category) : [];

  const templateCard = (t: (typeof FORMULA_TEMPLATES)[number]) => (
    <button key={t.templateId}
      onClick={() => setEditing({ id: null, draft: { ...structuredClone(t), name: t.name, profit: toProfit(t.profit) } })}
      style={{ ...btn(), display: "block", textAlign: "left", padding: "13px 15px", lineHeight: 1.5 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3 }}>{t.name}</div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", fontWeight: 400 }}>{t.summary}</div>
    </button>
  );

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

    // A choice with one option is a box that cannot be chosen, and every step
    // reading it is testing a condition that can only go one way.
    const thinChoice = d.inputs.find((i) => i.options && i.options.filter((o) => o.trim()).length < 2);
    if (thinChoice) {
      setErr(`"${thinChoice.label || thinChoice.key}" is a Choice but has fewer than two options — type them like Button, Tape, or set it back to Number.`);
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
          profit: d.profit ?? NO_PROFIT,
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

    /* Inputs are read in blocks, not as one column of fifteen identical boxes:
       what the bag is, what it is cut from, how many are wanted. The blocks are
       each input's `group`, in the order the groups first appear — so an author
       reorders the sections by reordering the rows, and a formula with no
       groups at all draws one unlabelled block, which is the old layout
       unchanged. Hidden inputs leave the blocks entirely and wait under
       Advanced. */
    type InputRow = { inp: FormulaInput; i: number };
    const inputGroups: { name: string; rows: InputRow[] }[] = [];
    d.inputs.forEach((inp, i) => {
      /* Simple is a preview of the run screen, so it shows the branch the
         formula currently opens on and nothing else — six boxes for a bag that
         can only take three is the thing this view exists to avoid. Detailed
         keeps every branch on screen, because that is where they are written. */
      if (!detailed && !inputVisible(inp, preview?.values ?? {})) return;
      const name = (inp.group ?? "").trim();
      const bucket = inputGroups.find((g) => g.name === name);
      if (bucket) bucket.rows.push({ inp, i });
      else inputGroups.push({ name, rows: [{ inp, i }] });
    });
    // One unnamed block is a formula that was never sectioned — leave its
    // header off rather than inventing a heading it did not ask for.
    const sectioned = inputGroups.some((g) => g.name);
    const sectionNames = [...new Set(d.inputs.map((r) => (r.group ?? "").trim()).filter(Boolean))];
    // Choices drive the "Only when" column, which is not drawn without one.
    const choiceInputs = d.inputs.filter((r) => r.options?.length && r.key);
    const hasChoice = choiceInputs.length > 0;

    /* A new row lands at the bottom of the block its + Add belongs to — pushed
       onto the array carrying that group, which is the same thing. */
    const addInput = (group: string) => patch((x) => {
      x.inputs.push({
        key: `input${x.inputs.length + 1}`, label: "", defaultValue: 0, askOnRun: true,
        ...(group ? { group } : {}),
      });
    });

    const renameSection = (from: string, to: string) => patch((x) => {
      x.inputs.forEach((r) => { if ((r.group ?? "").trim() === from) r.group = to; });
    });

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

    /* One input row, drawn the same wherever it lands — inside a section block
       or inside the Advanced fold. Lifted out of the map so both can use it. */
    const inputRow = ({ inp, i }: InputRow) => {
      const badList = !!inp.isList && !(inp.listValue ?? []).length;
      const badChoice = !!inp.options && (inp.options.filter((o) => o.trim()).length < 2);

      const valueCell = inp.options ? (
        /* The options themselves, typed as a list. The first one is what the
           formula opens on — an author sets the default by putting it first,
           which is one fewer box than a separate "default" field and cannot
           drift out of step with the options. */
        <input value={inp.options.join(", ")}
          onChange={(e) => patch((x) => {
            x.inputs[i].options = e.target.value.split(",").map((o) => o.trim());
            x.inputs[i].defaultValue = 0;
          })}
          placeholder="Button, Tape"
          title="Comma-separated. The first one is the default."
          style={{ ...input, borderColor: badChoice ? "rgba(251,191,36,.55)" : BORDER }}/>
      ) : inp.isList ? (
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
        /* A choice shows as the choice, not as its option list — picking here
           sets which option the formula opens on, and the boxes below follow
           it straight away so an author sees what each branch really asks for.
           The option names themselves are renamed in Detailed. */
        const simpleValue = inp.options?.length ? (
          <select
            value={String(inp.defaultValue ?? 0)}
            onChange={(e) => patch((x) => { x.inputs[i].defaultValue = Number(e.target.value); })}
            style={{ ...input, cursor: "pointer", color: "#fbbf24" }}
            title="Which option the formula opens on. The boxes underneath change with it."
          >
            {inp.options.map((o, oi) => <option key={oi} value={oi}>{o}</option>)}
          </select>
        ) : valueCell;

        return (
          <div className="fxInS" key={i}>
            <input value={inp.label} onChange={(e) => setInputLabel(i, e.target.value)}
              placeholder="Width" style={input}/>
            {/* A choice has no unit — leaving an editable box there only
                invites one to be typed in. */}
            {inp.options?.length ? <div /> : (
              <input value={inp.unit ?? ""} onChange={(e) => patch((x) => { x.inputs[i].unit = e.target.value; })}
                placeholder="in" style={input}/>
            )}
            {simpleValue}
            {removeBtn}
          </div>
        );
      }

      return (
        <div className={hasChoice ? "fxInW" : "fxIn"} key={i}>
          {/* A picker, not a text box: a heading retyped row by row is how one
              section quietly becomes two that read the same. */}
          <select
            value={(inp.group ?? "").trim()}
            onChange={(e) => {
              const picked = e.target.value;
              if (picked === NEW_SECTION) {
                const name = window.prompt("Name the new section", "")?.trim();
                if (name) patch((x) => { x.inputs[i].group = name; });
                return;
              }
              patch((x) => { x.inputs[i].group = picked; });
            }}
            style={input}
            title="Which block this input is shown in. Display only — it never changes the maths."
          >
            <option value="">{NO_SECTION}</option>
            {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value={NEW_SECTION}>+ New section…</option>
          </select>
          <input value={inp.key} onChange={(e) => patch((x) => { x.inputs[i].key = e.target.value; })}
            placeholder="pieceWidth" style={monoInput}/>
          <input value={inp.label} onChange={(e) => setInputLabel(i, e.target.value)}
            placeholder="Width" style={input}/>
          <input value={inp.unit ?? ""} onChange={(e) => patch((x) => { x.inputs[i].unit = e.target.value; })}
            placeholder="in" style={input}/>
          {/* Was a bare "[ ]" toggle. A named choice, because getting this
              wrong hands a list to a step that wants a number. */}
          <select
            value={inp.options ? "choice" : inp.isList ? "list" : "number"}
            onChange={(e) => patch((x) => {
              const row = x.inputs[i];
              const kind = e.target.value;
              row.isList = kind === "list";
              if (kind === "list" && !row.listValue) row.listValue = [];
              if (kind === "choice") {
                if (!row.options) row.options = ["Button", "Tape"];
                row.defaultValue = 0;
                row.unit = "";
              } else {
                delete row.options;
                // Anything that was only shown for one branch of this choice
                // has lost the thing it was reading.
                x.inputs.forEach((r) => { if (r.showWhen?.key === row.key) delete r.showWhen; });
              }
            })}
            style={{ ...input, color: inp.options ? "#fbbf24" : inp.isList ? "#a5b4fc" : "white" }}
            title="Number = one value. List = several stock sizes to pick between. Choice = one option or the other, and other boxes can follow it."
          >
            <option value="number">Number</option>
            <option value="list">List</option>
            <option value="choice">Choice</option>
          </select>
          {valueCell}
          {/* Only drawn once something on the formula is a choice — see fxInW. */}
          {hasChoice && (
            <select
              value={inp.showWhen ? `${inp.showWhen.key}:${inp.showWhen.is}` : ALWAYS}
              onChange={(e) => patch((x) => {
                if (e.target.value === ALWAYS) { delete x.inputs[i].showWhen; return; }
                const [key, at] = e.target.value.split(":");
                x.inputs[i].showWhen = { key, is: Number(at) };
              })}
              style={{ ...input, color: inp.showWhen ? "#fbbf24" : "rgba(255,255,255,.5)" }}
              title="Leave on Always unless this box belongs to one branch of a choice. The steps still have to zero the other branch out with if()."
            >
              <option value={ALWAYS}>Always</option>
              {choiceInputs.flatMap((c) =>
                (c.options ?? []).map((o, oi) => (
                  <option key={`${c.key}:${oi}`} value={`${c.key}:${oi}`}>
                    {(c.label || c.key)} = {o}
                  </option>
                )),
              )}
            </select>
          )}
          <button
            title={inp.askOnRun === false
              ? "Set here — sits under Settings when the formula runs. Click to have the operator asked."
              : "The operator is asked for this on every run. Click to fix it here instead."}
            onClick={() => patch((x) => { x.inputs[i].askOnRun = x.inputs[i].askOnRun === false; })}
            style={{ ...iconBtn, padding: "8px 9px", fontSize: 11,
              color: inp.askOnRun === false ? "rgba(255,255,255,.42)" : "#34d399" }}>
            {inp.askOnRun === false ? "Fixed" : "Ask"}
          </button>
          {removeBtn}
        </div>
      );
    };

    /* Profit lands on the starred output — the one number the formula is
       really for. Same rule the run screen uses, so what an author previews is
       what an operator gets. */
    const primaryOut = d.outputs.find((o) => o.primary && o.key) ?? d.outputs.find((o) => o.key);
    const baseRate = typeof preview?.values[primaryOut?.key ?? ""] === "number"
      ? (preview!.values[primaryOut!.key] as number)
      : null;
    const { amount: profitAmount, total: saleRate } = applyProfit(baseRate, d.profit);

    /* Written once, hung in two places. On a wide screen it rides in the
       sticky right column; once the columns stack it would land at the very
       bottom, a scroll away from the numbers that change it — so on narrow
       screens it sits directly under Inputs instead. CSS picks which copy
       shows. */
    const liveResultCard = (
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

        {/* Cost, then what goes on top of it, then what the customer pays.
            Shown only once there is a profit to show — a cost-only formula
            should not grow a second copy of its own total. */}
        {saleRate != null && profitAmount !== 0 && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>
                Profit
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginLeft: 5 }}>
                  {d.profit?.mode === "percent" ? `${fmt(d.profit?.value)}%` : `Rs ${fmt(d.profit?.value)} flat`}
                </span>
              </span>
              <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>
                + {fmt(profitAmount)}
              </span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(52,211,153,.09)", border: "1px solid rgba(52,211,153,.25)",
            }}>
              <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Sale rate</span>
              <span style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums", fontSize: 17, fontWeight: 700, color: "#34d399" }}>
                {fmt(saleRate)}<span style={{ fontSize: 10.5, color: "rgba(255,255,255,.3)", marginLeft: 4 }}>{primaryOut?.unit}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    );

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
            style={{
              ...input, width: "auto", minWidth: 150, cursor: "pointer",
              appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
              paddingRight: 30,
              backgroundImage: "linear-gradient(45deg, transparent 50%, rgba(255,255,255,.45) 50%), linear-gradient(135deg, rgba(255,255,255,.45) 50%, transparent 50%)",
              backgroundPosition: "calc(100% - 18px) center, calc(100% - 13px) center",
              backgroundSize: "5px 5px, 5px 5px",
              backgroundRepeat: "no-repeat",
            }}>
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
              onAdd={() => addInput(inputGroups.length ? inputGroups[inputGroups.length - 1].name : "")}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: sectioned ? 12 : 9 }}>
                {inputGroups.map((g, gi) => (
                  <div key={gi} style={sectioned ? groupBlock : undefined}>
                    {sectioned && (
                      <div style={groupHeadRow}>
                        {detailed ? (
                          <input
                            value={g.name}
                            onChange={(e) => renameSection(g.name, e.target.value)}
                            placeholder={NO_SECTION}
                            title="Rename this section — every input in it moves with the name."
                            style={{
                              ...input, width: "auto", flex: "0 1 240px",
                              fontSize: 12, fontWeight: 700, padding: "6px 9px",
                            }}
                          />
                        ) : (
                          <span style={groupTitle}>{g.name || NO_SECTION}</span>
                        )}
                        <button onClick={() => addInput(g.name)}
                          style={{ ...btn(), padding: "5px 11px", fontSize: 11.5, whiteSpace: "nowrap" }}>
                          + Add
                        </button>
                      </div>
                    )}
                    {inputHead(detailed, hasChoice)}
                    <div className={detailed ? "fxRows" : "fxPairs"}>{g.rows.map(inputRow)}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.28)", lineHeight: 1.6, paddingTop: 4 }}>
                {detailed ? (
                  <>
                    <strong style={{ color: "rgba(255,255,255,.45)" }}>Key</strong> is the name your steps
                    type — rename it and every step that used it must be changed too.{" "}
                    <strong style={{ color: "rgba(255,255,255,.45)" }}>Type</strong>: Number is one value,
                    List is several stock sizes for the formula to choose between, Choice is one option or
                    the other — set <strong style={{ color: "rgba(255,255,255,.45)" }}>Only when</strong> on
                    the boxes that belong to each branch, and zero the other branch in the step with{" "}
                    <code style={{ fontFamily: MONO }}>if()</code>.{" "}
                    <strong style={{ color: "rgba(255,255,255,.45)" }}>Ask</strong>: the operator types it on
                    every run — press it for Fixed, which sets it here and tucks it under Settings when the
                    formula runs.
                  </>
                ) : (
                  <>
                    Switch to <strong style={{ color: "rgba(255,255,255,.45)" }}>Detailed</strong> above to rename keys,
                    move a box into another section, turn an input into a list of stock sizes, or stop the
                    operator being asked for it.
                  </>
                )}
              </div>

              {/* Profit. Not a step and not a row above — see FormulaProfit.
                  It sits in Inputs because it is a number an author fills in,
                  but it lands on the finished cost rather than inside it. */}
              <div style={{
                marginTop: 5, padding: "13px 14px", borderRadius: 11,
                background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.22)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Profit</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 2, lineHeight: 1.6, marginBottom: 10 }}>
                  Added on top of the starred output to make the sale rate — Rs 2 a piece, or 15% of cost.
                  This is the formula&rsquo;s usual profit; whoever runs it can still change it for one quote.
                </div>
                <div className="fxProfit">
                  <input
                    type="number" step="any"
                    value={d.profit?.value || ""}
                    onChange={(e) => patch((x) => {
                      x.profit = { mode: x.profit?.mode ?? "percent", value: Number(e.target.value) || 0 };
                    })}
                    placeholder="0"
                    style={monoInput}
                  />
                  <select
                    value={d.profit?.mode ?? "percent"}
                    onChange={(e) => patch((x) => {
                      x.profit = { mode: e.target.value as "amount" | "percent", value: x.profit?.value ?? 0 };
                    })}
                    style={input}
                  >
                    <option value="amount">Rs — flat</option>
                    <option value="percent">% — of cost</option>
                  </select>
                </div>
                {/* The sum spelled out, because "15%" and "Rs 15" look the same
                    in a box and land nowhere near each other on the rate. */}
                <div style={{ fontSize: 12, fontFamily: MONO, marginTop: 9, color: "rgba(255,255,255,.45)" }}>
                  {baseRate == null ? (
                    <span style={{ fontFamily: FONT, color: "rgba(255,255,255,.3)" }}>
                      Star an output under <strong style={{ color: "rgba(255,255,255,.45)" }}>Outputs</strong> to see the sale rate.
                    </span>
                  ) : profitAmount === 0 ? (
                    <span style={{ fontFamily: FONT, color: "rgba(255,255,255,.3)" }}>
                      No profit — the formula quotes {fmt(baseRate)} {primaryOut?.unit ?? ""} at cost.
                    </span>
                  ) : (
                    <>
                      {fmt(baseRate)} + {fmt(profitAmount)} ={" "}
                      <strong style={{ color: "#34d399", fontSize: 13.5 }}>{fmt(saleRate)}</strong>
                      {primaryOut?.unit && <span style={{ color: "rgba(255,255,255,.3)" }}> {primaryOut.unit}</span>}
                    </>
                  )}
                </div>
              </div>
            </Section>

            {/* The stacked-layout home for the live result — see liveResultCard. */}
            <div className="fxLiveMobile">{liveResultCard}</div>

            {/* Steps */}
            <Section
              n={3}
              title="Steps"
              hint="Each step can use the inputs and every step above it. Order matters."
              collapsible
              defaultOpen={false}
              count={d.steps.length}
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
                        // Opening Values here rather than leaving it to the
                        // author: this is the one moment its chips do anything.
                        onFocus={() => { setActiveStep(i); setValuesOpen(true); }}
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
              collapsible
              defaultOpen={false}
              count={d.outputs.length}
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
                <div className="fxPairsHead fxHeadRow">
                  <div className="fxOutS">{outputHeadCells()}</div>
                  <div className="fxOutS fxPairSecond">{outputHeadCells()}</div>
                </div>
              )}
            >
              <div className={detailed ? "fxRows" : "fxPairs"}>
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
              </div>
            </Section>
          </div>

          {/* ── Right: live preview, the keys in scope, function reference ── */}
          <div className="fxSide">
            <div className="fxLiveDesk">{liveResultCard}</div>

            {/* Every name a step is allowed to mention, with what it holds
                right now. Folded by default — an author reads it once, and the
                live result belongs at the top of the rail, not under a wall of
                chips. Clicking a formula box opens it again, which is the only
                moment its chips can do anything. */}
            <Fold
              title="Values you can use"
              count={[...d.inputs, ...d.steps].filter((r) => r.key).length}
              open={valuesOpen}
              onToggle={() => setValuesOpen((o) => !o)}
            >
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
            </Fold>

            <Fold
              title="Functions you can use"
              count={FUNCTIONS.length}
              open={funcsOpen}
              onToggle={() => setFuncsOpen((o) => !o)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 11, maxHeight: 380, overflowY: "auto" }}>
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
            </Fold>
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
      ) : (
        <>
          {visible.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {visible.map(({ record, draft }) => (
                <div key={record.id} className="fxFormulaCard" style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
                  padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                  <div className="fxFormulaTitle">
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{draft.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                      {draft.category} · {draft.inputs.length} inputs · {draft.steps.length} steps · v{draft.version}
                    </div>
                  </div>
                  <div className="fxFormulaActions">
                  <Link href={`/dashboard/costing?formula=${record.id}`} style={{ ...btn(), textDecoration: "none" }}>Run</Link>
                  <button onClick={() => setEditing({ id: record.id, draft })} style={btn()}>Edit</button>
                  {/* A copy opens as a brand-new formula, so the original keeps
                      running untouched while the sizes are changed on the copy. */}
                  <button
                    onClick={() => setEditing({
                      id: null,
                      draft: { ...structuredClone(draft), name: `${draft.name} (copy)`, version: 1 },
                    })}
                    style={btn()}>Duplicate</button>
                  <button onClick={() => { if (confirm(`Delete "${draft.name}"?`)) store.remove(record.id); }}
                    style={btn("danger")}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Always on the page, not only while a category is empty. A trade
              that has one formula usually needs a second one the same week, so
              a category is never capped at the first one written. */}
          <div style={{
            background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 14,
            padding: "22px 20px", marginTop: visible.length ? 22 : 0,
          }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>
              {visible.length ? "Add another formula" : "No formulas here yet"}
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)", margin: "0 0 18px", lineHeight: 1.6 }}>
              Start from a worked example and change it to match your own trade — or start from blank.
              A category holds as many formulas as you need.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
              <button
                onClick={() => setEditing({ id: null, draft: emptyDraft(category || "General") })}
                style={{ ...btn(), display: "block", textAlign: "left", padding: "13px 15px", lineHeight: 1.5 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 3 }}>Blank formula</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", fontWeight: 400 }}>
                  One input, one step, one output. Build it up yourself.
                </div>
              </button>
              {ownTemplates.map(templateCard)}
            </div>

            {/* The other trades stay reachable but folded away, so the category
                you are standing in is what you see first. */}
            {otherTemplates.length > 0 && (
              <details style={{ marginTop: 14 }}>
                <summary style={{ ...label, marginBottom: 0, cursor: "pointer" }}>
                  Examples from other trades ({otherTemplates.length})
                </summary>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10, marginTop: 12 }}>
                  {otherTemplates.map(templateCard)}
                </div>
              </details>
            )}
          </div>
        </>
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

/* A reference card in the side rail that folds away behind its own header,
   the same arrow Steps and Outputs use. Controlled, because Values wants to
   open itself the moment a formula box is clicked. */
function Fold({ title, count, open, onToggle, children }: {
  title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          cursor: "pointer", userSelect: "none", outline: "none",
          marginBottom: open ? 14 : 0,
        }}
      >
        <span style={{ ...label, marginBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {title}
          {typeof count === "number" && <span style={countPill}>{count}</span>}
        </span>
        <span aria-hidden style={{
          width: 26, height: 26, flexShrink: 0, borderRadius: 8, display: "grid", placeItems: "center",
          background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
          color: "rgba(255,255,255,.55)", fontSize: 11, lineHeight: 1,
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform .16s ease",
        }}>▼</span>
      </div>
      {open && children}
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

/* A numbered stage of the editor. The long ones — Steps and Outputs — fold
   away behind their own header so the page opens on what an author starts
   with rather than on a wall of formula boxes; the header is the toggle and
   the arrow says which way it goes. */
function Section({ n, title, hint, onAdd, head, children, collapsible = false, defaultOpen = true, count }: {
  n: number; title: string; hint: string;
  onAdd?: () => void; head?: React.ReactNode; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
  /** Shown as a pill beside the title — how many rows are hidden while closed. */
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const shown = !collapsible || open;
  const toggle = () => setOpen((o) => !o);

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
      <div
        {...(collapsible ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-expanded": open,
          onClick: toggle,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
          },
        } : {})}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
          marginBottom: shown ? 14 : 0,
          cursor: collapsible ? "pointer" : "default",
          userSelect: collapsible ? "none" : "auto",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <span style={{
            width: 24, height: 24, flexShrink: 0, borderRadius: 8, marginTop: 1,
            background: "rgba(99,102,241,.16)", color: "#a5b4fc",
            fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center",
          }}>{n}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {title}
              {collapsible && typeof count === "number" && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                  background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`,
                  color: "rgba(255,255,255,.45)",
                }}>{count}</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{hint}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {onAdd && (
            /* Add on a closed section opens it too — a row added out of sight
               reads as nothing having happened. */
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(true); onAdd(); }}
              style={{ ...btn(), padding: "7px 12px", fontSize: 12, whiteSpace: "nowrap" }}>+ Add</button>
          )}
          {collapsible && (
            <span aria-hidden style={{
              width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
              background: "rgba(255,255,255,.05)", border: `1px solid ${BORDER}`,
              color: "rgba(255,255,255,.55)", fontSize: 11, lineHeight: 1,
              transform: open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform .16s ease",
            }}>▼</span>
          )}
        </div>
      </div>
      {shown && (
        <>
          {head}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{children}</div>
        </>
      )}
    </div>
  );
}
