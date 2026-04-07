"use client";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useState, useEffect, useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT   = "'Outfit','Inter',sans-serif";
const ACCENT = "#10b981";
const PANEL  = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT   = "#f1f5f9";
const MUTED  = "rgba(255,255,255,0.45)";
const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", color: TEXT,
  fontFamily: FONT, fontSize: 13, width: "100%",
  outline: "none", boxSizing: "border-box",
};

const TYPE_OPTIONS = ["Retail", "Wholesale", "VIP", "Distributor", "Custom"] as const;
type PLType = typeof TYPE_OPTIONS[number];

interface PLItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  standardRate: number;
  customRate: number;   // overridden price in this list
}

interface PriceList {
  id: string;
  name: string;
  type: PLType;
  discount: number;     // global % if no custom rate per item
  status: "ACTIVE" | "DRAFT";
  items: PLItem[];
  notes: string;
}

interface RawItem {
  id: string; code: string; name: string; unit: string; rate: number;
}

// ── Type badge ────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  Retail: "#60a5fa", Wholesale: "#34d399", VIP: "#f59e0b",
  Distributor: "#a78bfa", Custom: "#f87171",
};
function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || "#818cf8";
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
    background: `${c}18`, border: `1px solid ${c}40`, color: c, fontFamily: FONT }}>{type}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const active = s === "ACTIVE";
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
    background: active ? "rgba(16,185,129,.15)" : "rgba(251,191,36,.12)",
    color: active ? "#10b981" : "#fbbf24", border: `1px solid ${active ? "#10b98140" : "#fbbf2440"}` }}>{s}</span>;
}

// ── API helpers ───────────────────────────────────────────────────────────────
const API = "/api/price-lists";

