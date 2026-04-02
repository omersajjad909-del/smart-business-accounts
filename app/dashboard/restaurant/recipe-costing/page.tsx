"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { restaurantBg, restaurantBorder, restaurantFont, restaurantMuted } from "../_shared";

const card: React.CSSProperties = { background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 12, padding: "20px 24px", fontFamily: restaurantFont };

export default function RecipeCostingPage() {
  const { records, loading, create } = useBusinessRecords("recipe");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", category: "Mains", servings: 1, sellingPrice: 0, ingredients: "", totalCost: 0 });

  const recipes = useMemo(() => records.map((record) => {
    const ingredients = String(record.data?.ingredients || "").split(",").map((item) => item.trim()).filter(Boolean);
    const totalCost = Number(record.data?.totalCost || 0);
    const sellingPrice = record.amount || 0;
    const margin = sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 100) : 0;
    return { id: record.id, name: record.title, category: String(record.data?.category || "Mains"), servings: Number(record.data?.servings || 1), ingredients, totalCost, sellingPrice, margin };
  }), [records]);

  const avgMargin = recipes.length ? Math.round(recipes.reduce((sum, recipe) => sum + recipe.margin, 0) / recipes.length) : 0;

  async function save() {
    const name = form.name.trim();
    const ingredients = form.ingredients.split(",").map((item) => item.trim()).filter(Boolean);
    if (!name) return setFormError("Recipe name is required.");
    if (ingredients.length === 0) return setFormError("At least one ingredient is required.");
    if (form.servings <= 0) return setFormError("Servings must be greater than zero.");
    if (form.totalCost < 0) return setFormError("Total cost cannot be negative.");
    if (form.sellingPrice <= 0) return setFormError("Selling price must be greater than zero.");
    setFormError("");
    await create({ title: name, status: "active", amount: form.sellingPrice, data: { category: form.category, servings: form.servings, ingredients: ingredients.join(", "), totalCost: form.totalCost } });
    setShowModal(false);
    setForm({ name: "", category: "Mains", servings: 1, sellingPrice: 0, ingredients: "", totalCost: 0 });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: restaurantFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Recipe Costing</h1>
          <p style={{ fontSize: 13, color: restaurantMuted, margin: 0 }}>Track recipe cost and margin discipline.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#ef4444", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Recipe</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Recipes", val: recipes.length, color: "#f87171" },
          { label: "Avg Margin", val: `${avgMargin}%`, color: "#34d399" },
          { label: "High Margin (>60%)", val: recipes.filter((recipe) => recipe.margin > 60).length, color: "#fbbf24" },
          { label: "Low Margin (<30%)", val: recipes.filter((recipe) => recipe.margin < 30).length, color: "#f87171" },
        ].map((cardItem) => (
          <div key={cardItem.label} style={card}><div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{cardItem.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: cardItem.color }}>{cardItem.val}</div></div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: restaurantMuted }}>Loading...</div>}

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Recipe", "Category", "Servings", "Ingredients", "Cost", "Selling Price", "Margin"].map((header) => <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${restaurantBorder}`, fontWeight: 600 }}>{header}</th>)}</tr></thead>
          <tbody>
            {recipes.map((recipe) => (
              <tr key={recipe.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 600 }}>{recipe.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{recipe.category}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{recipe.servings}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12, color: restaurantMuted }}>{recipe.ingredients.slice(0, 3).join(", ")}{recipe.ingredients.length > 3 ? "..." : ""}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>Rs. {recipe.totalCost.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 600 }}>Rs. {recipe.sellingPrice.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}><span style={{ color: recipe.margin > 60 ? "#34d399" : recipe.margin > 30 ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{recipe.margin}%</span></td>
              </tr>
            ))}
            {!loading && recipes.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>No recipes yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 16, padding: 32, width: 480, fontFamily: restaurantFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Add Recipe</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            {[
              ["Recipe Name", "name", "text"],
              ["Ingredients (comma separated)", "ingredients", "text"],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>{label}</label>
                <input type={type} value={String((form as Record<string, unknown>)[key] ?? "")} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14 }}>
                  {["Starters", "Mains", "Desserts", "Drinks"].map((category) => <option key={category}>{category}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Servings</label>
                <input type="number" value={form.servings} onChange={(event) => setForm((prev) => ({ ...prev, servings: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Total Cost (Rs.)</label>
              <input type="number" value={form.totalCost} onChange={(event) => setForm((prev) => ({ ...prev, totalCost: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box", marginBottom: 16 }} />
              <label style={{ display: "block", fontSize: 12, color: restaurantMuted, marginBottom: 6 }}>Selling Price (Rs.)</label>
              <input type="number" value={form.sellingPrice} onChange={(event) => setForm((prev) => ({ ...prev, sellingPrice: Number(event.target.value) }))} style={{ width: "100%", background: restaurantBg, border: `1px solid ${restaurantBorder}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Add Recipe</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${restaurantBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
