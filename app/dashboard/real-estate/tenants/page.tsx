"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const s = {
  page: { minHeight: "100vh", background: "#0f0f13", fontFamily: "'Outfit','Inter',sans-serif", color: "#fff", padding: "32px" } as React.CSSProperties,
  heading: { fontSize: 26, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  sub: { color: "rgba(255,255,255,.45)", fontSize: 13, marginBottom: 28 } as React.CSSProperties,
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 } as React.CSSProperties,
  card: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "20px 24px" } as React.CSSProperties,
  cardLabel: { fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
  cardValue: { fontSize: 28, fontWeight: 700 },
  mainLayout: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 } as React.CSSProperties,
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } as React.CSSProperties,
  sectionTitle: { fontSize: 16, fontWeight: 700 } as React.CSSProperties,
  btn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  tCard: (sel: boolean) => ({ background: sel ? "rgba(99,102,241,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${sel ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`, borderRadius: 14, padding: "18px 20px", marginBottom: 12, cursor: "pointer", transition: "all .2s" }) as React.CSSProperties,
  tTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } as React.CSSProperties,
  tName: { fontSize: 15, fontWeight: 700, marginBottom: 4 } as React.CSSProperties,
  tSub: { fontSize: 12, color: "rgba(255,255,255,.4)" } as React.CSSProperties,
  badge: (color: string) => ({ background: `${color}18`, color, border: `1px solid ${color}40`, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }) as React.CSSProperties,
  tInfo: { display: "flex", gap: 20, marginTop: 12 } as React.CSSProperties,
  infoItem: { fontSize: 12, color: "rgba(255,255,255,.5)" } as React.CSSProperties,
  detailPanel: { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 24, position: "sticky" as const, top: 0 } as React.CSSProperties,
  dpTitle: { fontSize: 16, fontWeight: 700, marginBottom: 20 } as React.CSSProperties,
  dpRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.06)" } as React.CSSProperties,
  dpLabel: { fontSize: 12, color: "rgba(255,255,255,.4)" } as React.CSSProperties,
  dpValue: { fontSize: 13, fontWeight: 600, textAlign: "right" as const, maxWidth: 180 } as React.CSSProperties,
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 },
  modal: { background: "#1a1a24", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: 32, width: 560, maxHeight: "90vh", overflowY: "auto" as const },
  mTitle: { fontSize: 20, fontWeight: 700, marginBottom: 24 } as React.CSSProperties,
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as React.CSSProperties,
  lbl: { fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6, display: "block" } as React.CSSProperties,
  inp: { width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" as const, fontFamily: "'Outfit','Inter',sans-serif" } as React.CSSProperties,
  mBtns: { display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" } as React.CSSProperties,
  cancelBtn: { background: "transparent", color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 22px", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "#10b981" },
  expired: { label: "Expired", color: "#ef4444" },
  notice_given: { label: "Notice Given", color: "#f59e0b" },
};

export default function TenantsPage() {
  const { records, loading, create } = useBusinessRecords("tenant");
  const propertyStore = useBusinessRecords("property");
  const [selected, setSelected] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", cnic: "", property: "", unit: "", rentAmount: "", depositPaid: "", leaseStart: "", leaseEnd: "" });
  const [formError, setFormError] = useState("");

  const tenants = records.map(r => ({
    id: r.id,
    name: r.title,
    phone: (r.data?.phone as string) || "",
    email: (r.data?.email as string) || "",
    cnic: (r.data?.cnic as string) || "",
    property: (r.data?.property as string) || "",
    unit: (r.data?.unit as string) || "",
    rentAmount: r.amount || Number(r.data?.rentAmount) || 0,
    depositPaid: Number(r.data?.depositPaid) || 0,
    leaseStart: r.date || (r.data?.leaseStart as string) || "",
    leaseEnd: (r.data?.leaseEnd as string) || "",
    status: r.status || "active",
  }));

  const selectedTenant = tenants.find(t => t.id === selected) || null;
  const today = new Date().toISOString().split("T")[0];
  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === "active").length,
    expiringSoon: tenants.filter(t => t.status === "active" && t.leaseEnd && t.leaseEnd <= new Date(new Date(today).getTime() + 30 * 86400000).toISOString().split("T")[0]).length,
    depositHeld: tenants.reduce((sum, t) => sum + t.depositPaid, 0),
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return setFormError("Tenant name is required.");
    if (!form.property.trim()) return setFormError("Property is required.");
    if (!form.leaseStart || !form.leaseEnd) return setFormError("Lease dates are required.");
    if (form.leaseEnd < form.leaseStart) return setFormError("Lease end must be after lease start.");
    if (Number(form.rentAmount) <= 0) return setFormError("Monthly rent must be greater than zero.");
    const propertyExists = propertyStore.records.some(record => record.title.toLowerCase() === form.property.trim().toLowerCase());
    if (!propertyExists) return setFormError("Create the property first.");
    if (records.some(record => String(record.data?.cnic || "").trim() && String(record.data?.cnic || "").trim() === form.cnic.trim())) return setFormError("Tenant CNIC already exists.");
    setFormError("");
    await create({ title: form.name.trim(), status: "active", date: form.leaseStart, amount: Number(form.rentAmount), data: { phone: form.phone.trim(), email: form.email.trim(), cnic: form.cnic.trim(), property: form.property.trim(), unit: form.unit.trim(), rentAmount: Number(form.rentAmount), depositPaid: Number(form.depositPaid), leaseStart: form.leaseStart, leaseEnd: form.leaseEnd } });
    setShowModal(false);
    setForm({ name: "", phone: "", email: "", cnic: "", property: "", unit: "", rentAmount: "", depositPaid: "", leaseStart: "", leaseEnd: "" });
  };

  return (
    <div style={s.page}>
      <style>{`.tenant-card:hover{border-color:rgba(99,102,241,.3)!important;} .t-btn:hover{opacity:.85;}`}</style>
      <div style={s.heading}>Tenant Management</div>
      <div style={s.sub}>Lease tracking, contacts, and rental information</div>

      <div style={s.statsRow}>
        {[
          { label: "Total Tenants", value: stats.total, color: "#a78bfa" },
          { label: "Active", value: stats.active, color: "#10b981" },
          { label: "Expiring in 30 days", value: stats.expiringSoon, color: "#f59e0b" },
          { label: "Deposit Held", value: `Rs. ${(stats.depositHeld / 1000).toFixed(0)}K`, color: "#60a5fa" },
        ].map(st => (
          <div key={st.label} style={s.card}>
            <div style={s.cardLabel}>{st.label}</div>
            <div style={{ ...s.cardValue, color: st.color }}>{st.value}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,.4)" }}>Loading...</div>}

      <div style={s.mainLayout}>
        <div>
          <div style={s.topRow}>
            <div style={s.sectionTitle}>All Tenants</div>
            <button className="t-btn" style={s.btn} onClick={() => { setFormError(""); setShowModal(true); }}>+ Add Tenant</button>
          </div>

          {!loading && tenants.length === 0 && (
            <div style={{ ...s.card, textAlign: "center", padding: 40, color: "rgba(255,255,255,.25)" }}>No tenants found.</div>
          )}

          {tenants.map(t => {
            const cfg = statusConfig[t.status] || { label: t.status, color: "#a78bfa" };
            return (
              <div key={t.id} className="tenant-card" style={s.tCard(selected === t.id)} onClick={() => setSelected(t.id === selected ? null : t.id)}>
                <div style={s.tTop}>
                  <div>
                    <div style={s.tName}>{t.name}</div>
                    <div style={s.tSub}>{t.property} — {t.unit}</div>
                  </div>
                  <span style={s.badge(cfg.color)}>{cfg.label}</span>
                </div>
                <div style={s.tInfo}>
                  <span style={s.infoItem}>{t.phone}</span>
                  <span style={s.infoItem}>Rs. {t.rentAmount.toLocaleString()}/mo</span>
                  <span style={s.infoItem}>{t.leaseStart} → {t.leaseEnd}</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTenant && (
          <div>
            <div style={s.detailPanel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div style={s.dpTitle}>Tenant Details</div>
                <span style={s.badge((statusConfig[selectedTenant.status] || { color: "#a78bfa" }).color)}>{(statusConfig[selectedTenant.status] || { label: selectedTenant.status }).label}</span>
              </div>
              {[
                { label: "Full Name", value: selectedTenant.name },
                { label: "Phone", value: selectedTenant.phone },
                { label: "Email", value: selectedTenant.email },
                { label: "CNIC", value: selectedTenant.cnic },
                { label: "Property", value: selectedTenant.property },
                { label: "Unit", value: selectedTenant.unit },
                { label: "Monthly Rent", value: `Rs. ${selectedTenant.rentAmount.toLocaleString()}` },
                { label: "Security Deposit", value: `Rs. ${selectedTenant.depositPaid.toLocaleString()}` },
                { label: "Lease Start", value: selectedTenant.leaseStart },
                { label: "Lease End", value: selectedTenant.leaseEnd },
              ].map(row => (
                <div key={row.label} style={s.dpRow}>
                  <div style={s.dpLabel}>{row.label}</div>
                  <div style={s.dpValue}>{row.value}</div>
                </div>
              ))}
              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <button style={{ flex: 1, background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.3)", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Send Receipt</button>
                <button style={{ flex: 1, background: "rgba(239,68,68,.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Notice</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.mTitle}>Add New Tenant</div>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={s.formGrid}>
              <div style={{ gridColumn: "1/-1" }}><label style={s.lbl}>Full Name</label><input style={s.inp} placeholder="Muhammad Ali Khan" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={s.lbl}>Phone</label><input style={s.inp} placeholder="0300-0000000" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><label style={s.lbl}>Email</label><input style={s.inp} placeholder="email@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div style={{ gridColumn: "1/-1" }}><label style={s.lbl}>CNIC</label><input style={s.inp} placeholder="XXXXX-XXXXXXX-X" value={form.cnic} onChange={e => setForm(p => ({ ...p, cnic: e.target.value }))} /></div>
              <div><label style={s.lbl}>Property Name</label><input style={s.inp} placeholder="e.g. Al-Noor Plaza" value={form.property} onChange={e => setForm(p => ({ ...p, property: e.target.value }))} /></div>
              <div><label style={s.lbl}>Unit / Flat / Shop</label><input style={s.inp} placeholder="e.g. Shop 4-B" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></div>
              <div><label style={s.lbl}>Monthly Rent (Rs.)</label><input style={s.inp} type="number" value={form.rentAmount} onChange={e => setForm(p => ({ ...p, rentAmount: e.target.value }))} /></div>
              <div><label style={s.lbl}>Security Deposit (Rs.)</label><input style={s.inp} type="number" value={form.depositPaid} onChange={e => setForm(p => ({ ...p, depositPaid: e.target.value }))} /></div>
              <div><label style={s.lbl}>Lease Start</label><input style={s.inp} type="date" value={form.leaseStart} onChange={e => setForm(p => ({ ...p, leaseStart: e.target.value }))} /></div>
              <div><label style={s.lbl}>Lease End</label><input style={s.inp} type="date" value={form.leaseEnd} onChange={e => setForm(p => ({ ...p, leaseEnd: e.target.value }))} /></div>
            </div>
            <div style={s.mBtns}>
              <button style={s.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button className="t-btn" style={s.btn} onClick={handleCreate}>Add Tenant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
