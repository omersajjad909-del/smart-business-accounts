"use client";
import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";

const F = "'Outfit','Inter',sans-serif";
const BG = "rgba(255,255,255,0.03)";
const BD = "rgba(255,255,255,0.07)";
const inp: React.CSSProperties = {
  fontFamily: F, padding: "9px 12px", background: BG,
  border: `1px solid ${BD}`, borderRadius: 8,
  color: "var(--text-primary)", fontSize: 13, width: "100%", boxSizing: "border-box",
};

type Platform = "Shopify" | "WooCommerce" | "Daraz" | "Amazon" | "Custom";
type SyncStatus = "active" | "paused" | "error";

const PLATFORM_ICON: Record<Platform, string> = {
  Shopify: "🛍️", WooCommerce: "🛒", Daraz: "📦", Amazon: "📫", Custom: "🔗",
};
const PLATFORM_COLOR: Record<Platform, string> = {
  Shopify: "#96bf48", WooCommerce: "#7f54b3", Daraz: "#f85606", Amazon: "#ff9900", Custom: "#6366f1",
};
const STATUS_META: Record<SyncStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#10b981", bg: "rgba(16,185,129,.12)" },
  paused: { label: "Paused", color: "#f59e0b", bg: "rgba(245,158,11,.12)" },
  error:  { label: "Error",  color: "#ef4444", bg: "rgba(239,68,68,.12)"  },
};

const BLANK = {
  name: "", platform: "Shopify" as Platform, storeUrl: "",
  apiKey: "", syncInventory: true, syncPrices: true, syncOrders: true,
};

