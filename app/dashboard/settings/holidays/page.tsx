"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { confirmToast } from "@/lib/toast-feedback";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#a78bfa";

type Holiday = { id: string; date: string; name: string; isRecurring: boolean };

const CARD: React.CSSProperties = {
  background: "var(--card-bg, rgba(255,255,255,.03))",
  border:     "1px solid var(--card-border, rgba(255,255,255,.08))",
  borderRadius: 16, padding: 24, color: "var(--text-primary, #fff)",
};
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 12px", borderRadius: 10,
  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)",
  color: "var(--text-primary,#fff)", fontSize: 13, outline: "none", fontFamily: ff,
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".07em",
  textTransform: "uppercase", color: "var(--text-muted, rgba(255,255,255,.5))",
  marginBottom: 6, display: "block",
};

export default function HolidaysPage() {
  const { isMobile } = useResponsive();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ date: "", name: "", isRecurring: false });
  const [saving, setSaving] = useState(false);
  const currentUser = getCurrentUser() as { role?: string; id?: string } | null;
  const isAdmin = String(currentUser?.role || "").toUpperCase() === "ADMIN";

  const authH = (): Record<string, string> => ({
    "x-user-role": currentUser?.role || "",
    "x-user-id":   currentUser?.id   || "",
  });

  useEffect(() => { load(); }, [year]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/holidays?year=${year}`, { headers: authH(), cache: "no-store" });
      const d = await r.json();
      setHolidays(Array.isArray(d) ? d.map((h: any) => ({
        id: h.id, date: String(h.date).slice(0, 10), name: h.name, isRecurring: !!h.isRecurring,
      })) : []);
    } catch { setHolidays([]); }
    finally { setLoading(false); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.name.trim()) return toast.error("Date and name required");
    setSaving(true);
    try {
      const r = await fetch("/api/holidays", {
        method: "POST",
        headers: { ...authH(), "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      toast.success("Holiday added");
      setForm({ date: "", name: "", isRecurring: false });
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!await confirmToast("Remove this holiday?")) return;
    try {
      await fetch(`/api/holidays?id=${id}`, { method: "DELETE", headers: authH() });
      await load();
    } catch { toast.error("Delete failed"); }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px", fontFamily: ff, display: "flex", flexDirection: "column", gap: 22 }}>
      <header>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Public Holidays</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted, rgba(255,255,255,.5))", margin: "6px 0 0", lineHeight: 1.6 }}>
          Company-wide holiday calendar. Marked dates auto-appear as HOLIDAY on the attendance calendar for every employee — no per-day marking needed. Sundays are always treated as holiday by default.
        </p>
      </header>

      {isAdmin && (
        <section style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Add holiday</div>
          <form onSubmit={add} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={lbl}>Date *</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Name *</label>
              <input type="text" required value={form.name} placeholder="e.g. Independence Day"
                onChange={e => setForm({ ...form, name: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Recurring</label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", fontSize: 12 }}>
                <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} style={{ accentColor: ACCENT }} />
                Every year
              </label>
            </div>
            <button type="submit" disabled={saving} style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: saving ? `${ACCENT}66` : ACCENT, color: "white",
              fontFamily: ff, fontSize: 13, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}>
              {saving ? "Adding…" : "+ Add"}
            </button>
          </form>
        </section>
      )}

      <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Holidays in {year}</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inp, width: 110 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = new Date().getFullYear() - 1 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "var(--text-muted, rgba(255,255,255,.5))", fontSize: 13 }}>Loading…</div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted, rgba(255,255,255,.5))", fontSize: 13 }}>
            No holidays configured for {year}. {isAdmin ? "Add one above." : "Ask your admin to add them."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {holidays.map(h => {
              const d = new Date(h.date + "T00:00:00");
              const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
              const long = d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
              return (
                <div key={h.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, background: `${ACCENT}18`, padding: "3px 10px", borderRadius: 999, letterSpacing: ".04em" }}>
                    {weekday.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, rgba(255,255,255,.5))" }}>{long}</div>
                  </div>
                  {h.isRecurring && (
                    <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(56,189,248,.14)", color: "#38bdf8", fontSize: 10, fontWeight: 700, letterSpacing: ".04em" }}>
                      RECURRING
                    </span>
                  )}
                  {isAdmin && (
                    <button onClick={() => remove(h.id)} style={{
                      padding: "6px 10px", borderRadius: 8,
                      background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                      color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: ff,
                    }}>Remove</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
