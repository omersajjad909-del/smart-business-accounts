"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "../_shared";

const CATEGORIES = ["All", "Starters", "Mains", "Desserts", "Drinks", "Sides"];
const CAT_COLORS: Record<string, string> = { Starters: "#f59e0b", Mains: "#ef4444", Desserts: "#ec4899", Drinks: "#3b82f6", Sides: "#10b981" };

export default function MenuPage() {
  const { records, loading, create, update } = useBusinessRecords("menu_item");
  const [tab, setTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", category: "Mains", price: 0, cost: 0, description: "", emoji: "🍽️" });

  const items = useMemo(() => records.map((record) => ({
    id: record.id,
    name: record.title,
    category: String(record.data?.category || "Mains"),
    price: record.amount || 0,
    cost: Number(record.data?.cost || 0),
    description: String(record.data?.description || ""),
    emoji: String(record.data?.emoji || "🍽️"),
    available: record.status !== "inactive",
  })), [records]);

  const filtered = tab === "All" ? items : items.filter((item) => item.category === tab);
  const pricedItems = items.filter((item) => item.price > 0);
  const avgMargin = pricedItems.length ? Math.round(pricedItems.reduce((sum, item) => sum + ((item.price - item.cost) / item.price) * 100, 0) / pricedItems.length) : 0;

  async function save() {
    const name = form.name.trim();
    if (!name) return setFormError("Item name is required.");
    if (form.price <= 0) return setFormError("Selling price must be greater than zero.");
    if (form.cost < 0) return setFormError("Cost cannot be negative.");
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) return setFormError("Menu item already exists.");
    setFormError("");
    await create({
      title: name,
      status: "active",
      amount: form.price,
      data: { category: form.category, cost: form.cost, description: form.description.trim(), emoji: form.emoji.trim() || "🍽️" },
    });
    setShowModal(false);
    setForm({ name: "", category: "Mains", price: 0, cost: 0, description: "", emoji: "🍽️" });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: restaurantFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Menu</h1>
          <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>Manage items, pricing, and availability.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Item</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Items", val: items.length, color: "#f87171" },
          { label: "Available", val: items.filter((item) => item.available).length, color: "#34d399" },
          { label: "Avg Margin", val: `${avgMargin}%`, color: "#f59e0b" },
          { label: "Categories", val: CATEGORIES.length - 1, color: "#818cf8" },
        ].map((card) => (
          <div key={card.label} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {CATEGORIES.map((category) => (
          <button key={category} onClick={() => setTab(category)} style={{ background: tab === category ? "#ef4444" : "rgba(255,255,255,.06)", color: tab === category ? "#fff" : "rgba(255,255,255,.6)", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {category}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: restaurantMuted }}>Loading...</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
        {filtered.map((item) => (
          <div key={item.id} style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{item.emoji}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
              <span style={{ display: "inline-block", background: `${CAT_COLORS[item.category] || "#818cf8"}18`, color: CAT_COLORS[item.category] || "#818cf8", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{item.category}</span>
            </div>
            <div style={{ fontSize: 12, color: restaurantMuted, marginBottom: 12 }}>{item.description || "No description"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#34d399", fontSize: 16 }}>Rs. {item.price.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: restaurantMuted }}>Cost Rs. {item.cost.toLocaleString()}</div>
              </div>
              <button onClick={() => update(item.id, { status: item.available ? "inactive" : "active" })} style={{ padding: "5px 10px", background: item.available ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${item.available ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`, color: item.available ? "#22c55e" : "#ef4444", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                {item.available ? "Available" : "Unavailable"}
              </button>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <div style={{ background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 12, padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)", gridColumn: "1/-1" }}>No items found.</div>}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 32, width: 480, fontFamily: restaurantFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 700 }}>Add Menu Item</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Item Name</label>
                <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {CATEGORIES.filter((item) => item !== "All").map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Emoji</label>
                <input value={form.emoji} onChange={(event) => setForm((prev) => ({ ...prev, emoji: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Price (Rs.)</label>
                <input type="number" value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Cost (Rs.)</label>
                <input type="number" value={form.cost} onChange={(event) => setForm((prev) => ({ ...prev, cost: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Description</label>
                <input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Item</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