export default function OnlineSyncPage() {
  const { records, loading, create, update, remove, setStatus } = useBusinessRecords("online_store_sync");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState({ ...BLANK });
  const [saving, setSaving]       = useState(false);
  const [syncing, setSyncing]     = useState<string | null>(null);

  const stores = useMemo(() => records.map(r => ({
    id:            r.id,
    name:          r.title,
    platform:      (r.data?.platform || "Custom") as Platform,
    storeUrl:      String(r.data?.storeUrl || ""),
    syncInventory: Boolean(r.data?.syncInventory ?? true),
    syncPrices:    Boolean(r.data?.syncPrices    ?? true),
    syncOrders:    Boolean(r.data?.syncOrders    ?? true),
    status:        (r.status || "paused") as SyncStatus,
    lastSync:      r.data?.lastSync ? String(r.data.lastSync) : null,
    productCount:  Number(r.data?.productCount || 0),
    ordersToday:   Number(r.data?.ordersToday  || 0),
  })), [records]);

  function openCreate() { setEditId(null); setForm({ ...BLANK }); setShowModal(true); }
  function openEdit(s: typeof stores[0]) {
    setEditId(s.id);
    setForm({ name: s.name, platform: s.platform, storeUrl: s.storeUrl, apiKey: "",
              syncInventory: s.syncInventory, syncPrices: s.syncPrices, syncOrders: s.syncOrders });
    setShowModal(true);
  }
  function close() { setShowModal(false); setEditId(null); setForm({ ...BLANK }); }

  async function save() {
    if (!form.name.trim() || !form.storeUrl.trim()) { toast.error("Name and Store URL required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await update(editId, { title: form.name, data: { platform: form.platform, storeUrl: form.storeUrl, syncInventory: form.syncInventory, syncPrices: form.syncPrices, syncOrders: form.syncOrders } });
      } else {
        await create({ title: form.name, status: "paused", data: { platform: form.platform, storeUrl: form.storeUrl, syncInventory: form.syncInventory, syncPrices: form.syncPrices, syncOrders: form.syncOrders, lastSync: null, productCount: 0, ordersToday: 0 } });
      }
      close();
    } finally { setSaving(false); }
  }

  async function toggleStatus(id: string, cur: SyncStatus) {
    const next: SyncStatus = cur === "active" ? "paused" : "active";
    await setStatus(id, next);
    toast.success(next === "active" ? "Sync activated" : "Sync paused");
  }

  async function handleSync(id: string, name: string) {
    setSyncing(id);
    await new Promise(r => setTimeout(r, 1400));
    await update(id, { data: { lastSync: new Date().toLocaleString("en-PK") } });
    setSyncing(null);
    toast.success(`${name} synced`);
  }

  async function handleDelete(id: string) {
    if (await confirmToast("Remove this store connection?")) {
      await remove(id);
      toast.success("Store removed");
    }
  }

  const totalActive   = stores.filter(s => s.status === "active").length;
  const totalOrders   = stores.reduce((a, s) => a + s.ordersToday, 0);
  const totalProducts = stores.reduce((a, s) => a + s.productCount, 0);

  return (
    <div style={{ fontFamily: F, minHeight: "100vh", padding: "28px 24px", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Online Store Sync</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Connect Shopify, WooCommerce, Daraz or Amazon — sync inventory, prices and orders automatically.
          </p>
        </div>
        <button onClick={openCreate} style={{ padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#db2777)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
          + Connect Store
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Stores Connected", value: stores.length,  color: "#a78bfa" },
          { label: "Active Syncs",     value: totalActive,    color: "#10b981" },
          { label: "Products Synced",  value: totalProducts,  color: "#38bdf8" },
          { label: "Orders Today",     value: totalOrders,    color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Store cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading…</div>
      ) : stores.length === 0 ? (
        <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 16, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🛒</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No stores connected yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 22, maxWidth: 400, margin: "0 auto 22px" }}>
            Connect your online store to automatically sync inventory levels, update prices, and pull orders into invoices.
          </div>
          <button onClick={openCreate} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#db2777)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: F }}>
            + Connect Your First Store
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
          {stores.map(store => {
            const sm = STATUS_META[store.status];
            const pc = PLATFORM_COLOR[store.platform];
            return (
              <div key={store.id} style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${pc}20`, border: `1px solid ${pc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {PLATFORM_ICON[store.platform]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{store.name}</div>
                      <div style={{ fontSize: 11, color: pc, fontWeight: 700 }}>{store.platform}</div>
                    </div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  🔗 {store.storeUrl || "—"}
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "Inventory", on: store.syncInventory },
                    { label: "Prices",    on: store.syncPrices    },
                    { label: "Orders",    on: store.syncOrders    },
                  ].map(t => (
                    <span key={t.label} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: t.on ? "rgba(16,185,129,.1)" : "rgba(255,255,255,.04)",
                      color: t.on ? "#10b981" : "var(--text-muted)",
                      border: `1px solid ${t.on ? "rgba(16,185,129,.28)" : BD}` }}>
                      {t.on ? "✓" : "—"} {t.label}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 14, marginBottom: 14, fontSize: 12 }}>
                  <span style={{ color: "var(--text-muted)" }}>Products: <b style={{ color: "var(--text-primary)" }}>{store.productCount}</b></span>
                  <span style={{ color: "var(--text-muted)" }}>Today: <b style={{ color: "#fbbf24" }}>{store.ordersToday} orders</b></span>
                </div>
                {store.lastSync && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Last sync: {store.lastSync}</div>
                )}

                <div style={{ display: "flex", gap: 7 }}>
                  <button onClick={() => handleSync(store.id, store.name)} disabled={syncing === store.id} style={{ flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: "rgba(99,102,241,.14)", color: "#a5b4fc", fontFamily: F }}>
                    {syncing === store.id ? "⟳ Syncing…" : "⟳ Sync Now"}
                  </button>
                  <button onClick={() => toggleStatus(store.id, store.status)} style={{ padding: "7px 11px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${BD}`, background: "none", color: "var(--text-muted)", fontFamily: F }}>
                    {store.status === "active" ? "⏸" : "▶"}
                  </button>
                  <button onClick={() => openEdit(store)} style={{ padding: "7px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: `1px solid ${BD}`, background: "none", color: "var(--text-muted)", fontFamily: F }}>✎</button>
                  <button onClick={() => handleDelete(store.id)} style={{ padding: "7px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "none", background: "rgba(239,68,68,.1)", color: "#f87171", fontFamily: F }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg,#1a1d2e)", border: `1px solid ${BD}`, borderRadius: 18, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>{editId ? "Edit Store" : "Connect New Store"}</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Store Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Shopify Store" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Platform</label>
                <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value as Platform }))} style={inp}>
                  {(["Shopify","WooCommerce","Daraz","Amazon","Custom"] as Platform[]).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>Store URL *</label>
                <input value={form.storeUrl} onChange={e => setForm(p => ({ ...p, storeUrl: e.target.value }))} placeholder="yourstore.myshopify.com" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5 }}>API Key / Token</label>
                <input value={form.apiKey} onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))} placeholder="Access token or API key" style={inp} type="password" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>Sync Options</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {([
                    { key: "syncInventory" as const, label: "Sync Inventory (stock levels → store)" },
                    { key: "syncPrices"    as const, label: "Sync Prices (sale rates → store)"     },
                    { key: "syncOrders"   as const, label: "Pull Orders into Sales Invoices"       },
                  ]).map(opt => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={form[opt.key]} onChange={e => setForm(p => ({ ...p, [opt.key]: e.target.checked }))} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
              <button onClick={close} style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${BD}`, background: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: F, fontSize: 13 }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: "9px 22px", borderRadius: 9, background: "linear-gradient(135deg,#ec4899,#db2777)", border: "none", color: "#fff", cursor: "pointer", fontFamily: F, fontSize: 13, fontWeight: 700 }}>
                {saving ? "Saving…" : editId ? "Update" : "Connect Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
