"use client";

// Rate Formula — where a trading company teaches the system how it prices a line.
//
// Some trades do not quote per unit. A PVC roll house quotes
// rate-per-mm × gauge × width × length ÷ 54 and types those dimensions on every
// line; a plain Qty × Rate grid cannot express that. This page is where the
// company defines its own columns, its own expression, and which documents use
// them — then hides the page and never thinks about it again.
//
// Everything here is per company. A company that never opens this page has no
// stored setup, reads back `enabled: false`, and every document in the system
// behaves exactly as it always did.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";
import { clearRateFormulaCache } from "@/hooks/useRateFormula";
import {
  DEFAULT_RATE_FORMULA,
  RATE_FORMULA_DOCS,
  RATE_FORMULA_PRESETS,
  computeRateFromFormula,
  normalizeRateFormula,
  validateRateFormula,
  type RateFormulaField,
  type RateFormulaSettings,
} from "@/lib/rateFormula";
import { validateKey } from "@/lib/formulaEngine";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 13px",
    borderRadius: 8,
    border: `1.5px solid ${BORDER}`,
    background: BG,
    color: TEXT,
    fontFamily: FONT,
    fontSize: 13.5,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    ...extra,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: 700,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

/** One numbered block. The whole page is a checklist, top to bottom. */
function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: PANEL,
        border: `1.5px solid ${BORDER}`,
        borderRadius: 14,
        padding: "18px 20px 20px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: hint ? 4 : 14 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: ACCENT,
            color: "#fff",
            fontSize: 13,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        <h2 style={{ fontSize: 15.5, fontWeight: 800, color: TEXT, margin: 0 }}>{title}</h2>
      </div>
      {hint && (
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px 36px", lineHeight: 1.55 }}>
          {hint}
        </p>
      )}
      <div>{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  note,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  note?: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        cursor: "pointer",
        padding: "10px 12px",
        border: `1.5px solid ${checked ? ACCENT : BORDER}`,
        borderRadius: 10,
        background: checked ? "rgba(99,102,241,.07)" : "transparent",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: ACCENT, marginTop: 1, flexShrink: 0 }}
      />
      <span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: TEXT }}>{label}</span>
        {note && (
          <span style={{ display: "block", fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.5 }}>
            {note}
          </span>
        )}
      </span>
    </label>
  );
}

const blankField = (): RateFormulaField => ({
  key: "",
  label: "",
  unit: "",
  kind: "number",
  defaultValue: 0,
  width: 60,
  affectsRate: true,
  showOnPrint: true,
  required: false,
});

