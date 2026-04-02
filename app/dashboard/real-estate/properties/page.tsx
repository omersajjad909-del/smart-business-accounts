"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

type PropStatus = "vacant" | "rented" | "maintenance" | "for_sale";
const STATUS_META: Record<PropStatus, { label: string; color: string; bg: string; emoji: string }> = {
  vacant:      { label: "Vacant",      color: "#34d399", bg: "rgba(52,211,153,.12)",  emoji: "🟢" },
  rented:      { label: "Rented",      color: "#818cf8", bg: "rgba(129,140,248,.12)", emoji: "🔵" },
  maintenance: { label: "Maintenance", color: "#f59e0b", bg: "rgba(245,158,11,.12)",  emoji: "🟡" },
  for_sale:    { label: "For Sale",    color: "#38bdf8", bg: "rgba(56,189,248,.12)",  emoji: "🔷" },
};

export default function PropertiesPage() {
  const { records, loading, create, update } = useBusinessRecords("property");
  const leaseStore = useBusinessRecords("lease");
  const [filter, setFilter] = useState<"all" | PropStatus>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Apartment", address: "", size: "", status: "vacant" as PropStatus, rent: 0, rooms: 1 });
  const [formError, setFormError] = useState("");

  const properties = records.map(r => ({
    id: r.id,
    name: r.title,
    type: (r.data?.type as string) || "Apartment",
    address: (r.data?.address as string) || "",
    size: (r.data?.size as string) || "",
    status: (r.status || "vacant") as PropStatus,
    rent: r.amount || 0,
    tenant: (r.data?.tenant as string) || "",
    leaseEnd: (r.data?.leaseEnd as string) || "",
    rooms: Number(r.data?.rooms) || 0,
  }));

  const filtered = properties.filter(p => filter === "all" || p.status === filter);
  const totalRent = properties.filter(p => p.status === "rented").reduce((s, p) => s + p.rent, 0);
  const occupied = properties.filter(p => p.status === "rented").length;
  const selectedProp = selected ? properties.find(p => p.id === selected) : null;

  async function createProp() {
    if (!form.name.trim()) return setFormError("Property name is required.");
    if (!form.address.trim()) return setFormError("Address is required.");
    if (form.rent < 0) return setFormError("Rent cannot be negative.");
    if (form.rooms <= 0) return setFormError("Rooms must be greater than zero.");
    if (properties.some(property => property.name.toLowerCase() === form.name.trim().toLowerCase())) return setFormError("Property name already exists.");
    setFormError("");
    await create({ title: form.name.trim(), status: form.status, amount: form.rent, data: { type: form.type, address: form.address.trim(), size: form.size.trim(), rooms: form.rooms } });
    setShowCreate(false);
    setForm({ name: "", type: "Apartment", address: "", size: "", status: "vacant", rent: 0, rooms: 1 });
  }

  async function changeStatus(propertyId: string, nextStatus: PropStatus) {
    const property = properties.find(entry => entry.id === propertyId);
    if (!property) return;
    const linkedLease = leaseStore.records.some(record => String(record.data?.property || "") === property.name && String(record.status || "") === "active");
    if (linkedLease && (nextStatus === "vacant" || nextStatus === "for_sale" || nextStatus === "maintenance")) {
      alert("Terminate the active lease before changing this property out of rented status.");
      return;
    }
    await update(propertyId, { status: nextStatus });
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 };

  return (
    <div style={{ padding: "28px", color: "white", fontFamily: ff }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🏢 Properties</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Manage your real estate portfolio, tenants, and rental income</p>
        </div>
        <button onClick={() => { setFormError(""); setShowCreate(true); }} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#818cf8,#6366f1)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Add Property</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[{ label: "Total Properties", val: properties.length, color: "#818cf8" }, { label: "Rented", val: occupied, color: "#818cf8" }, { label: "Vacant", val: properties.filter(p => p.status === "vacant").length, color: "#34d399" }, { label: "Monthly Income", val: `Rs. ${totalRent.toLocaleString()}`, color: "#34d399" }].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all", "vacant", "rented", "maintenance", "for_sale"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filter === f ? "#818cf8" : border}`, background: filter === f ? "rgba(129,140,248,.15)" : bg, color: filter === f ? "#818cf8" : "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 12 }}>
            {f === "all" ? "All" : STATUS_META[f].label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 340px" : "1fr", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
          {filtered.map(prop => {
            const m = STATUS_META[prop.status];
            return (
              <div key={prop.id} onClick={() => setSelected(selected === prop.id ? null : prop.id)}
                style={{ background: selected === prop.id ? m.bg : bg, border: `2px solid ${selected === prop.id ? m.color : border}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "all .2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{prop.name}</div>
                  <span style={{ background: m.bg, color: m.color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{m.emoji} {m.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{prop.type} · {prop.size}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 12 }}>📍 {prop.address}</div>
                <div style={{ fontWeight: 700, color: "#34d399" }}>Rs. {prop.rent.toLocaleString()}/mo</div>
                {prop.tenant && <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 6 }}>Tenant: {prop.tenant}</div>}
              </div>
            );
          })}
          {!loading && filtered.length === 0 && <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No properties found.</div>}
        </div>

        {selectedProp && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "20px 22px", height: "fit-content" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedProp.name}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            {[["Type", selectedProp.type], ["Address", selectedProp.address], ["Size", selectedProp.size], ["Rooms", String(selectedProp.rooms)], ["Rent", `Rs. ${selectedProp.rent.toLocaleString()}`], ["Tenant", selectedProp.tenant || "—"], ["Lease End", selectedProp.leaseEnd || "—"]].map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              {(["vacant", "rented", "maintenance", "for_sale"] as PropStatus[]).map(s => (
                <button key={s} onClick={() => void changeStatus(selectedProp.id, s)} style={{ padding: "8px", borderRadius: 8, border: `1px solid ${selectedProp.status === s ? STATUS_META[s].color : "rgba(255,255,255,.08)"}`, background: selectedProp.status === s ? STATUS_META[s].bg : "transparent", color: selectedProp.status === s ? STATUS_META[s].color : "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {STATUS_META[s].emoji} {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 480, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Add Property</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[["Property Name", "name"], ["Address", "address"], ["Size", "size"]].map(([label, key]) => (
                <div key={key} style={{ gridColumn: key === "address" ? "span 2" : undefined }}>
                  <label style={lbl}>{label}</label>
                  <input style={inp} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div><label style={lbl}>Type</label>
                <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {["Apartment", "House", "Commercial", "Plot", "Shop"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Status</label>
                <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PropStatus }))}>
                  {(["vacant", "rented", "maintenance", "for_sale"] as const).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Monthly Rent (Rs.)</label>
                <input type="number" style={inp} value={form.rent} onChange={e => setForm(f => ({ ...f, rent: Number(e.target.value) }))} />
              </div>
              <div><label style={lbl}>Rooms</label>
                <input type="number" style={inp} value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={createProp} style={{ flex: 1, padding: "11px 0", background: "linear-gradient(135deg,#818cf8,#6366f1)", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Property</button>
              <button onClick={() => setShowCreate(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
