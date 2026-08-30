"use client";

/**
 * Company Pages — the exception screen.
 *
 * /admin/plans decides what a plan grants; this decides what one company gets
 * on top of that. A Starter trading company whose contract included Ledger is
 * switched on here and nowhere else, and every other Starter company is
 * untouched. Each row shows all three facts side by side — what the plan says,
 * what has been overridden, and what the customer actually sees — because an
 * override that silently disagrees with the plan is how these screens usually
 * go wrong.
 */

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { formatCompanyNo } from "@/lib/companyRef";

type OverrideState = "on" | "off" | "default";

type FeatureRow = {
  id: string;
  label: string;
  route: string;
  section: string;
  businessLabel: string;
  core: boolean;
  allowedByPlan: boolean;
  override: OverrideState;
  globallyHidden: boolean;
  effective: boolean;
};

type CompanyLite = { id: string; companyNo: number | null; name: string; plan: string; businessType: string };

type Payload = {
  company: { id: string; companyNo: number | null; name: string; plan: string; businessType: string; isPkrCompany: boolean };
  features: FeatureRow[];
  overrides: { on: string[]; off: string[] };
  planGridSaved: boolean;
};

const FONT = "'Outfit','DM Sans',sans-serif";
const BORDER = "rgba(255,255,255,.1)";
const PANEL = "rgba(255,255,255,.03)";

function headers() {
  const u = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": u?.id || "",
    "x-user-role": u?.role || "",
    "x-company-id": u?.companyId || "",
  };
}

/**
 * Read a response that is supposed to be JSON but might not be.
 *
 * A route that throws returns an empty 500, and calling .json() on that reports
 * "Unexpected end of JSON input" — an error about parsing that tells you
 * nothing about the request that failed. Surfacing the status instead at least
 * names what happened.
 */
async function readJson(r: Response): Promise<any> {
  const text = await r.text();
  if (!text) throw new Error(`Server returned ${r.status} with no message`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 200));
  }
}

const inputStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1.5px solid " + BORDER,
  background: "rgba(255,255,255,.04)",
  color: "white",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

