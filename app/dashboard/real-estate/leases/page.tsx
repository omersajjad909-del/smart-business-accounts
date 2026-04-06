"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`nimport { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 24px", fontFamily: ff };

export default function LeasesPage() {
  const { records, loading, create, update } = useBusinessRecords("lease");
  const tenantStore = useBusinessRecords("tenant");
  const propertyStore = useBusinessRecords("property");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ tenant: "", property: "", startDate: "", endDate: "", rentAmount: 0, deposit: 0, type: "Residential" });
  const [formError, setFormError] = useState("");

  const today = new Date();
  const leases = records.map(r => {
    const endDate = (r.data?.endDate as string) || "";
    const daysLeft = endDate ? Math.round((new Date(endDate).getTime() - today.getTime()) / 86400000) : 0;
    return {
      id: r.id,
      tenant: r.title,
      property: (r.data?.property as string) || "",
      startDate: (r.data?.startDate as string) || "",
      endDate,
      rentAmount: r.amount || 0,
      deposit: Number(r.data?.deposit) || 0,
      type: (r.data?.type as string) || "Residential",
      status: r.status || "active",
      daysLeft,
    };
  });

  const active = leases.filter(l => l.status === "active").length;
  const expiringSoon = leases.filter(l => l.daysLeft > 0 && l.daysLeft <= 30).length;

  async function save() {
    if (!form.tenant.trim()) return setFormError("Tenant is required.");
    if (!form.property.trim()) return setFormError("Property is required.");
    if (!form.startDate || !form.endDate) return setFormError("Lease dates are required.");
    if (form.endDate < form.startDate) return setFormError("Lease end must be after lease start.");
    if (form.rentAmount <= 0) return setFormError("Monthly rent must be greater than zero.");
    const tenantExists = tenantStore.records.some(record => record.title.toLowerCase() === form.tenant.trim().toLowerCase());
    if (!tenantExists) return setFormError("Create the tenant first.");
    const propertyExists = propertyStore.records.some(record => record.title.toLowerCase() === form.property.trim().toLowerCase());
    if (!propertyExists) return setFormError("Create the property first.");
    const propertyAlreadyLeased = records.some(record => String(record.data?.property || "").toLowerCase() === form.property.trim().toLowerCase() && String(record.status || "") === "active");
    if (propertyAlreadyLeased) return setFormError("This property already has an active lease.");
    setFormError("");
    await create({ title: form.tenant.trim(), status: "active", amount: form.rentAmount, data: { property: form.property.trim(), startDate: form.startDate, endDate: form.endDate, deposit: form.deposit, type: form.type } });
    const propertyRecord = propertyStore.records.find(record => record.title.toLowerCase() === form.property.trim().toLowerCase());
    if (propertyRecord) {
      await propertyStore.update(propertyRecord.id, { status: "rented", data: { tenant: form.tenant.trim(), leaseEnd: form.endDate } });
    }
    setShowModal(false);
    setForm({ tenant: "", property: "", startDate: "", endDate: "", rentAmount: 0, deposit: 0, type: "Residential" });
  }

  async function terminateLease(leaseId: string, propertyName: string) {
    if (!await confirmToast("Terminate this lease?")) return;
    await update(leaseId, { status: "terminated" });
    const propertyRecord = propertyStore.records.find(record => record.title.toLowerCase() === propertyName.toLowerCase());
    if (propertyRecord) {
      await propertyStore.update(propertyRecord.id, { status: "vacant", data: { tenant: "", leaseEnd: "" } });
    }
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>ðŸ“„ Leases</h1><p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage lease agreements</p></div>
        <button onClick={() => { setFormError(""); setShowModal(true); }} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#818cf8,#6366f1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ New Lease</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Leases", val: leases.length, color: "#818cf8" }, { label: "Active", val: active, color: "#34d399" }, { label: "Expiring in 30 Days", val: expiringSoon, color: "#f59e0b" }, { label: "Expired", val: leases.filter(l => l.status === "expired").length, color: "#f87171" }].map(s => (
          <div key={s.label} style={card}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Tenant", "Property", "Type", "Start", "End", "Days Left", "Rent/mo", "Status", "Action"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {leases.map(l => (
              <tr key={l.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{l.tenant}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{l.property}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{l.type}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{l.startDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{l.endDate}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: l.daysLeft < 0 ? "#f87171" : l.daysLeft <= 30 ? "#f59e0b" : "#34d399", fontWeight: 600 }}>{l.daysLeft < 0 ? "Expired" : `${l.daysLeft}d`}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {l.rentAmount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: l.status === "active" ? "#34d39920" : "#6b728020", color: l.status === "active" ? "#34d399" : "#6b7280", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{l.status}</span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  {l.status === "active" && <button onClick={() => void terminateLease(l.id, l.property)} style={{ padding: "5px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Terminate</button>}
                </td>
              </tr>
            ))}
            {!loading && leases.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No leases yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 520, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>New Lease</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Tenant Name", "tenant", "text"], ["Property", "property", "text"], ["Start Date", "startDate", "date"], ["End Date", "endDate", "date"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Residential", "Commercial"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Monthly Rent (Rs.)</label>
                <input type="number" value={form.rentAmount} onChange={e => setForm(f => ({ ...f, rentAmount: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Security Deposit (Rs.)</label>
                <input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Create Lease</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
