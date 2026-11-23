"use client";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";

export const ui = {
  page: { minHeight: "100vh", color: "var(--ink-solid, #fff)", fontFamily: "'Outfit','Inter',sans-serif", padding: "clamp(16px,3vw,32px)" } as CSSProperties,
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 24 } as CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, margin: 0 } as CSSProperties,
  sub: { fontSize: 13, color: "rgba(var(--ink),.5)", marginTop: 4 } as CSSProperties,
  card: { background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.08)", borderRadius: 14, padding: 20 } as CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 } as CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: "rgba(var(--ink),.55)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 6, display: "block" } as CSSProperties,
  input: { background: "rgba(var(--ink),.04)", border: "1px solid rgba(var(--ink),.14)", borderRadius: 10, padding: "10px 12px", color: "var(--ink-solid, #fff)", fontSize: 14, outline: "none", boxSizing: "border-box", width: "100%", height: 42 } as CSSProperties,
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
  SUBMITTED: "#0284c7", REVIEW: "#ca8a04", ACCEPTED: "#16a34a", REJECTED: "#dc2626", WAITLISTED: "#7c3aed",
  PRESENT: "#16a34a", ABSENT: "#dc2626", LATE: "#ca8a04", LEAVE: "#0284c7", PASS: "#16a34a", FAIL: "#dc2626",
};
export function Badge({ value }: { value: string }) {
  return <span style={{ background: BADGE[value] ?? "#64748b", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{value.replace("_", " ")}</span>;
}

export function Modal({ title, subtitle, onClose, children, footer, width = 520 }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,10,20,.6)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--dk-1a1d2e, #1a1d2e)", border: "1px solid rgba(var(--ink),.12)", borderRadius: 18, width: `min(${width}px,100%)`, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,.45)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px 16px", borderBottom: "1px solid rgba(var(--ink),.08)" }}>
          <div><div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>{subtitle && <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.5)", marginTop: 3 }}>{subtitle}</div>}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(var(--ink),.07)", border: "none", color: "inherit", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(var(--ink),.08)", display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</div>}
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

/** Round student photo, falling back to initials. */
export function Avatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const box: CSSProperties = { width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "rgba(99,102,241,.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, overflow: "hidden" };
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={name} style={{ ...box, objectFit: "cover" }} /> : <span style={box}>{initials || "?"}</span>;
}

/** Uploads a student photo; returns the new URL or an error. */
export async function uploadStudentPhoto(studentId: string, file: File): Promise<{ url?: string; error?: string }> {
  const body = new FormData();
  body.set("studentId", studentId);
  body.set("photo", file);
  try {
    const res = await fetch("/api/school/students/photo", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { url: json.photoUrl } : { error: json.error || "Upload failed" };
  } catch {
    return { error: "Network error" };
  }
}

/** Photo chooser with preview and a Remove button, for forms where the file is uploaded after save. */
export function PhotoPicker({ file, name, onChange, onError, label = "Student photo" }: { file: File | null; name: string; onChange: (f: File | null) => void; onError: (m: string) => void; label?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      queueMicrotask(() => setPreview(null));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 14, border: "1px dashed rgba(var(--ink),.2)", borderRadius: 14, background: "rgba(var(--ink),.03)" }}>
      <Avatar url={preview} name={name || "Student"} size={76} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "rgba(var(--ink),.5)", marginBottom: 10 }}>JPG, PNG or WebP · up to 2MB · optional</div>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ ...ui.ghost, display: "inline-block", cursor: "pointer" }}>
            {file ? "Change photo" : "Choose photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (f && f.size > 2 * 1024 * 1024) return onError("Photo must be under 2MB");
              onChange(f);
            }} />
          </label>
          {file && <button type="button" style={{ ...ui.ghost, color: "#f87171" }} onClick={() => onChange(null)}>Remove</button>}
        </div>
      </div>
    </div>
  );
}

/** A short "how this page works" card, so a new user is never left guessing. */
export function Guide({ title, steps, note }: { title: string; steps: string[]; note?: string }) {
  return (
    <div style={{ ...ui.card, marginBottom: 20, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.25)" }}>
      <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}><span>💡</span>{title}</div>
      <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, lineHeight: 1.7, color: "rgba(var(--ink),.8)", listStyleType: "decimal" }}>{steps.map((st) => <li key={st} style={{ display: "list-item", listStyleType: "decimal" }}>{st}</li>)}</ol>
      {note && <div style={{ fontSize: 12.5, marginTop: 10, color: "rgba(var(--ink),.55)" }}>{note}</div>}
    </div>
  );
}

/** Numbered step heading used on guided pages. */
export function StepTitle({ n, title, hint, done }: { n: number; title: string; hint?: string; done?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
      <span style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#16a34a" : "#6366f1", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{done ? "✓" : n}</span>
      <div><div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>{hint && <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.5)" }}>{hint}</div>}</div>
    </div>
  );
}

