"use client";

import toast from "react-hot-toast";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapBomRecord, mapFinishedGoodsRecord, mapProductionOrderRecord, mapWorkOrderRecord,
  quoteProductionRun, type ProductionRunQuote,
} from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const statusColor: Record<string, string> = { planned: "#818cf8", in_progress: "#f59e0b", running: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

type ProductionOrder = ReturnType<typeof mapProductionOrderRecord>;

export default function ProductionOrdersPage() {
  const { isMobile } = useResponsive();
  const orderStore = useBusinessRecords("production_order");
  const bomStore = useBusinessRecords("bom");
  const goodsStore = useBusinessRecords("finished_good_batch");
  const workStore = useBusinessRecords("work_order");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  // Completion dialog — priced before anything is written.
  const [runOrder, setRunOrder] = useState<ProductionOrder | null>(null);
  const [runQty, setRunQty] = useState(1);
  const [runQuote, setRunQuote] = useState<ProductionRunQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [allowShort, setAllowShort] = useState(false);
  const [form, setForm] = useState({
    product: "",
    bomId: "",
    quantity: 1,
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedTo: "",
    notes: "",
  });

  const orders = useMemo(() => orderStore.records.map(mapProductionOrderRecord), [orderStore.records]);
  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const finishedGoods = useMemo(() => goodsStore.records.map(mapFinishedGoodsRecord), [goodsStore.records]);
  const workOrders = useMemo(() => workStore.records.map(mapWorkOrderRecord), [workStore.records]);

  async function save() {
    if (!form.product.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.bomId) {
      setFormError("Linked BOM is required.");
      return;
    }
    if (form.quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (!form.plannedDate) {
      setFormError("Planned date is required.");
      return;
    }
    setFormError("");
    const selectedBom = boms.find((item) => item.id === form.bomId) || boms.find((item) => item.product === form.product);
    await orderStore.create({
      title: form.product,
      status: "planned",
      date: form.plannedDate,
      data: {
        orderId: `PO-${String(orders.length + 1).padStart(4, "0")}`,
        quantity: form.quantity,
        completed: 0,
        assignedTo: form.assignedTo,
        notes: form.notes,
        bomId: selectedBom?.id || "",
        bomVersion: selectedBom?.version || "",
      },
    });
    setShowModal(false);
    setForm({
      product: "",
      bomId: "",
      quantity: 1,
      plannedDate: new Date().toISOString().slice(0, 10),
      assignedTo: "",
      notes: "",
    });
    setFormError("");
  }

  async function startOrder(orderId: string) {
    await orderStore.update(orderId, { status: "in_progress" });
  }

  /**
   * Completing an order used to just flip a status and write a finished-goods
   * row — no material left stock and nothing reached the ledger. Now it opens a
   * costed preview first; the server does the consuming and posting.
   */
  async function openCompleteDialog(order: ProductionOrder) {
    const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
    if (linkedWorkOrders.some((item) => item.status !== "completed")) {
      toast("Complete linked work orders before finishing this production order.");
      return;
    }
    const remaining = Math.max(order.quantity - order.completed, 1);
    setRunOrder(order);
    setRunQty(remaining);
    setRunError("");
    setRunQuote(null);
    setQuoting(true);
    const quote = await quoteProductionRun(order.id, remaining);
    setQuoting(false);
    if (!quote) { setRunError("Could not reach the server."); return; }
    if (quote.error) { setRunError(quote.error); return; }
    setRunQuote(quote);
  }

  async function requote(qty: number) {
    if (!runOrder || qty <= 0) return;
    setQuoting(true);
    const quote = await quoteProductionRun(runOrder.id, qty);
    setQuoting(false);
    if (quote && !quote.error) setRunQuote(quote);
  }

  async function confirmRun() {
    if (!runOrder) return;
    setRunning(true);
    setRunError("");
    try {
      const res = await fetch("/api/manufacturing/production-orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productionOrderId: runOrder.id, producedQty: runQty, allowNegativeStock: allowShort }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not complete the run.");
      toast.success(
        `${body.producedQty} units received · batch ${body.batchNo} · Rs. ${Math.round(body.totalCost).toLocaleString()} to Finished Goods`,
      );
      setRunOrder(null);
      setRunQuote(null);
      await Promise.all([orderStore.refetch?.(), goodsStore.refetch?.()]);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Could not complete the run.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Production Orders</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>Issue shop-floor production based on BOMs and push completed orders into finished goods.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Orders", value: orders.length, color: "#f97316" },
          { label: "Planned", value: orders.filter((item) => item.status === "planned").length, color: "#818cf8" },
          { label: "In Progress", value: orders.filter((item) => item.status === "in_progress").length, color: "#f59e0b" },
          { label: "Completed To FG", value: orders.filter((item) => item.status === "completed").length, color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => {
          const linkedBom = boms.find((item) => item.id === order.bomId) || boms.find((item) => item.product === order.product);
          const progress = order.quantity > 0 ? Math.round((order.completed / order.quantity) * 100) : 0;
          const fgCreated = finishedGoods.some((item) => item.productionOrderId === order.orderId);
          const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
          const incompleteWorkOrders = linkedWorkOrders.filter((item) => item.status !== "completed").length;
          return (
            <div key={order.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{order.product}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                    {order.orderId} • BOM {linkedBom?.version || order.bomVersion || "Not linked"} • Qty {order.completed}/{order.quantity}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: statusColor[order.status] || "#94a3b8" }}>{order.status.replace("_", " ").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>
                Due {order.plannedDate || "Not set"} • Assigned {order.assignedTo || "Unassigned"} • {fgCreated ? "Finished goods batch created" : "FG pending"} • Work orders open {incompleteWorkOrders}
              </div>
              <div style={{ background: "rgba(255,255,255,.08)", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: statusColor[order.status] || "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.status === "planned" && (
                  <button onClick={() => startOrder(order.id)} style={{ padding: "7px 14px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Start
                  </button>
                )}
                {(order.status === "in_progress" || order.status === "running") && (
                  <button onClick={() => openCompleteDialog(order)} style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Record production →
                  </button>
                )}
                {order.status !== "completed" && order.status !== "cancelled" && (
                  <button onClick={() => orderStore.update(order.id, { status: "cancelled" })} style={{ padding: "7px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#ef4444", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!orderStore.loading && orders.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
            No production orders yet.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 540, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Production Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Product</label>
                <input list="manufacturing-boms" value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-boms">
                  {boms.map((item) => <option key={item.id} value={item.product} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Linked BOM</label>
                <select value={form.bomId} onChange={(e) => {
                  const selectedBom = boms.find((item) => item.id === e.target.value);
                  setForm((current) => ({ ...current, bomId: e.target.value, product: selectedBom?.product || current.product }));
                }} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="">Select BOM</option>
                  {boms.map((item) => <option key={item.id} value={item.id}>{item.product} • {item.version}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Planned Date</label>
                <input type="date" value={form.plannedDate} onChange={(e) => setForm((current) => ({ ...current, plannedDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm((current) => ({ ...current, assignedTo: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record production ──
          Shows exactly what will leave stock, what it costs and where the money
          lands, before anything is written. */}
      {runOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto", fontFamily: ff }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Record production</h2>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.42)", marginBottom: 18 }}>
              {runOrder.orderId} · {runOrder.product} · {runOrder.completed}/{runOrder.quantity} done
            </div>

            {runError && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>{runError}</div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Units finished in this run</label>
              <input
                type="number" min={1} value={runQty}
                onChange={(e) => setRunQty(Math.max(1, Number(e.target.value) || 1))}
                onBlur={(e) => requote(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: 180, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }}
              />
            </div>

            {quoting && <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", padding: "12px 0" }}>Costing this run…</div>}

            {runQuote && !quoting && (
              <>
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,.03)" }}>
                        {["Material", "Needed", "In stock", "Cost"].map((h, i) => (
                          <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runQuote.lines.map((line) => {
                        const short = line.availableQty < line.requiredQty;
                        return (
                          <tr key={line.itemId} style={{ borderTop: `1px solid ${border}` }}>
                            <td style={{ padding: "10px 14px", fontSize: 12.5 }}>{line.itemName}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>{line.requiredQty}{line.unit}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: short ? "#fca5a5" : "rgba(255,255,255,.55)", fontWeight: short ? 700 : 400 }}>{line.availableQty}{line.unit}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: "rgba(255,255,255,.62)" }}>Rs. {Math.round(line.lineCost).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {runQuote.shortages.length > 0 && (
                  <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.26)" }}>
                    <div style={{ fontSize: 12.5, color: "#fca5a5", fontWeight: 700, marginBottom: 6 }}>Not enough material for {runQuote.shortages.length} item(s)</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
                      <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} />
                      Produce anyway — stock will go negative until the purchase is entered
                    </label>
                  </div>
                )}

                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Total material cost</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>Rs. {Math.round(runQuote.totalCost).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.42)" }}>
                    <span>Per unit</span><span>Rs. {Math.round(runQuote.unitCost).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.7, marginBottom: 16 }}>
                  Dr Work In Progress → Cr Raw Material Stock, then Dr Finished Goods → Cr Work In Progress.
                  Material leaves stock, {runQty} × {runOrder.product} arrives at cost.
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={confirmRun}
                disabled={running || quoting || !runQuote || (runQuote.shortages.length > 0 && !allowShort)}
                style={{
                  flex: 1, padding: "11px 0", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700,
                  background: running || !runQuote || (runQuote.shortages.length > 0 && !allowShort) ? "rgba(34,197,94,.35)" : "#22c55e",
                  cursor: running || !runQuote ? "not-allowed" : "pointer",
                }}
              >
                {running ? "Recording…" : "Confirm production"}
              </button>
              <button onClick={() => { setRunOrder(null); setRunQuote(null); setAllowShort(false); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

