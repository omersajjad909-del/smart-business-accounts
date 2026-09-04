"use client";

import { useEffect, useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

type LabourRow = {
  id: string;
  name: string;
  code: string;
  phone: string;
  ratePerUnit: number;
  accountId: string;
  balance: number | null;
};

export default function LabourPage() {
  const { isMobile } = useResponsive();
  const [rows, setRows] = useState<LabourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", ratePer1000: "" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/manufacturing/labour", { cache: "no-store" });
      const list = (await res.json()) as LabourRow[];
      // balanceOnly sums everything dated before `from` — pass tomorrow so
      // "before" covers every voucher posted up to and including today.
      const asOf = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const withBalances = await Promise.all(
        list.map(async (l) => {
          try {
            const bal = await fetch(`/api/reports/ledger?accountId=${l.accountId}&balanceOnly=1&from=${asOf}`, { cache: "no-store" });
            const body = await bal.json();
            return { ...l, balance: Number(body?.balance) || 0 };
          } catch {
            return { ...l, balance: null };
          }
        }),
      );
      setRows(withBalances);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalOwed = useMemo(() => rows.reduce((s, r) => s + (r.balance || 0), 0), [rows]);

  async function save() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/manufacturing/labour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          ratePer1000: Number(form.ratePer1000) || 0,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not add labour.");
      setShowModal(false);
      setForm({ name: "", phone: "", ratePer1000: "" });
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not add labour.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Labour</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            Piece-rate workers. Assign them to a production run and what they're owed posts to their own ledger.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Labour
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Workers", value: rows.length, color: "#f97316" },
          { label: "Owed right now", value: `Rs. ${Math.round(totalOwed).toLocaleString()}`, color: "#f59e0b" },
          { label: "Fully paid", value: rows.filter((r) => (r.balance || 0) <= 0).length, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                {r.code} • {r.phone || "No phone"} • Rs. {(r.ratePerUnit * 1000).toLocaleString()} / 1,000 pcs
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: (r.balance || 0) > 0 ? "#f59e0b" : "#22c55e" }}>
                  Rs. {Math.round(r.balance || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>owed</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={`/dashboard/reports/ledger?accountId=${r.accountId}`} style={{ padding: "7px 14px", background: "rgba(56,189,248,.12)", border: "1px solid rgba(56,189,248,.3)", color: "#38bdf8", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Ledger
                </a>
                <a href="/dashboard/cpv" style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                  Pay →
                </a>
              </div>
            </div>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
            No labour added yet.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 460, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add Labour</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Rate per 1,000 pcs (Rs)</label>
                <input type="number" min={0} step="any" value={form.ratePer1000} onChange={(e) => setForm((c) => ({ ...c, ratePer1000: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(249,115,22,.5)" : "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Add Labour"}
              </button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