async function apiLoad(headers: Record<string, string>): Promise<PriceList[]> {
  const r = await fetch(API, { headers });
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}
async function apiSave(body: Partial<PriceList>, headers: Record<string, string>): Promise<PriceList | null> {
  const r = await fetch(API, {
    method: body.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Save failed");
  return r.json();
}
async function apiDelete(id: string, headers: Record<string, string>) {
  await fetch(`${API}?id=${id}`, { method: "DELETE", headers });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function PriceListsPage() {
  const user = getCurrentUser();
  const headers = useMemo<Record<string, string>>(() => ({
    "x-user-role":  user?.role || "ADMIN",
    "x-company-id": user?.companyId || "",
  }), [user]);

  const [lists,       setLists]       = useState<PriceList[]>([]);
  const [items,       setItems]       = useState<RawItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [companyName, setCompanyName] = useState("Company");

  // Modals
  const [showCreate,  setShowCreate]  = useState(false);
  const [editList,    setEditList]    = useState<PriceList | null>(null); // detail/edit
  const [saving,      setSaving]      = useState(false);

  // Create form
  const [cName,     setCName]     = useState("");
  const [cType,     setCType]     = useState<PLType>("Retail");
  const [cDiscount, setCDiscount] = useState("");
  const [cNotes,    setCNotes]    = useState("");

  // Item being added to editList
  const [addItemId,   setAddItemId]   = useState("");
  const [addItemRate, setAddItemRate] = useState("");

  // Load data
  useEffect(() => {
    Promise.all([
      apiLoad(headers).then(setLists),
      fetch("/api/items-new", { headers })
        .then(r => r.ok ? r.json() : [])
        .then(d => setItems(Array.isArray(d) ? d : [])),
      fetch("/api/companies", { headers: { ...headers, "x-user-id": user?.id || "" } })
        .then(r => r.ok ? r.json() : [])
        .then((d: { name: string; isDefault?: boolean }[]) => {
          if (!Array.isArray(d) || !d.length) return;
          const def = d.find(c => c.isDefault) || d[0];
          if (def?.name) setCompanyName(def.name);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  async function reload() {
    const fresh = await apiLoad(headers);
    setLists(fresh);
    if (editList) {
      const updated = fresh.find(l => l.id === editList.id);
      if (updated) setEditList(updated);
    }
  }

  // ── Create new price list ──────────────────────────────────────────────────
  async function handleCreate() {
    if (!cName.trim()) { toast.error("Price list name required"); return; }
    setSaving(true);
    try {
      await apiSave({ name: cName.trim(), type: cType, discount: Number(cDiscount) || 0,
        status: "DRAFT", items: [], notes: cNotes.trim() }, headers);
      setCName(""); setCType("Retail"); setCDiscount(""); setCNotes("");
      setShowCreate(false);
      await reload();
      toast.success("Price list created");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  // ── Toggle status ──────────────────────────────────────────────────────────
  async function toggleStatus(pl: PriceList) {
    try {
      await apiSave({ ...pl, status: pl.status === "ACTIVE" ? "DRAFT" : "ACTIVE" }, headers);
      await reload();
    } catch {}
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this price list?")) return;
    try {
      await apiDelete(id, headers);
      await reload();
      toast.success("Deleted");
    } catch {}
  }

  // ── Add item to open price list ────────────────────────────────────────────
  async function handleAddItem() {
    if (!editList || !addItemId) { toast.error("Select an item"); return; }
    const raw = items.find(i => i.id === addItemId);
    if (!raw) return;
    if (editList.items.find(i => i.itemId === addItemId)) {
      toast.error("Item already in this list"); return;
    }
    const newItem: PLItem = {
      itemId: raw.id, itemCode: raw.code, itemName: raw.name,
      unit: raw.unit, standardRate: raw.rate,
      customRate: Number(addItemRate) || raw.rate,
    };
    const updated = { ...editList, items: [...editList.items, newItem] };
    setSaving(true);
    try {
      await apiSave(updated, headers);
      setAddItemId(""); setAddItemRate("");
      await reload();
      toast.success("Item added");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  // ── Remove item from list ──────────────────────────────────────────────────
  async function handleRemoveItem(itemId: string) {
    if (!editList) return;
    const updated = { ...editList, items: editList.items.filter(i => i.itemId !== itemId) };
    try {
      await apiSave(updated, headers);
      await reload();
      toast.success("Item removed");
    } catch {}
  }

  // ── Update item rate inline ────────────────────────────────────────────────
  async function handleUpdateRate(itemId: string, newRate: number) {
    if (!editList) return;
    const updated = {
      ...editList,
      items: editList.items.map(i => i.itemId === itemId ? { ...i, customRate: newRate } : i),
    };
    try {
      await apiSave(updated, headers);
      await reload();
    } catch {}
  }

  // ── Print price list ──────────────────────────────────────────────────────
  function handlePrint(pl: PriceList) {
    // companyName is loaded from /api/companies in useEffect
    const date = new Date().toLocaleDateString("en-PK", { day:"2-digit", month:"short", year:"numeric" });
    const rows = pl.items.map(i => `
      <tr>
        <td>${i.itemCode}</td>
        <td>${i.itemName}</td>
        <td>${i.unit}</td>
        <td style="text-align:right">Rs. ${i.standardRate.toLocaleString()}</td>
        <td style="text-align:right; font-weight:700; color:#166534">Rs. ${i.customRate.toLocaleString()}</td>
        <td style="text-align:right; color:${i.customRate < i.standardRate ? "#dc2626" : "#166534"}">
          ${i.standardRate > 0 ? (((i.customRate - i.standardRate)/i.standardRate)*100).toFixed(1)+"%" : "—"}
        </td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${pl.name} — Price List</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif; color:#111; padding:32px; }
        .header { text-align:center; border-bottom:2px solid #4f46e5; padding-bottom:16px; margin-bottom:20px; }
        .header h1 { font-size:22px; color:#4f46e5; margin-bottom:4px; }
        .header p  { font-size:13px; color:#555; }
        .meta { display:flex; justify-content:space-between; font-size:12px;
          color:#555; background:#f5f5ff; padding:10px 14px; border-radius:6px; margin-bottom:20px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { background:#4f46e5; color:#fff; padding:9px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
        td { padding:9px 12px; border-bottom:1px solid #e5e7eb; }
        tr:nth-child(even) td { background:#f9f9ff; }
        .footer { margin-top:24px; text-align:center; font-size:11px; color:#999; }
        @media print { body { padding:16px; } }
      </style></head><body>
      <div class="header">
        <h1>${companyName}</h1>
        <p><strong>${pl.name}</strong> &nbsp;·&nbsp; ${pl.type} Price List &nbsp;·&nbsp; Printed: ${date}</p>
      </div>
      <div class="meta">
        <span>Type: <strong>${pl.type}</strong></span>
        <span>Global Discount: <strong>${pl.discount > 0 ? pl.discount+"%" : "N/A (item-specific)"}</strong></span>
        <span>Total Items: <strong>${pl.items.length}</strong></span>
        <span>Status: <strong>${pl.status}</strong></span>
      </div>
      ${pl.items.length === 0
        ? "<p style='text-align:center;color:#999;padding:40px'>No items in this price list.</p>"
        : `<table>
            <thead><tr>
              <th>Code</th><th>Item Name</th><th>Unit</th>
              <th style="text-align:right">Std Rate</th>
              <th style="text-align:right">Price List Rate</th>
              <th style="text-align:right">Diff %</th>
            </tr></thead>
            <tbody>${rows}</tbody>
           </table>`}
      <div class="footer">Generated by FinovaOS · ${companyName} · ${date}</div>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  }

  // items not already in current list (for dropdown)
  const availableItems = items.filter(i => !editList?.items.find(p => p.itemId === i.id));

  // KPIs
  const totalLists  = lists.length;
  const activeLists = lists.filter(l => l.status === "ACTIVE").length;
  const itemsCovered = [...new Set(lists.flatMap(l => l.items.map(i => i.itemId)))].length;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:300, color:MUTED, fontFamily:FONT }}>Loading…</div>
  );

  return (
    <div style={{ fontFamily:FONT, color:TEXT, maxWidth:1100, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>💰 Price Lists</h1>
          <p style={{ fontSize:13, color:MUTED, margin:"4px 0 0" }}>
            Customer-specific &amp; volume pricing — {totalLists} list{totalLists !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding:"10px 20px", borderRadius:10, border:"none",
            background:ACCENT, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
          + New Price List
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:28 }}>
        {[
          { label:"Total Lists",   value:totalLists,  color:ACCENT },
          { label:"Active",        value:activeLists, color:"#34d399" },
          { label:"Items Covered", value:itemsCovered,color:"#60a5fa" },
        ].map(k => (
          <div key={k.label} style={{ background:PANEL, border:`1px solid ${BORDER}`,
            borderRadius:12, padding:"18px 22px" }}>
            <div style={{ fontSize:12, color:MUTED, marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:PANEL, border:`1px solid ${BORDER}`, borderRadius:14, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
              {["Name","Type","Discount %","Items","Status","Actions"].map(h => (
                <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11,
                  fontWeight:700, color:MUTED, textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lists.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:"center", padding:"48px", color:MUTED }}>
                No price lists yet. Click "+ New Price List" to create one.
              </td></tr>
            ) : lists.map((l, idx) => (
              <tr key={l.id}
                style={{ borderBottom:`1px solid ${BORDER}`,
                  background:idx%2===0?"transparent":"rgba(255,255,255,.01)" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background=idx%2===0?"transparent":"rgba(255,255,255,.01)"}>
                <td style={{ padding:"11px 16px", fontWeight:700 }}>{l.name}
                  {l.notes ? <div style={{ fontSize:11, color:MUTED, fontWeight:400, marginTop:2 }}>{l.notes}</div> : null}
                </td>
                <td style={{ padding:"11px 16px" }}><TypeBadge type={l.type} /></td>
                <td style={{ padding:"11px 16px", color:ACCENT, fontWeight:700 }}>
                  {l.discount > 0 ? `${l.discount}%` : <span style={{color:MUTED}}>—</span>}
                </td>
                <td style={{ padding:"11px 16px" }}>
                  <span style={{ fontWeight:700, color: l.items.length > 0 ? "#60a5fa" : MUTED }}>
                    {l.items.length}
                  </span>
                  {l.items.length > 0 && <span style={{ fontSize:11, color:MUTED, marginLeft:4 }}>items</span>}
                </td>
                <td style={{ padding:"11px 16px" }}><StatusBadge s={l.status} /></td>
                <td style={{ padding:"11px 16px" }}>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setEditList(l)}
                      style={{ padding:"4px 12px", borderRadius:6, fontSize:11, fontWeight:700,
                        border:`1px solid rgba(99,102,241,0.4)`, background:"rgba(99,102,241,0.1)",
                        color:"#818cf8", cursor:"pointer", fontFamily:FONT }}>
                      Manage Items
                    </button>
                    <button onClick={() => toggleStatus(l)}
                      style={{ padding:"4px 12px", borderRadius:6, fontSize:11, fontWeight:700,
                        border:`1px solid ${l.status==="ACTIVE"?"rgba(107,114,128,.4)":"rgba(16,185,129,.4)"}`,
                        background:"transparent",
                        color:l.status==="ACTIVE"?"#9ca3af":ACCENT, cursor:"pointer", fontFamily:FONT }}>
                      {l.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(l.id)}
                      style={{ padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:700,
                        border:"1px solid rgba(239,68,68,.4)", background:"transparent",
                        color:"#ef4444", cursor:"pointer", fontFamily:FONT }}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:16 }}
          onClick={e => { if (e.target===e.currentTarget) setShowCreate(false); }}>
          <div style={{ background:"#0e1120", border:`1px solid ${BORDER}`, borderRadius:16,
            padding:"28px 28px 24px", width:"100%", maxWidth:460, fontFamily:FONT }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>New Price List</h2>
              <button onClick={() => setShowCreate(false)}
                style={{ background:"none", border:"none", color:MUTED, fontSize:22, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Name *</div>
                <input style={INPUT} placeholder="e.g. Wholesale 2025" value={cName} onChange={e=>setCName(e.target.value)} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Type</div>
                  <select style={INPUT} value={cType} onChange={e=>setCType(e.target.value as PLType)}>
                    {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Global Discount % <span style={{opacity:.5}}>(optional)</span></div>
                  <input style={INPUT} type="number" placeholder="0" value={cDiscount} onChange={e=>setCDiscount(e.target.value)} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:MUTED, marginBottom:5 }}>Notes</div>
                <input style={INPUT} placeholder="Optional description" value={cNotes} onChange={e=>setCNotes(e.target.value)} />
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ flex:1, padding:"9px 0", borderRadius:8, border:`1px solid ${BORDER}`,
                  background:"transparent", color:MUTED, fontFamily:FONT, fontSize:13, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                style={{ flex:2, padding:"9px 0", borderRadius:8, border:"none",
                  background:ACCENT, color:"#fff", fontFamily:FONT, fontSize:13,
                  fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?.7:1 }}>
                {saving ? "Creating…" : "Create List"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Items Modal ── */}
      {editList && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:16 }}
          onClick={e => { if (e.target===e.currentTarget) setEditList(null); }}>
          <div style={{ background:"#0e1120", border:`1px solid ${BORDER}`, borderRadius:16,
            padding:"28px", width:"100%", maxWidth:700, maxHeight:"88vh",
            overflowY:"auto", fontFamily:FONT }}>

            {/* Modal header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800 }}>{editList.name}</h2>
                <div style={{ display:"flex", gap:8, marginTop:6 }}>
                  <TypeBadge type={editList.type} />
                  <StatusBadge s={editList.status} />
                  {editList.discount > 0 && (
                    <span style={{ fontSize:11, color:ACCENT, fontWeight:700 }}>
                      Global {editList.discount}% off
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setEditList(null)}
                style={{ background:"none", border:"none", color:MUTED, fontSize:22, cursor:"pointer" }}>×</button>
            </div>

            {/* Add item row */}
            {availableItems.length > 0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10,
                padding:"14px 16px", background:"rgba(99,102,241,0.06)",
                border:`1px solid rgba(99,102,241,0.2)`, borderRadius:10, marginBottom:20 }}>
                <select style={INPUT} value={addItemId} onChange={e => {
                  setAddItemId(e.target.value);
                  const raw = items.find(i => i.id === e.target.value);
                  if (raw) setAddItemRate(String(raw.rate || ""));
                }}>
                  <option value="">Select item to add…</option>
                  {availableItems.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code}) — Std: Rs.{i.rate}</option>
                  ))}
                </select>
                <input style={{...INPUT, width:130}} type="number" placeholder="Price (Rs.)"
                  value={addItemRate} onChange={e => setAddItemRate(e.target.value)} />
                <button onClick={handleAddItem} disabled={saving || !addItemId}
                  style={{ padding:"9px 16px", borderRadius:8, border:"none",
                    background:"#6366f1", color:"#fff", fontFamily:FONT, fontSize:13,
                    fontWeight:700, cursor:(saving||!addItemId)?"not-allowed":"pointer",
                    opacity:(saving||!addItemId)?.6:1, whiteSpace:"nowrap" }}>
                  + Add
                </button>
              </div>
            ) : (
              <div style={{ padding:"12px 16px", borderRadius:10, marginBottom:20,
                background:"rgba(99,102,241,0.06)", border:`1px solid rgba(99,102,241,0.2)`,
                fontSize:13, color:MUTED }}>
                {items.length === 0
                  ? "No items found. Add items in Item Coding first."
                  : "All items already added to this list."}
              </div>
            )}

            {/* Items table */}
            {editList.items.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:MUTED, fontSize:14 }}>
                No items in this price list yet. Add items above.
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
                    {["Code","Item Name","Unit","Std Rate","Price List Rate","Diff",""].map(h => (
                      <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11,
                        color:MUTED, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editList.items.map((item, idx) => {
                    const diff = item.standardRate > 0
                      ? (((item.customRate - item.standardRate) / item.standardRate) * 100).toFixed(1)
                      : null;
                    return (
                      <tr key={item.itemId}
                        style={{ borderBottom:`1px solid ${BORDER}`,
                          background:idx%2===0?"transparent":"rgba(255,255,255,.01)" }}>
                        <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:12, color:"#818cf8" }}>
                          {item.itemCode}
                        </td>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{item.itemName}</td>
                        <td style={{ padding:"9px 12px", color:MUTED }}>{item.unit}</td>
                        <td style={{ padding:"9px 12px", color:MUTED }}>
                          {item.standardRate > 0 ? `Rs.${item.standardRate.toLocaleString()}` : "—"}
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <input
                            type="number"
                            defaultValue={item.customRate}
                            onBlur={e => {
                              const v = Number(e.target.value);
                              if (v !== item.customRate) handleUpdateRate(item.itemId, v);
                            }}
                            style={{ ...INPUT, width:120, padding:"5px 8px", fontSize:13,
                              color:ACCENT, fontWeight:700 }}
                          />
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          {diff !== null && (
                            <span style={{ fontSize:11, fontWeight:700,
                              color: Number(diff) < 0 ? "#f87171" : Number(diff) > 0 ? "#34d399" : MUTED }}>
                              {Number(diff) > 0 ? "+" : ""}{diff}%
                            </span>
                          )}
                        </td>
                        <td style={{ padding:"9px 12px" }}>
                          <button onClick={() => handleRemoveItem(item.itemId)}
                            style={{ padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700,
                              border:"1px solid rgba(239,68,68,.4)", background:"transparent",
                              color:"#ef4444", cursor:"pointer", fontFamily:FONT }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div style={{ marginTop:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={() => handlePrint(editList)}
                style={{ padding:"9px 20px", borderRadius:8, border:"none",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff",
                  fontFamily:FONT, fontSize:13, fontWeight:700, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:6 }}>
                🖨️ Print Price List
              </button>
              <button onClick={() => setEditList(null)}
                style={{ padding:"9px 24px", borderRadius:8, border:`1px solid ${BORDER}`,
                  background:"transparent", color:MUTED, fontFamily:FONT, fontSize:13, cursor:"pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