export default function RateFormulaPage() {
  const { isMobile } = useResponsive();
  const user = getCurrentUser();
  const requestHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-user-role": user?.role || "",
      "x-user-id": user?.id || "",
      "x-company-id": user?.companyId || "",
    }),
    [user?.role, user?.id, user?.companyId]
  );

  const [settings, setSettings] = useState<RateFormulaSettings>(DEFAULT_RATE_FORMULA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** Values typed into the step-5 tester. Never saved — this is a scratch pad. */
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [testQty, setTestQty] = useState("1");

  useEffect(() => {
    fetch("/api/company/rate-formula", { headers: requestHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSettings(normalizeRateFormula(d)))
      .catch(() => {})
      .finally(() => setLoading(false));
    // requestHeaders is derived from the session user and does not change while
    // the page is open, so this runs once on mount.
  }, [requestHeaders]);

  const patch = (p: Partial<RateFormulaSettings>) => setSettings((s) => ({ ...s, ...p }));

  const setField = (index: number, p: Partial<RateFormulaField>) =>
    setSettings((s) => ({
      ...s,
      fields: s.fields.map((f, i) => (i === index ? { ...f, ...p } : f)),
    }));

  const moveField = (index: number, delta: number) =>
    setSettings((s) => {
      const target = index + delta;
      if (target < 0 || target >= s.fields.length) return s;
      const fields = [...s.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...s, fields };
    });

  const problems = useMemo(() => validateRateFormula(settings), [settings]);

  /** Per-column key errors, shown inline rather than only blocking the save. */
  const keyErrors = useMemo(() => {
    const seen = new Map<string, number>();
    return settings.fields.map((f, i) => {
      const trimmed = f.key.trim();
      if (!trimmed) return "Key is required";
      const invalid = validateKey(trimmed);
      if (invalid) return invalid;
      const first = seen.get(trimmed);
      if (first !== undefined && first !== i) return "Another column already uses this key";
      if (first === undefined) seen.set(trimmed, i);
      return null;
    });
  }, [settings.fields]);

  const testResult = useMemo(() => {
    if (!settings.expression.trim() || !settings.fields.length) return null;
    return computeRateFromFormula(settings, testValues);
  }, [settings, testValues]);

  const testAmount =
    testResult?.rate != null ? testResult.rate * (Number(testQty) || 0) : null;

  const docsOn = RATE_FORMULA_DOCS.filter((d) => settings.documents[d.key]).length;

  async function save() {
    if (settings.enabled && problems.length) {
      toast.error(problems[0].message);
      return;
    }
    if (keyErrors.some(Boolean)) {
      toast.error("Fix the column keys first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/company/rate-formula", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Could not save");
        return;
      }
      setSettings(normalizeRateFormula(data));
      clearRateFormulaCache();
      toast.success("Saved. Your documents will use this from now on.");
    } catch {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  function loadPreset(id: string) {
    const preset = RATE_FORMULA_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setSettings((s) => ({ ...s, ...preset.settings, fields: preset.settings.fields.map((f) => ({ ...f })) }));
    setTestValues({});
    toast.success(`${preset.name} loaded — change anything you like.`);
  }

  if (loading) {
    return (
      <div style={{ padding: 28, fontFamily: FONT, color: MUTED, fontSize: 14 }}>
        Loading your setup…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, padding: isMobile ? "16px 12px 60px" : "24px 28px 80px", maxWidth: 1000 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "0 0 6px" }}>
            Rate Formula
          </h1>
          <p style={{ fontSize: 13, color: MUTED, margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
            If your rate comes out of a calculation rather than a price list, set it up once here.
            Every document you tick in step 6 will then ask for your columns and work the rate out
            by itself.
          </p>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: `1.5px solid ${BORDER}`,
              background: "transparent",
              color: TEXT,
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🖨️ Print
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "10px 20px",
              borderRadius: 9,
              border: "none",
              background: ACCENT,
              color: "#fff",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {settings.hidden && (
        <div
          style={{
            background: "rgba(251,191,36,.1)",
            border: "1.5px solid rgba(251,191,36,.35)",
            borderRadius: 10,
            padding: "11px 14px",
            marginBottom: 16,
            fontSize: 12.5,
            color: TEXT,
            lineHeight: 1.55,
          }}
        >
          This page is hidden from your sidebar. It still works at{" "}
          <code style={{ fontSize: 12 }}>/dashboard/rate-formula</code> — bookmark it, or untick the
          hide box in step 1 to bring the link back.
        </div>
      )}

      {/* ── 1 ── */}
      <Step
        n={1}
        title="Turn it on"
        hint="Leave this off and nothing changes anywhere — every document keeps its ordinary Qty × Rate grid."
      >
        <div style={{ display: "grid", gap: 10 }}>
          <Toggle
            checked={settings.enabled}
            onChange={(v) => patch({ enabled: v })}
            label="Use a rate formula in this company"
            note="Only this company. No other account is affected."
          />
          <Toggle
            checked={settings.hidden}
            onChange={(v) => patch({ hidden: v })}
            label="Hide this page from the sidebar once I am done"
            note="The setup keeps working. The link disappears so nobody changes it by accident — the page stays reachable at its own URL."
          />
        </div>
      </Step>

      {/* ── 2 ── */}
      <Step
        n={2}
        title="Name this setup"
        hint="The name appears above your extra columns on screen and on printed documents."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <div style={labelStyle()}>Setup Name</div>
            <input
              style={inp()}
              value={settings.profileName}
              onChange={(e) => patch({ profileName: e.target.value })}
              placeholder="e.g. PVC Roll"
            />
          </div>
          <div>
            <div style={labelStyle()}>Start From An Example</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {RATE_FORMULA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPreset(p.id)}
                  title={p.summary}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${BORDER}`,
                    background: "transparent",
                    color: TEXT,
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Load “{p.name}”
                </button>
              ))}
            </div>
          </div>
        </div>
      </Step>

      {/* ── 3 ── */}
      <Step
        n={3}
        title="Your columns"
        hint="These are the boxes your operator fills on every document line. Give each one a short key — that key is what you use in the formula in step 4."
      >
        {settings.fields.length === 0 && (
          <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px" }}>
            No columns yet. Add one below, or load an example in step 2.
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {settings.fields.map((f, i) => (
            <div
              key={i}
              style={{
                border: `1.5px solid ${keyErrors[i] ? "#f87171" : BORDER}`,
                borderRadius: 11,
                padding: "13px 14px",
                background: BG,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 1fr" : "1.1fr 1fr .8fr .8fr .7fr auto",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <div>
                  <div style={labelStyle()}>Column Heading</div>
                  <input
                    style={inp()}
                    value={f.label}
                    onChange={(e) => setField(i, { label: e.target.value })}
                    placeholder="Gauge"
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Key (used in formula)</div>
                  <input
                    style={inp({ fontFamily: "ui-monospace, monospace", fontSize: 13 })}
                    value={f.key}
                    onChange={(e) => setField(i, { key: e.target.value.trim() })}
                    placeholder="gauge"
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Unit</div>
                  <input
                    style={inp()}
                    value={f.unit}
                    onChange={(e) => setField(i, { unit: e.target.value })}
                    placeholder="in"
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Default</div>
                  <input
                    type="number"
                    style={inp()}
                    value={f.defaultValue}
                    onChange={(e) => setField(i, { defaultValue: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <div style={labelStyle()}>Width (px)</div>
                  <input
                    type="number"
                    style={inp()}
                    value={f.width}
                    onChange={(e) => setField(i, { width: Number(e.target.value) || 60 })}
                  />
                </div>
                <div style={{ display: "flex", gap: 4, paddingBottom: 2 }}>
                  <button
                    onClick={() => moveField(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                    style={{
                      width: 30, height: 34, borderRadius: 7, border: `1.5px solid ${BORDER}`,
                      background: "transparent", color: MUTED, cursor: i === 0 ? "default" : "pointer",
                      opacity: i === 0 ? 0.4 : 1, fontSize: 13,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveField(i, 1)}
                    disabled={i === settings.fields.length - 1}
                    title="Move down"
                    style={{
                      width: 30, height: 34, borderRadius: 7, border: `1.5px solid ${BORDER}`,
                      background: "transparent", color: MUTED,
                      cursor: i === settings.fields.length - 1 ? "default" : "pointer",
                      opacity: i === settings.fields.length - 1 ? 0.4 : 1, fontSize: 13,
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() =>
                      setSettings((s) => ({ ...s, fields: s.fields.filter((_, j) => j !== i) }))
                    }
                    title="Remove column"
                    style={{
                      width: 30, height: 34, borderRadius: 7, border: "1.5px solid rgba(248,113,113,.4)",
                      background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 13,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 11 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TEXT, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={f.affectsRate}
                    onChange={(e) => setField(i, { affectsRate: e.target.checked })}
                    style={{ accentColor: ACCENT }}
                  />
                  Feeds the rate
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TEXT, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={f.showOnPrint}
                    onChange={(e) => setField(i, { showOnPrint: e.target.checked })}
                    style={{ accentColor: ACCENT }}
                  />
                  Show on printed document
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TEXT, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => setField(i, { required: e.target.checked })}
                    style={{ accentColor: ACCENT }}
                  />
                  Must be filled
                </label>
                {keyErrors[i] && (
                  <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>{keyErrors[i]}</span>
                )}
                {!f.affectsRate && !keyErrors[i] && (
                  <span style={{ fontSize: 12, color: MUTED }}>
                    Recorded and printed, but not part of the maths.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setSettings((s) => ({ ...s, fields: [...s.fields, blankField()] }))}
          disabled={settings.fields.length >= 12}
          style={{
            marginTop: 12,
            padding: "9px 16px",
            borderRadius: 8,
            border: `1.5px dashed ${BORDER}`,
            background: "transparent",
            color: settings.fields.length >= 12 ? MUTED : TEXT,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 600,
            cursor: settings.fields.length >= 12 ? "default" : "pointer",
          }}
        >
          + Add column
        </button>
        {settings.fields.length >= 12 && (
          <span style={{ marginLeft: 10, fontSize: 12, color: MUTED }}>
            Twelve is the limit — beyond that a document line stops being readable.
          </span>
        )}
      </Step>

      {/* ── 4 ── */}
      <Step
        n={4}
        title="The formula"
        hint="Write how the rate is worked out, using your keys from step 3. divisor is the fixed number below."
      >
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle()}>Rate =</div>
          <input
            style={inp({
              fontFamily: "ui-monospace, monospace",
              fontSize: 14,
              borderColor: problems.some((p) => p.field === "expression") ? "#f87171" : BORDER,
            })}
            value={settings.expression}
            onChange={(e) => patch({ expression: e.target.value })}
            placeholder="rtmm * gauge * width * length / divisor"
          />
          {problems
            .filter((p) => p.field === "expression")
            .map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: "#f87171", marginTop: 6, fontWeight: 600 }}>
                {p.message}
              </div>
            ))}
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 7, lineHeight: 1.6 }}>
            Available names:{" "}
            <code style={{ fontSize: 11.5 }}>
              {["divisor", ...settings.fields.map((f) => f.key).filter(Boolean)].join(", ") || "divisor"}
            </code>
            <br />
            You can use <code>+ - * / ( )</code> and the functions{" "}
            <code>round, floor, ceil, min, max, abs, pct, addPct, if</code>.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <div>
            <div style={labelStyle()}>Divisor</div>
            <input
              type="number"
              style={inp()}
              value={settings.divisor}
              onChange={(e) => patch({ divisor: Number(e.target.value) || 0 })}
            />
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>
              Defaults to 54. Change it if your trade divides by something else.
            </div>
          </div>
          <div>
            <div style={labelStyle()}>Round Rate To</div>
            <select
              style={inp()}
              value={settings.rateDecimals}
              onChange={(e) => patch({ rateDecimals: Number(e.target.value) })}
            >
              <option value={0}>Whole number (8711)</option>
              <option value={1}>1 decimal (8711.1)</option>
              <option value={2}>2 decimals (8711.11)</option>
            </select>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>
              The rate is rounded first, then Amount = Rate × Qty.
            </div>
          </div>
          <div>
            <div style={labelStyle()}>Manual Override</div>
            <select
              style={inp()}
              value={settings.rateEditable ? "yes" : "no"}
              onChange={(e) => patch({ rateEditable: e.target.value === "yes" })}
            >
              <option value="yes">Operator may overwrite the rate</option>
              <option value="no">Rate is locked to the formula</option>
            </select>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>
              An overwritten rate is kept as typed until the columns change again.
            </div>
          </div>
        </div>
      </Step>

      {/* ── 5 ── */}
      <Step
        n={5}
        title="Try it"
        hint="Type the numbers off one of your real bills and check the rate comes out the same. Nothing here is saved."
      >
        {settings.fields.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Add some columns first.</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "repeat(2, 1fr)"
                  : `repeat(${Math.min(settings.fields.length + 1, 6)}, 1fr)`,
                gap: 10,
                marginBottom: 14,
              }}
            >
              {settings.fields.map((f) => (
                <div key={f.key || f.label}>
                  <div style={labelStyle()}>
                    {f.label || f.key}
                    {f.unit ? ` (${f.unit})` : ""}
                  </div>
                  <input
                    type="number"
                    style={inp()}
                    value={testValues[f.key] ?? ""}
                    onChange={(e) =>
                      setTestValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    placeholder={f.defaultValue ? String(f.defaultValue) : "0"}
                  />
                </div>
              ))}
              <div>
                <div style={labelStyle()}>Qty</div>
                <input
                  type="number"
                  style={inp()}
                  value={testQty}
                  onChange={(e) => setTestQty(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: isMobile ? 16 : 40,
                flexWrap: "wrap",
                padding: "14px 16px",
                borderRadius: 11,
                background: testResult?.ok ? "rgba(99,102,241,.08)" : BG,
                border: `1.5px solid ${testResult?.ok ? "rgba(99,102,241,.3)" : BORDER}`,
              }}
            >
              <div>
                <div style={labelStyle()}>Rate</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: testResult?.ok ? ACCENT : MUTED }}>
                  {testResult?.rate != null ? testResult.rate.toLocaleString() : "—"}
                </div>
              </div>
              <div>
                <div style={labelStyle()}>Amount (Rate × Qty)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>
                  {testAmount != null ? testAmount.toLocaleString() : "—"}
                </div>
              </div>
              {testResult?.error && (
                <div style={{ alignSelf: "center", fontSize: 12.5, color: "#f87171", fontWeight: 600 }}>
                  {testResult.error}
                </div>
              )}
              {!testResult?.error && !testResult?.ok && (
                <div style={{ alignSelf: "center", fontSize: 12.5, color: MUTED }}>
                  Fill every column that feeds the rate.
                </div>
              )}
            </div>
          </>
        )}
      </Step>

      {/* ── 6 ── */}
      <Step
        n={6}
        title="Where it applies"
        hint="Tick only the documents that should ask for these columns. Anything left unticked keeps its ordinary grid."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: 9,
          }}
        >
          {RATE_FORMULA_DOCS.map((d) => (
            <Toggle
              key={d.key}
              checked={settings.documents[d.key]}
              onChange={(v) =>
                patch({ documents: { ...settings.documents, [d.key]: v } })
              }
              label={d.label}
              note={d.note}
            />
          ))}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
          {docsOn === 0
            ? "Nothing ticked yet — the formula will not appear anywhere."
            : `${docsOn} document${docsOn === 1 ? "" : "s"} will use this setup.`}
        </div>
      </Step>

      {/* ── Save bar ── */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          bottom: 0,
          background: PANEL,
          border: `1.5px solid ${BORDER}`,
          borderRadius: 13,
          padding: "13px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 12.5, color: problems.length && settings.enabled ? "#f87171" : MUTED, lineHeight: 1.5 }}>
          {settings.enabled
            ? problems.length
              ? problems[0].message
              : `On — ${docsOn} document${docsOn === 1 ? "" : "s"}, ${settings.fields.length} column${settings.fields.length === 1 ? "" : "s"}.`
            : "Off — every document is behaving normally."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 18px",
              borderRadius: 9,
              border: `1.5px solid ${BORDER}`,
              color: TEXT,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Back
          </Link>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "10px 22px",
              borderRadius: 9,
              border: "none",
              background: ACCENT,
              color: "#fff",
              fontFamily: FONT,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
