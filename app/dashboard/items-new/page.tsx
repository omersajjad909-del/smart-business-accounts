"use client";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT   = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL  = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT   = "#f1f5f9";
const MUTED  = "rgba(255,255,255,0.45)";
const INPUT  = { background:"rgba(255,255,255,0.05)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"9px 12px", color:TEXT, fontFamily:FONT, fontSize:13, width:"100%", outline:"none" };

// ── Category options ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { value:"TRADING",      label:"Trading Goods",    color:"#818cf8" },
  { value:"RAW_MATERIAL", label:"Raw Material",     color:"#34d399" },
  { value:"FINISHED",     label:"Finished Goods",   color:"#f59e0b" },
  { value:"SERVICE",      label:"Service",          color:"#a78bfa" },
];

// ── Category pill ─────────────────────────────────────────────────────────────
function CatPill({ value }: { value: string }) {
  const cat = CATEGORIES.find(c => c.value === value) || CATEGORIES[0];
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
      background:`${cat.color}18`, border:`1px solid ${cat.color}40`, color:cat.color,
      fontFamily:FONT, letterSpacing:".04em", whiteSpace:"nowrap" }}>
      {cat.label}
    </span>
  );
}

// ── Type ──────────────────────────────────────────────────────────────────────
type Item = {
  id: string; code: string; name: string; category: string;
  unit: string; rate: number; purchaseRate: number; taxRate: number;
  minStock: number; barcode?: string | null; description?: string | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ItemsNewPage() {
  const user = getCurrentUser();

  const [items,       setItems]       = useState<Item[]>([]);
  const [name,        setName]        = useState("");
  const [category,    setCategory]    = useState("TRADING");
  const [unit,        setUnit]        = useState("");
  const [rate,        setRate]        = useState("");
  const [purchaseRate,setPurchaseRate] = useState("");
  const [taxRate,     setTaxRate]     = useState("");
  const [minStock,    setMinStock]    = useState("");
  const [barcode,     setBarcode]     = useState("");
  const [description, setDescription] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("ALL");

  const headers = {
    "x-user-role":   user?.role || "ADMIN",
    "x-company-id":  user?.companyId || "",
  };

  async function loadItems() {
    try {
      const res  = await fetch("/api/items-new", { headers });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  }

  useEffect(() => { loadItems(); }, []);

  function resetForm() {
    setEditingId(null); setName(""); setCategory("TRADING"); setUnit("");
    setRate(""); setPurchaseRate(""); setTaxRate(""); setMinStock("");
    setBarcode(""); setDescription("");
  }

  async function saveItem() {
    if (!name.trim() || !unit) { toast("Item name aur unit zaroori hai"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/items-new", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type":"application/json", ...headers },
        body: JSON.stringify({ id:editingId, name:name.trim(), category, unit,
          rate, purchaseRate, taxRate, minStock, barcode, description }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Save failed"); }
      resetForm();
      await loadItems();
      toast.success(editingId ? "Item updated" : "Item saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  function handleEdit(item: Item) {
    setEditingId(item.id); setName(item.name); setCategory(item.category || "TRADING");
    setUnit(item.unit); setRate(String(item.rate || "")); setPurchaseRate(String(item.purchaseRate || ""));
    setTaxRate(String(item.taxRate || "")); setMinStock(String(item.minStock || ""));
    setBarcode(item.barcode || ""); setDescription(item.description || "");
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this item? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/items-new?id=${id}`, { method:"DELETE", headers });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Delete failed"); }
      await loadItems();
      toast.success("Item deleted");
    } catch (e: any) { toast.error(e.message); }
  }

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "ALL" || i.category === filterCat;
    return matchSearch && matchCat;
  });

  // ── Margin % helper ─────────────────────────────────────────────────────────
  function margin(item: Item) {
    if (!item.purchaseRate || !item.rate) return null;
    const pct = ((item.rate - item.purchaseRate) / item.rate) * 100;
    return pct.toFixed(1);
  }

  return (
    <div style={{ fontFamily:FONT, color:TEXT, maxWidth:1200, margin:"0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>📦 Item Coding</h1>
          <p style={{ fontSize:13, color:MUTED, margin:"4px 0 0" }}>
            {items.length} item{items.length !== 1 ? "s" : ""} registered
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <div style={{ background:PANEL, border:`1px solid ${BORDER}`, borderRadius:16, padding:"22px 24px", marginBottom:28 }}>
        <div style={{ fontSize:12, fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:".08em", marginBottom:16 }}>
          {editingId ? "✏️ Edit Item" : "➕ Add New Item"}
        </div>

        {/* Row 1: Name + Category + Unit */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Item Name *</div>
            <input style={INPUT} placeholder="e.g. PVC Non-Stick Roll" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Category *</div>
            <select style={INPUT} value={category} onChange={e=>setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Unit *</div>
            <select style={INPUT} value={unit} onChange={e=>setUnit(e.target.value)}>
              <option value="">Select Unit</option>
              <optgroup label="Weight">
                <option value="KG">Kilogram (KG)</option>
                <option value="GM">Gram (GM)</option>
                <option value="TON">Ton / Tonne</option>
                <option value="QTL">Quintal (100 KG)</option>
                <option value="MND">Mound / Mann (40 KG)</option>
              </optgroup>
              <optgroup label="Volume / Liquid">
                <option value="LTR">Liter</option>
                <option value="ML">Milliliter</option>
                <option value="BTL">Bottle</option>
                <option value="DRM">Drum</option>
              </optgroup>
              <optgroup label="Length / Area">
                <option value="MTR">Meter</option>
                <option value="CM">Centimeter</option>
                <option value="FT">Feet</option>
                <option value="IN">Inch</option>
                <option value="YD">Yard</option>
                <option value="SFT">Square Feet</option>
                <option value="SQM">Square Meter</option>
              </optgroup>
              <optgroup label="Counting / Packing">
                <option value="PCS">Pieces</option>
                <option value="DOZ">Dozen (12 pcs)</option>
                <option value="PAIR">Pair</option>
                <option value="SET">Set</option>
                <option value="BOX">Box</option>
                <option value="PACK">Pack</option>
                <option value="CTN">Carton</option>
                <option value="BAG">Bag</option>
                <option value="ROLL">Roll</option>
                <option value="SHEET">Sheet</option>
                <option value="BDL">Bundle</option>
                <option value="NO">Number (No.)</option>
                <option value="UNIT">Unit</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Row 2: Sale Rate + Purchase Rate + Tax % + Min Stock */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Sale Rate (Rs.)</div>
            <input style={INPUT} type="number" placeholder="0" value={rate} onChange={e=>setRate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:"#34d399", marginBottom:5 }}>Purchase Rate (Rs.) <span style={{fontSize:10,opacity:.6}}>cost price</span></div>
            <input style={{...INPUT, borderColor:"rgba(52,211,153,0.2)"}} type="number" placeholder="0" value={purchaseRate} onChange={e=>setPurchaseRate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:"#f59e0b", marginBottom:5 }}>Tax / GST % <span style={{fontSize:10,opacity:.6}}>e.g. 17</span></div>
            <input style={{...INPUT, borderColor:"rgba(245,158,11,0.2)"}} type="number" placeholder="0" value={taxRate} onChange={e=>setTaxRate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:"#f87171", marginBottom:5 }}>Min Stock Alert</div>
            <input style={{...INPUT, borderColor:"rgba(248,113,113,0.2)"}} type="number" placeholder="0" value={minStock} onChange={e=>setMinStock(e.target.value)} />
          </div>
        </div>

        {/* Row 3: Barcode + Description */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12, marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Barcode / SKU</div>
            <input style={INPUT} placeholder="Scan or type barcode" value={barcode} onChange={e=>setBarcode(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Description / Notes</div>
            <input style={INPUT} placeholder="Optional notes about this item" value={description} onChange={e=>setDescription(e.target.value)} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={saveItem} disabled={saving}
            style={{ flex:1, padding:"10px 0", borderRadius:10, border:"none",
              background:`linear-gradient(135deg,${ACCENT},#8b5cf6)`, color:"#fff",
              fontFamily:FONT, fontSize:13, fontWeight:800, cursor:saving?"not-allowed":"pointer",
              opacity:saving?0.6:1 }}>
            {saving ? "Saving…" : editingId ? "Update Item" : "+ Save Item"}
          </button>
          {editingId && (
            <button onClick={resetForm}
              style={{ padding:"10px 20px", borderRadius:10, border:`1px solid ${BORDER}`,
                background:"transparent", color:MUTED, fontFamily:FONT, fontSize:13,
                fontWeight:700, cursor:"pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Filter / Search bar ── */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <input
          style={{...INPUT, width:260}} placeholder="🔍 Search by name or code…"
          value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:8 }}>
          {["ALL", ...CATEGORIES.map(c=>c.value)].map(v => {
            const cat = CATEGORIES.find(c=>c.value===v);
            const active = filterCat === v;
            return (
              <button key={v} onClick={()=>setFilterCat(v)}
                style={{ padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:700,
                  fontFamily:FONT, cursor:"pointer",
                  background: active ? (cat ? `${cat.color}22` : "rgba(99,102,241,0.15)") : "transparent",
                  border: active ? `1px solid ${cat?.color || ACCENT}60` : `1px solid ${BORDER}`,
                  color: active ? (cat?.color || ACCENT) : MUTED }}>
                {v === "ALL" ? "All" : cat?.label || v}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background:PANEL, border:`1px solid ${BORDER}`, borderRadius:16, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
              {["Code","Name","Category","Unit","Sale Rate","Purchase Rate","Margin","Tax %","Min Stock","Barcode","Actions"].map(h => (
                <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11,
                  fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:".06em",
                  whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} style={{ padding:"40px", textAlign:"center", color:MUTED }}>
                No items found. Add your first item above.
              </td></tr>
            ) : filtered.map((item, idx) => {
              const mgn = margin(item);
              return (
                <tr key={item.id}
                  style={{ borderBottom:`1px solid ${BORDER}`,
                    background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,.01)" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,0.04)")}
                  onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?"transparent":"rgba(255,255,255,.01)")}>
                  <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:12, color:ACCENT, fontWeight:700 }}>{item.code}</td>
                  <td style={{ padding:"10px 14px", fontWeight:700 }}>{item.name}</td>
                  <td style={{ padding:"10px 14px" }}><CatPill value={item.category || "TRADING"} /></td>
                  <td style={{ padding:"10px 14px", color:MUTED }}>{item.unit}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", fontWeight:700 }}>
                    {item.rate ? item.rate.toLocaleString() : <span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"right", color:"#34d399" }}>
                    {item.purchaseRate ? item.purchaseRate.toLocaleString() : <span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"right" }}>
                    {mgn !== null ? (
                      <span style={{ fontSize:11, fontWeight:700, color: Number(mgn) > 15 ? "#34d399" : Number(mgn) > 5 ? "#f59e0b" : "#f87171" }}>
                        {mgn}%
                      </span>
                    ) : <span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"right", color:"#f59e0b" }}>
                    {item.taxRate ? `${item.taxRate}%` : <span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"right" }}>
                    {item.minStock > 0
                      ? <span style={{ color:"#f87171", fontWeight:700 }}>{item.minStock}</span>
                      : <span style={{color:MUTED}}>—</span>}
                  </td>
                  <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:11, color:MUTED }}>
                    {item.barcode || "—"}
                  </td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                    <button onClick={()=>handleEdit(item)}
                      style={{ padding:"4px 12px", borderRadius:6, border:`1px solid rgba(99,102,241,0.4)`,
                        background:"rgba(99,102,241,0.1)", color:"#818cf8", fontFamily:FONT,
                        fontSize:11, fontWeight:700, cursor:"pointer", marginRight:6 }}>
                      Edit
                    </button>
                    <button onClick={()=>handleDelete(item.id)}
                      style={{ padding:"4px 12px", borderRadius:6, border:`1px solid rgba(248,113,113,0.4)`,
                        background:"rgba(248,113,113,0.08)", color:"#f87171", fontFamily:FONT,
                        fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Del
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div style={{ textAlign:"right", fontSize:12, color:MUTED, marginTop:12 }}>
          Showing {filtered.length} of {items.length} items
        </div>
      )}
    </div>
  );
}