/** Uploads a teacher photo; returns the new URL or an error. */
export async function uploadTeacherPhoto(teacherId: string, file: File): Promise<{ url?: string; error?: string }> {
  const body = new FormData();
  body.set("teacherId", teacherId);
  body.set("photo", file);
  try {
    const res = await fetch("/api/school/teachers/photo", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { url: json.photoUrl } : { error: json.error || "Upload failed" };
  } catch {
    return { error: "Network error" };
  }
}

/** Titled group of form fields in a responsive grid. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13, margin: "10px 0 14px", display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 4, height: 16, borderRadius: 2, background: "#6366f1" }} />{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0 14px" }}>{children}</div>
    </div>
  );
}

export type PlanUsageData = { planLabel: string; limit: number | null; active: number; remaining: number | null; percent: number | null };

/** How many of the plan's student seats are in use; turns amber near the limit and red when full. */
export function PlanUsage({ compact = false }: { compact?: boolean }) {
  const { data: u } = useApi<PlanUsageData | null>("/api/school/limits", null);
  if (!u) return null;
  const full = u.limit !== null && u.active >= u.limit;
  const near = !full && u.percent !== null && u.percent >= 90;
  if (compact && !full && !near) return null;
  const tone = full ? "#dc2626" : near ? "#d97706" : "#6366f1";
  return (
    <div style={{ ...ui.card, marginBottom: 18, borderColor: full || near ? `${tone}66` : undefined, background: full || near ? `${tone}14` : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: u.limit !== null ? 8 : 0 }}>
        <div style={{ fontWeight: 700 }}>
          {u.planLabel} plan · {u.active} active student{u.active === 1 ? "" : "s"}{u.limit !== null ? ` of ${u.limit}` : " (no fixed limit)"}
        </div>
        {(full || near) && <a href="/dashboard/billing" style={{ color: tone, fontWeight: 700, fontSize: 13 }}>Upgrade plan →</a>}
      </div>
      {u.limit !== null && <div style={{ height: 8, borderRadius: 6, background: "rgba(var(--ink),.1)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, u.percent ?? 0)}%`, height: "100%", background: tone }} /></div>}
      {full && <div style={{ fontSize: 12.5, marginTop: 8 }}>You have reached your student limit — new admissions are blocked until you upgrade or mark students who have left.</div>}
      {near && <div style={{ fontSize: 12.5, marginTop: 8 }}>Only {u.remaining} seat{u.remaining === 1 ? "" : "s"} left on your plan.</div>}
      {!compact && !full && !near && u.limit !== null && <div style={{ fontSize: 12.5, marginTop: 8, opacity: 0.6 }}>Students who have left, graduated or are still applicants do not use a seat.</div>}
    </div>
  );
}

// ── Printing ──────────────────────────────────────────────────────────────────
// window.print() on a normal page prints the whole app: sidebar, header, buttons. A page that wants a clean
// printout renders its document inside <PrintDoc>: hidden on screen, and — because the app's print stylesheet
// shows only `.print-doc-a4` — the only thing that reaches the paper. Black on white, borders instead of
// background fills (browsers drop backgrounds unless "Print backgrounds" is ticked).

export const printTh: CSSProperties = { border: "1px solid #444", padding: "5px 7px", textAlign: "left", fontSize: 11, background: "#fff", fontWeight: 700 };
export const printTd: CSSProperties = { border: "1px solid #bbb", padding: "5px 7px", fontSize: 11.5 };

type PrintSchool = { name: string; logoUrl: string | null; address: string; city: string; phone: string };

export function PrintDoc({ title, subtitle, landscape = false, children }: { title: string; subtitle?: string; landscape?: boolean; children: ReactNode }) {
  const { data: school } = useApi<PrintSchool | null>("/api/school/settings", null);
  const line = school ? [school.address, school.city, school.phone].filter(Boolean).join(" · ") : "";
  return (
    <>
      <style>{`@media screen { .school-print-only { display: none !important; } } @media print { @page { size: ${landscape ? "A4 landscape" : "A4 portrait"}; margin: 12mm; } .school-print-only { display: block !important; } }`}</style>
      <div className="print-doc-a4 school-print-only" style={{ background: "#fff", color: "#111", fontFamily: "Arial, Helvetica, sans-serif", fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #111", paddingBottom: 8, marginBottom: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {school?.logoUrl && <img src={school.logoUrl} alt="" style={{ height: 52, width: "auto", objectFit: "contain" }} />}
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{school?.name ?? ""}</div>
            {line && <div style={{ fontSize: 11 }}>{line}</div>}
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", textDecoration: "underline" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {children}
        <div style={{ marginTop: 18, fontSize: 9.5, color: "#555", borderTop: "1px solid #bbb", paddingTop: 4 }}>Printed on {new Date().toLocaleDateString("en-GB")}</div>
      </div>
    </>
  );
}

/** Two-column grid of label / value pairs for a printed document. */
export function PrintFacts({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
      <tbody>
        {Array.from({ length: Math.ceil(rows.length / 2) }, (_, i) => rows.slice(i * 2, i * 2 + 2)).map((pair, i) => (
          <tr key={i}>
            {pair.map(([k, v]) => [<td key={k + "k"} style={{ ...printTd, width: "17%", fontWeight: 700 }}>{k}</td>, <td key={k + "v"} style={{ ...printTd, width: "33%" }}>{v}</td>])}
            {pair.length === 1 && <><td style={printTd} /><td style={printTd} /></>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function PrintSignatures({ labels }: { labels: string[] }) {
  return <div style={{ display: "flex", justifyContent: "space-between", marginTop: 46, gap: 20 }}>{labels.map((l) => <div key={l} style={{ borderTop: "1px solid #111", paddingTop: 4, fontSize: 11, textAlign: "center", flex: 1 }}>{l}</div>)}</div>;
}
