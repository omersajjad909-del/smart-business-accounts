"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const getTier = (points: number) => {
  if (points >= 10000) return { label: "Platinum", color: "#e5e7eb" };
  if (points >= 5000) return { label: "Gold", color: "#f59e0b" };
  if (points >= 1000) return { label: "Silver", color: "#94a3b8" };
  return { label: "Bronze", color: "#b45309" };
};

export default function LoyaltyPage() {
  const { records, loading, create, update } = useBusinessRecords("loyalty_member");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", points: 0 });
  const [formError, setFormError] = useState("");

  const members = records.map(r => {
    const points = r.amount || 0;
    const tier = getTier(points);
    return {
      id: r.id,
      name: r.title,
      phone: (r.data?.phone as string) || "",
      email: (r.data?.email as string) || "",
      points,
      tier,
      visits: Number(r.data?.visits) || 0,
      status: r.status || "active",
    };
  });

  const totalPoints = members.reduce((a, m) => a + m.points, 0);

  async function save() {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) {
      setFormError("Member name is required.");
      return;
    }
    if (!phone && !email) {
      setFormError("Phone or email me se kam az kam aik field required hai.");
      return;
    }
    if (form.points < 0) {
      setFormError("Starting points cannot be negative.");
      return;
    }
    setFormError("");
    await create({ title: name, status: "active", amount: form.points, data: { phone, email, visits: 0 } });
    setShowModal(false);
    setForm({ name: "", phone: "", email: "", points: 0 });
    setFormError("");
  }

  async function addPoints(id: string, current: number) {
    const pts = Number(prompt("Add points:") || 0);
    if (pts > 0) await update(id, { amount: current + pts });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>⭐ Loyalty Points</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage customer loyalty program</p></div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f59e0b", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Member</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Members", val: members.length, color: "#f59e0b" }, { label: "Total Points", val: totalPoints.toLocaleString(), color: "#818cf8" }, { label: "Gold+", val: members.filter(m => m.tier.label !== "Bronze").length, color: "#f59e0b" }, { label: "Platinum", val: members.filter(m => m.tier.label === "Platinum").length, color: "#e5e7eb" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px" }}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Member", "Phone", "Email", "Points", "Tier", "Visits", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{m.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{m.phone}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{m.email}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700, color: "#f59e0b" }}>{m.points.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ fontWeight: 700, color: m.tier.color }}>{m.tier.label}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{m.visits}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <button onClick={() => addPoints(m.id, m.points)} style={{ padding: "5px 10px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>+ Points</button>
                </td>
              </tr>
            ))}
            {!loading && members.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No loyalty members yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 440, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Member</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Name", "name", "text", "span 2"], ["Phone", "phone", "text", ""], ["Email", "email", "email", ""]].map(([label, key, type, col]) => (
                <div key={key} style={{ gridColumn: col || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Starting Points</label>
                <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f59e0b", border: "none", borderRadius: 8, color: "#0f1117", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Member</button>
              <button onClick={() => { setShowModal(false); setFormError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
