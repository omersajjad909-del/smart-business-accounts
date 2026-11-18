"use client";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

export const ui = {
  page: { minHeight: "100vh", color: "var(--ink-solid, #fff)", fontFamily: "'Outfit','Inter',sans-serif", padding: "clamp(16px,3vw,32px)" } as CSSProperties,
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 24 } as CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, margin: 0 } as CSSProperties,
  sub: { fontSize: 13, color: "rgba(var(--ink),.5)", marginTop: 4 } as CSSProperties,
  card: { background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.08)", borderRadius: 14, padding: 20 } as CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 } as CSSProperties,
  label: { fontSize: 11, color: "rgba(var(--ink),.5)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6, display: "block" } as CSSProperties,
  input: { background: "rgba(var(--ink),.05)", border: "1px solid rgba(var(--ink),.12)", borderRadius: 8, padding: "9px 11px", color: "var(--ink-solid, #fff)", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%" } as CSSProperties,
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as CSSProperties,
  ghost: { background: "rgba(var(--ink),.07)", color: "var(--ink-solid, #fff)", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" } as CSSProperties,
  th: { padding: "12px 14px", textAlign: "left", fontSize: 11, color: "rgba(var(--ink),.45)", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid rgba(var(--ink),.08)", whiteSpace: "nowrap" } as CSSProperties,
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid rgba(var(--ink),.05)" } as CSSProperties,
};

export const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
export const today = () => new Date().toISOString().slice(0, 10);
export const thisPeriod = () => new Date().toISOString().slice(0, 7);

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; data: T; error: string }> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET", cache: "no-store",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, data: json as T, error: res.ok ? "" : String((json as { error?: string }).error || `Request failed (${res.status})`) };
  } catch {
    return { ok: false, data: {} as T, error: "Network error" };
  }
}

/** Loads a GET endpoint and exposes reload(). */
export function useApi<T>(url: string | null, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    const r = await api<T>(url);
    if (r.ok) { setData(r.data); setError(""); } else setError(r.error);
    setLoading(false);
  }, [url]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div style={ui.card}>
      <span style={ui.label}>{label}</span>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "rgba(var(--ink),.4)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  PAID: "#16a34a", PARTIAL: "#ca8a04", PARTIAL_OVERDUE: "#ea580c", UNPAID: "#64748b", OVERDUE: "#dc2626",
  ACTIVE: "#16a34a", APPLICANT: "#0284c7", LEFT: "#64748b", GRADUATED: "#7c3aed",
  PRESENT: "#16a34a", ABSENT: "#dc2626", LATE: "#ca8a04", LEAVE: "#0284c7", PASS: "#16a34a", FAIL: "#dc2626",
};
export function Badge({ value }: { value: string }) {
  return <span style={{ background: BADGE[value] ?? "#64748b", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{value.replace("_", " ")}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--dk-1a1d2e, #1a1d2e)", border: "1px solid rgba(var(--ink),.12)", borderRadius: 16, padding: 24, width: "min(520px,100%)", maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ marginBottom: 14 }}><span style={ui.label}>{label}</span>{children}</div>;
}

export function ErrorLine({ text }: { text: string }) {
  return text ? <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{text}</div> : null;
}

export type ClassRow = { id: string; name: string; section: string; monthlyFee: number; activeStudents: number };
export const className = (c?: { name: string; section: string } | null) => (c ? `${c.name}${c.section ? ` - ${c.section}` : ""}` : "—");

export function ClassSelect({ classes, value, onChange, allLabel }: { classes: ClassRow[]; value: string; onChange: (v: string) => void; allLabel?: string }) {
  return (
    <select style={{ ...ui.input, width: "auto", minWidth: 160 }} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{allLabel ?? "Select class"}</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{className(c)}</option>)}
    </select>
  );
}
