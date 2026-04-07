"use client";

import { useState, useMemo } from "react";
import { useBusinessRecords, BusinessRecord } from "@/lib/useBusinessRecords";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarehouseForm {
  name: string;
  location: string;
  address: string;
  capacity: string;
  manager: string;
  phone: string;
  isDefault: boolean;
  notes: string;
}

interface TransferForm {
  fromId: string;
  toId: string;
  item: string;
  qty: string;
  notes: string;
}

const EMPTY_WH_FORM: WarehouseForm = { name: "", location: "", address: "", capacity: "", manager: "", phone: "", isDefault: false, notes: "" };
const EMPTY_TX_FORM: TransferForm = { fromId: "", toId: "", item: "", qty: "", notes: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function mapWarehouse(r: BusinessRecord) {
  return {
    id: r.id,
    name: r.title,
    location: (r.data.location as string) || "",
    address: (r.data.address as string) || "",
    status: r.status || "ACTIVE",
    stockValue: r.amount || 0,
    itemsCount: (r.data.itemsCount as number) || 0,
    capacity: (r.data.capacity as number) || 0,
    capacityUsed: (r.data.capacityUsed as number) || 0,
    manager: (r.data.manager as string) || "",
    phone: (r.data.phone as string) || "",
    isDefault: (r.data.isDefault as boolean) || false,
    notes: (r.data.notes as string) || "",
  };
}

function mapTransfer(r: BusinessRecord) {
  return {
    id: r.id,
    from: (r.data.from as string) || "",
    to: (r.data.to as string) || "",
    item: (r.data.item as string) || "",
    qty: (r.data.qty as number) || 0,
    notes: (r.data.notes as string) || "",
    status: r.status || "COMPLETED",
    date: r.date || r.createdAt,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "var(--panel-bg)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.05em",
      background: active ? "#10b98122" : "#6b728022",
      color: active ? "#10b981" : "#9ca3af",
      border: `1px solid ${active ? "#10b98144" : "#6b728044"}`,
    }}>
      {status}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WarehousesPage() {
  const { records: whRecords, loading: whLoading, create: whCreate, setStatus: whSetStatus } =
    useBusinessRecords("warehouse");
  const { records: txRecords, loading: txLoading, create: txCreate } =
    useBusinessRecords("stock_transfer");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [whForm, setWhForm] = useState<WarehouseForm>(EMPTY_WH_FORM);
  const [txForm, setTxForm] = useState<TransferForm>(EMPTY_TX_FORM);
  const [saving, setSaving] = useState(false);
  const [txSaving, setTxSaving] = useState(false);
  const [err, setErr] = useState("");
  const [txErr, setTxErr] = useState("");

  const warehouses = useMemo(() => whRecords.map(mapWarehouse), [whRecords]);
  const transfers = useMemo(() => txRecords.map(mapTransfer).slice(0, 5), [txRecords]);

  // KPIs
  const totalWh = warehouses.length;
  const activeWh = warehouses.filter(w => w.status === "ACTIVE").length;
  const totalStockValue = warehouses.reduce((s, w) => s + w.stockValue, 0);
  const totalSkus = warehouses.reduce((s, w) => s + w.itemsCount, 0);

  // ── Add Warehouse ────────────────────────────────────────────────────────────
  async function handleAddWarehouse() {
    setErr("");
    if (!whForm.name.trim()) { setErr("Warehouse name is required."); return; }
    setSaving(true);
    try {
      await whCreate({
        title: whForm.name.trim(),
        status: "ACTIVE",
        data: {
          location: whForm.location.trim(),
          address: whForm.address.trim(),
          capacity: whForm.capacity ? Number(whForm.capacity) : 0,
          notes: whForm.notes.trim(),
          itemsCount: 0,
          capacityUsed: 0,
        },
        amount: 0,
      });
      setWhForm(EMPTY_WH_FORM);
      setShowAddModal(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  // ── Stock Transfer ───────────────────────────────────────────────────────────
  async function handleTransfer() {
    setTxErr("");
    if (!txForm.fromId) { setTxErr("Select source warehouse."); return; }
    if (!txForm.toId) { setTxErr("Select destination warehouse."); return; }
    if (txForm.fromId === txForm.toId) { setTxErr("Source and destination must differ."); return; }
    if (!txForm.item.trim()) { setTxErr("Item name is required."); return; }
    if (!txForm.qty || Number(txForm.qty) <= 0) { setTxErr("Quantity must be greater than 0."); return; }

    const fromName = warehouses.find(w => w.id === txForm.fromId)?.name || txForm.fromId;
    const toName = warehouses.find(w => w.id === txForm.toId)?.name || txForm.toId;

    setTxSaving(true);
    try {
      await txCreate({
        title: `Transfer: ${txForm.item.trim()} (${txForm.qty}) — ${fromName} → ${toName}`,
        status: "COMPLETED",
        data: {
          from: fromName,
          to: toName,
          fromId: txForm.fromId,
          toId: txForm.toId,
          item: txForm.item.trim(),
          qty: Number(txForm.qty),
          notes: txForm.notes.trim(),
        },
        date: new Date().toISOString(),
      });
      setTxForm(EMPTY_TX_FORM);
      setShowTransferModal(false);
    } catch (e) {
      setTxErr(String(e));
    } finally {
      setTxSaving(false);
    }
  }

  // ── Toggle Status ────────────────────────────────────────────────────────────
  async function toggleStatus(id: string, current: string) {
    await whSetStatus(id, current === "ACTIVE" ? "INACTIVE" : "ACTIVE");
  }

  // ── Shared input style ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--app-bg)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "'Outfit','Inter',sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-muted)",
    marginBottom: 5,
  };

  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 0 };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      fontFamily: "'Outfit','Inter',sans-serif",
      color: "var(--text-primary)",
      padding: "32px 28px",
      minHeight: "100vh",
      background: "var(--app-bg)",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>Warehouses</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            Manage multiple storage locations and stock levels
          </p>
        </div>
        <button
          onClick={() => { setWhForm(EMPTY_WH_FORM); setErr(""); setShowAddModal(true); }}
          style={{
            background: "#06b6d4",
            color: "#fff",
            border: "none",
            borderRadius: 9,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Outfit','Inter',sans-serif",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Warehouse
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 32 }}>
        <KpiCard label="Total Warehouses" value={totalWh} sub="all locations" />
        <KpiCard label="Active" value={activeWh} sub={`${totalWh - activeWh} inactive`} />
        <KpiCard label="Total Stock Value" value={fmtCurrency(totalStockValue)} sub="across all warehouses" />
        <KpiCard label="Total SKUs" value={totalSkus.toLocaleString()} sub="unique items tracked" />
      </div>

      {/* ── Warehouse Cards ─────────────────────────────────────────────────── */}
      {whLoading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>Loading warehouses…</div>
      ) : warehouses.length === 0 ? (
        <div style={{
          background: "var(--panel-bg)",
          border: "1px dashed var(--border)",
          borderRadius: 12,
          padding: 48,
          textAlign: "center",
          color: "var(--text-muted)",
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No warehouses yet</div>
          <div style={{ fontSize: 13 }}>Click "+ Add Warehouse" to create your first storage location.</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
          gap: 20,
          marginBottom: 36,
        }}>
          {warehouses.map(wh => (
            <div key={wh.id} style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              transition: "border-color 0.15s",
            }}>
              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                    {wh.name}
                  </div>
                  {wh.location && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>📍</span> {wh.location}
                    </div>
                  )}
                </div>
                <StatusBadge status={wh.status} />
              </div>

              {/* Mini stats */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                background: "var(--app-bg)",
                borderRadius: 10,
                padding: "12px 8px",
                border: "1px solid var(--border)",
              }}>
                <MiniStat label="Stock Value" value={fmtCurrency(wh.stockValue)} />
                <MiniStat label="Items Count" value={wh.itemsCount.toLocaleString()} />
                <MiniStat
                  label="Capacity Used"
                  value={wh.capacity > 0 ? `${Math.min(100, Math.round((wh.capacityUsed / wh.capacity) * 100))}%` : "—"}
                />
              </div>

              {/* Capacity bar */}
              {wh.capacity > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span>Capacity</span>
                    <span>{wh.capacityUsed.toLocaleString()} / {wh.capacity.toLocaleString()} units</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 4,
                      width: `${Math.min(100, (wh.capacityUsed / wh.capacity) * 100)}%`,
                      background: wh.capacityUsed / wh.capacity > 0.9 ? "#ef4444" :
                        wh.capacityUsed / wh.capacity > 0.7 ? "#f59e0b" : "#06b6d4",
                      transition: "width 0.3s",
                    }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => { setTxForm({ ...EMPTY_TX_FORM, fromId: wh.id }); setTxErr(""); setShowTransferModal(true); }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 7,
                    border: "1px solid #06b6d4",
                    background: "transparent",
                    color: "#06b6d4",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Outfit','Inter',sans-serif",
                  }}
                >
                  View Stock
                </button>
                <button
                  onClick={() => toggleStatus(wh.id, wh.status)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 7,
                    border: `1px solid ${wh.status === "ACTIVE" ? "#6b7280" : "#10b981"}`,
                    background: "transparent",
                    color: wh.status === "ACTIVE" ? "#9ca3af" : "#10b981",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Outfit','Inter',sans-serif",
                  }}
                >
                  {wh.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stock Transfer Section ──────────────────────────────────────────── */}
      <div style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "22px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Stock Transfers</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Move inventory between warehouses</div>
          </div>
          <button
            onClick={() => { setTxForm(EMPTY_TX_FORM); setTxErr(""); setShowTransferModal(true); }}
            style={{
              background: "#06b6d4",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "'Outfit','Inter',sans-serif",
            }}
          >
            <span style={{ fontSize: 16 }}>⇄</span> Transfer Stock
          </button>
        </div>

        {txLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "16px 0" }}>Loading transfers…</div>
        ) : transfers.length === 0 ? (
          <div style={{
            border: "1px dashed var(--border)",
            borderRadius: 10,
            padding: 28,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}>
            No stock transfers recorded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {transfers.map(tx => (
              <div key={tx.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "var(--app-bg)",
                borderRadius: 10,
                border: "1px solid var(--border)",
                flexWrap: "wrap",
                gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {tx.item}
                      <span style={{
                        marginLeft: 8,
                        fontSize: 12,
                        background: "#06b6d422",
                        color: "#06b6d4",
                        padding: "1px 8px",
                        borderRadius: 20,
                        border: "1px solid #06b6d444",
                      }}>
                        Qty: {tx.qty}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      <span style={{ fontWeight: 600 }}>{tx.from}</span>
                      <span style={{ margin: "0 6px", color: "#06b6d4" }}>→</span>
                      <span style={{ fontWeight: 600 }}>{tx.to}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusBadge status={tx.status} />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    {tx.date ? new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Add Warehouse Modal                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "28px 28px 24px",
            width: "100%",
            maxWidth: 480,
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Add Warehouse</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}
              >×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Warehouse Name *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Main Warehouse"
                  value={whForm.name}
                  onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Location / City</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Dubai, UAE"
                  value={whForm.location}
                  onChange={e => setWhForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Address</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 12 Industrial Ave, Zone 3"
                  value={whForm.address}
                  onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Capacity (sq ft or units)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={whForm.capacity}
                  onChange={e => setWhForm(f => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
                  placeholder="Any additional info…"
                  value={whForm.notes}
                  onChange={e => setWhForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {err && (
                <div style={{ background: "#ef444420", border: "1px solid #ef444444", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#ef4444" }}>
                  {err}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-muted)", fontSize: 14, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Outfit','Inter',sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWarehouse}
                  disabled={saving}
                  style={{
                    flex: 2, padding: "10px 0", borderRadius: 8,
                    border: "none", background: saving ? "#0e7a8a" : "#06b6d4",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "'Outfit','Inter',sans-serif",
                    opacity: saving ? 0.75 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Create Warehouse"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* Transfer Stock Modal                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showTransferModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowTransferModal(false); }}
        >
          <div style={{
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "28px 28px 24px",
            width: "100%",
            maxWidth: 480,
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Transfer Stock</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 4 }}
              >×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>From Warehouse *</label>
                <select
                  style={{ ...inputStyle, appearance: "none" }}
                  value={txForm.fromId}
                  onChange={e => setTxForm(f => ({ ...f, fromId: e.target.value }))}
                >
                  <option value="">Select source…</option>
                  {warehouses.filter(w => w.status === "ACTIVE").map(w => (
                    <option key={w.id} value={w.id}>{w.name}{w.location ? ` — ${w.location}` : ""}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ margin: "0 12px", fontSize: 20, color: "#06b6d4" }}>⇄</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>To Warehouse *</label>
                <select
                  style={{ ...inputStyle, appearance: "none" }}
                  value={txForm.toId}
                  onChange={e => setTxForm(f => ({ ...f, toId: e.target.value }))}
                >
                  <option value="">Select destination…</option>
                  {warehouses.filter(w => w.status === "ACTIVE" && w.id !== txForm.fromId).map(w => (
                    <option key={w.id} value={w.id}>{w.name}{w.location ? ` — ${w.location}` : ""}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Item Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Steel Pipes"
                    value={txForm.item}
                    onChange={e => setTxForm(f => ({ ...f, item: e.target.value }))}
                  />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Quantity *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    placeholder="0"
                    value={txForm.qty}
                    onChange={e => setTxForm(f => ({ ...f, qty: e.target.value }))}
                  />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 70 }}
                  placeholder="Reason for transfer, batch number, etc."
                  value={txForm.notes}
                  onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {txErr && (
                <div style={{ background: "#ef444420", border: "1px solid #ef444444", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#ef4444" }}>
                  {txErr}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 8,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-muted)", fontSize: 14, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Outfit','Inter',sans-serif",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={txSaving}
                  style={{
                    flex: 2, padding: "10px 0", borderRadius: 8,
                    border: "none", background: txSaving ? "#0e7a8a" : "#06b6d4",
                    color: "#fff", fontSize: 14, fontWeight: 700,
                    cursor: txSaving ? "not-allowed" : "pointer",
                    fontFamily: "'Outfit','Inter',sans-serif",
                    opacity: txSaving ? 0.75 : 1,
                  }}
                >
                  {txSaving ? "Processing…" : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