export default function CompanyPagesAdmin() {
  const [companies, setCompanies] = useState<CompanyLite[]>([]);
  const [companyRef, setCompanyRef] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState<"all" | "overridden" | "on" | "off">("all");

  useEffect(() => {
    fetch("/api/admin/companies/all", { headers: headers(), credentials: "include", cache: "no-store" })
      .then(r => (r.ok ? r.json() : { rows: [] }))
      .then(d => setCompanies(Array.isArray(d?.rows) ? d.rows : []))
      .catch(() => setCompanies([]));
  }, []);

  async function load(ref: string) {
    if (!ref) { setData(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/company-page-overrides?companyId=${encodeURIComponent(ref)}`, {
        headers: headers(), credentials: "include", cache: "no-store",
      });
      const j = await readJson(r);
      if (!r.ok) throw new Error(j?.error || "Could not load");
      setData(j);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(companyRef); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [companyRef]);

  async function setState(id: string, state: OverrideState) {
    if (!companyRef) return;
    setBusyId(id);
    try {
      const r = await fetch("/api/admin/company-page-overrides", {
        method: "POST", headers: headers(), credentials: "include",
        body: JSON.stringify({ companyId: companyRef, id, state }),
      });
      const j = await readJson(r);
      if (!r.ok) throw new Error(j?.error || "Could not save");
      await load(companyRef);
      toast.success(state === "default" ? "Back to the plan default" : state === "on" ? "Page switched on" : "Page switched off");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusyId(null);
    }
  }

  async function resetAll() {
    if (!companyRef || !data) return;
    if (!window.confirm(`Drop every page exception for ${data.company.name}? It goes back to exactly what the plan grants.`)) return;
    setBusyId("__reset__");
    try {
      const r = await fetch("/api/admin/company-page-overrides", {
        method: "POST", headers: headers(), credentials: "include",
        body: JSON.stringify({ companyId: companyRef, action: "RESET" }),
      });
      if (!r.ok) throw new Error((await readJson(r))?.error || "Could not reset");
      await load(companyRef);
      toast.success("Exceptions cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reset");
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.features.filter(f => {
      if (only === "overridden" && f.override === "default") return false;
      if (only === "on" && f.override !== "on") return false;
      if (only === "off" && f.override !== "off") return false;
      if (!q) return true;
      return f.label.toLowerCase().includes(q) || f.route.toLowerCase().includes(q) || f.section.toLowerCase().includes(q);
    });
  }, [data, search, only]);

  const grouped = useMemo(() => {
    const map = new Map<string, FeatureRow[]>();
    for (const f of rows) {
      const key = f.section || "Other";
      map.set(key, [...(map.get(key) || []), f]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const counts = data
    ? { on: data.overrides.on.length, off: data.overrides.off.length, visible: data.features.filter(f => f.effective).length, total: data.features.length }
    : null;

  return (
    <div style={{ fontFamily: FONT, color: "white", padding: "0 0 80px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Company Pages</h1>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", margin: "0 0 22px", maxWidth: 720, lineHeight: 1.6 }}>
        Exceptions for one company. The plan still decides the default in <strong style={{ color: "rgba(255,255,255,.7)" }}>Plans → Pages &amp; Modules</strong>;
        anything switched here applies to this company alone and leaves every other company on the same plan untouched.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <select value={companyRef} onChange={e => setCompanyRef(e.target.value)} style={{ ...inputStyle, background: "#0f1628", minWidth: 300, cursor: "pointer" }}>
          <option value="">Select a company…</option>
          {companies.map(c => (
            <option key={c.id} value={String(c.companyNo ?? c.id)}>
              {formatCompanyNo(c.companyNo, c.id)} · {c.name} · {String(c.plan || "").toUpperCase()}
            </option>
          ))}
        </select>
        {data && (
          <button onClick={resetAll} disabled={busyId === "__reset__" || (counts!.on === 0 && counts!.off === 0)}
            style={{ ...inputStyle, cursor: "pointer", borderColor: "rgba(248,113,113,.35)", color: "#f87171", opacity: counts!.on === 0 && counts!.off === 0 ? .4 : 1 }}>
            Clear all exceptions
          </button>
        )}
      </div>

      {loading && <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>Loading…</div>}

      {data && !loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Business type", value: data.company.businessType || "—" },
              { label: "Plan", value: data.company.plan },
              { label: "Pages visible", value: `${counts!.visible} / ${counts!.total}` },
              { label: "Forced on", value: String(counts!.on), color: "#34d399" },
              { label: "Forced off", value: String(counts!.off), color: "#f87171" },
            ].map(t => (
              <div key={t.label} style={{ background: PANEL, border: "1px solid " + BORDER, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>{t.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: t.color || "white" }}>{t.value}</div>
              </div>
            ))}
          </div>

          {!data.planGridSaved && (
            <div style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)", borderRadius: 10, padding: "12px 15px", marginBottom: 18, fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,.75)" }}>
              No page grid has been saved for this plan yet, so every page is open by default. Switching one <strong>off</strong> here
              will pin this company to the pages its business type owns — that is the only way an exception can be expressed
              against an open default.
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search page or route…"
              style={{ ...inputStyle, flex: 1, minWidth: 220 }} />
            {(["all", "overridden", "on", "off"] as const).map(f => (
              <button key={f} onClick={() => setOnly(f)}
                style={{ ...inputStyle, cursor: "pointer", background: only === f ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)", borderColor: only === f ? "#818cf8" : BORDER, color: only === f ? "#a5b4fc" : "rgba(255,255,255,.45)", fontWeight: 700, textTransform: "capitalize" }}>
                {f}
              </button>
            ))}
          </div>

          {grouped.length === 0 && <div style={{ color: "rgba(255,255,255,.35)", fontSize: 13, padding: 20 }}>Nothing matches.</div>}

          {grouped.map(([section, list]) => (
            <div key={section} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 8 }}>
                {section}
              </div>
              <div style={{ border: "1px solid " + BORDER, borderRadius: 12, overflow: "hidden" }}>
                {list.map((f, i) => (
                  <div key={f.id} style={{
                    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                    padding: "11px 14px", background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
                    borderTop: i ? "1px solid rgba(255,255,255,.05)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {f.label}
                        {f.core && <Tag color="#60a5fa">core</Tag>}
                        {f.globallyHidden && <Tag color="#f87171">hidden everywhere</Tag>}
                      </div>
                      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.22)", fontFamily: "monospace", marginTop: 2 }}>{f.route}</div>
                    </div>

                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", minWidth: 92 }}>
                      Plan: <span style={{ color: f.allowedByPlan ? "#34d399" : "#f87171", fontWeight: 700 }}>{f.allowedByPlan ? "on" : "off"}</span>
                    </div>

                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", minWidth: 96 }}>
                      Sees: <span style={{ color: f.effective ? "#34d399" : "rgba(255,255,255,.35)", fontWeight: 700 }}>{f.effective ? "yes" : "no"}</span>
                    </div>

                    <div style={{ display: "flex", gap: 5 }}>
                      {(["on", "default", "off"] as const).map(s => {
                        const active = f.override === s;
                        const tone = s === "on" ? "#34d399" : s === "off" ? "#f87171" : "#818cf8";
                        const disabled = busyId === f.id || (s === "on" && f.globallyHidden);
                        return (
                          <button key={s} onClick={() => setState(f.id, s)} disabled={disabled}
                            title={s === "on" && f.globallyHidden ? "This page is hidden for everyone in Page Visibility" : undefined}
                            style={{
                              padding: "5px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 700, fontFamily: "inherit",
                              cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .35 : 1,
                              border: "1px solid " + (active ? tone : BORDER),
                              background: active ? tone + "26" : "transparent",
                              color: active ? tone : "rgba(255,255,255,.4)",
                            }}>
                            {s === "default" ? "plan" : s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 6px", borderRadius: 5, background: color + "22", color }}>
      {children}
    </span>
  );
}
