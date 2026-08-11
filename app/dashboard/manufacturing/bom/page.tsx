"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapBomRecord,
  mapProductionOrderRecord,
  loadManufacturingItems,
  type ManufacturingItem,
  type BomLineInput,
} from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

type LineDraft = { itemId: string; qty: string };

export default function BOMPage() {
  const { isMobile } = useResponsive();
  const bomStore = useBusinessRecords("bom");
  const productionStore = useBusinessRecords("production_order");

  const [rawMaterials, setRawMaterials] = useState<ManufacturingItem[]>([]);
  const [finishedItems, setFinishedItems] = useState<ManufacturingItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ finishedItemId: "", version: "v1.0", yieldUnits: 1, labourPerBatch: 0, overheadPerBatch: 0 });
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", qty: "" }]);

  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const orders = useMemo(() => productionStore.records.map(mapProductionOrderRecord), [productionStore.records]);
  const itemsById = useMemo(
    () => new Map([...rawMaterials, ...finishedItems].map((i) => [i.id, i])),
    [rawMaterials, finishedItems],
  );

  useEffect(() => {
    loadManufacturingItems("RAW_MATERIAL").then(setRawMaterials);
    loadManufacturingItems("FINISHED").then(setFinishedItems);
  }, []);

  // Cost is derived from what the materials actually cost, not typed in. A BOM
  // whose cost is a guess cannot tell a factory owner their per-unit cost, which
  // is the only question they open this screen to answer.
  const draftCost = useMemo(() => {
    let total = 0;
    for (const line of lines) {
      const item = itemsById.get(line.itemId);
      const qty = Number(line.qty);
      if (!item || !Number.isFinite(qty) || qty <= 0) continue;
      total += qty * item.unitCost;
    }
    const yieldUnits = form.yieldUnits > 0 ? form.yieldUnits : 1;
    // Conversion cost counts too — a bag costs the roll plus the labour and
    // machine time that turned the roll into a bag.
    const conversion = (Number(form.labourPerBatch) || 0) + (Number(form.overheadPerBatch) || 0);
    const batchCost = total + conversion;
    return { materialCost: total, conversion, batchCost, unitCost: batchCost / yieldUnits };
  }, [lines, itemsById, form.yieldUnits, form.labourPerBatch, form.overheadPerBatch]);

  function setLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function save() {
    const finished = itemsById.get(form.finishedItemId);
    if (!finished) { setFormError("Pick the finished product this BOM makes."); return; }
    if (form.yieldUnits <= 0) { setFormError("Yield must be greater than zero."); return; }

    const cleaned: BomLineInput[] = [];
    for (const line of lines) {
      const qty = Number(line.qty);
      if (!line.itemId) continue;
      if (!Number.isFinite(qty) || qty <= 0) {
        setFormError("Every material line needs a quantity greater than zero.");
        return;
      }
      cleaned.push({ itemId: line.itemId, qty });
    }
    if (!cleaned.length) { setFormError("Add at least one material."); return; }

    setFormError("");
    setSaving(true);
    try {
      await bomStore.create({
        title: finished.name,
        status: "active",
        amount: draftCost.unitCost,
        data: {
          version: form.version.trim() || "v1.0",
          yield: form.yieldUnits,
          finishedItemId: finished.id,
          lines: cleaned,
          labourPerBatch: Number(form.labourPerBatch) || 0,
          overheadPerBatch: Number(form.overheadPerBatch) || 0,
          // Kept so older readers and the control centre still render a
          // material summary without having to resolve item ids.
          materials: cleaned.map((l) => itemsById.get(l.itemId)?.name).filter(Boolean).join(", "),
        },
      });
      setShowModal(false);
      setForm({ finishedItemId: "", version: "v1.0", yieldUnits: 1, labourPerBatch: 0, overheadPerBatch: 0 });
      setLines([{ itemId: "", qty: "" }]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the BOM.");
    } finally {
      setSaving(false);
    }
  }

  const noItems = rawMaterials.length === 0 && finishedItems.length === 0;

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Bill of Materials</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            What each finished product consumes. Cost is calculated from live material rates.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New BOM
        </button>
      </div>

      {noItems && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(249,115,22,.09)", border: "1px solid rgba(249,115,22,.25)", fontSize: 13, color: "rgba(255,255,255,.62)" }}>
          No inventory items yet. Add your raw materials and finished products on the{" "}
          <a href="/dashboard/manufacturing/raw-materials" style={{ color: "#fb923c", fontWeight: 700 }}>Raw Materials</a>{" "}
          page first — a BOM consumes real stock, so it needs real items.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total BOMs", value: boms.length, color: "#f97316" },
          { label: "Products In Production", value: new Set(orders.map((o) => o.product)).size, color: "#38bdf8" },
          { label: "Raw Materials", value: rawMaterials.length, color: "#22c55e" },
          { label: "Average Unit Cost", value: `Rs. ${boms.length ? Math.round(boms.reduce((s, b) => s + b.unitCost, 0) / boms.length).toLocaleString() : 0}`, color: "#f59e0b" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr .8fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {boms.map((bom) => {
            const linkedOrders = orders.filter((o) => o.product === bom.product).length;
            return (
              <div key={bom.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{bom.product}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                      Version {bom.version} • Yield {bom.yieldUnits} units • Linked orders {linkedOrders}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#22c55e", fontSize: 15, fontWeight: 800 }}>Rs. {Math.round(bom.unitCost).toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>per unit</div>
                  </div>
                </div>
                {bom.lines.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {bom.lines.map((line) => {
                      const item = itemsById.get(line.itemId);
                      const low = item?.isLow;
                      return (
                        <span key={`${bom.id}-${line.itemId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: low ? "rgba(239,68,68,.12)" : "rgba(34,197,94,.12)", color: low ? "#fca5a5" : "#22c55e", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 600 }}>
                          {item?.name ?? "(deleted item)"} × {line.qty}{item?.unit ?? ""}
                          {low ? <span style={{ color: "#ef4444" }}>Low</span> : null}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  // Pre-existing BOMs stored materials as free text with no
                  // quantities, so they cannot drive a production run yet.
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{bom.materials.join(", ") || "No materials listed"}</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.3)", color: "#fb923c", fontSize: 11, fontWeight: 700 }}>
                      Needs quantities before it can be produced
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {!bomStore.loading && boms.length === 0 && (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
              No BOMs defined yet.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Raw materials in stock</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rawMaterials.length ? rawMaterials.slice(0, 10).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "rgba(255,255,255,.62)" }}>{item.name}</span>
                  <span style={{ color: item.isLow ? "#fca5a5" : "#38bdf8", fontWeight: 700 }}>
                    {item.currentStock}{item.unit} · Rs. {Math.round(item.unitCost).toLocaleString()}
                  </span>
                </div>
              )) : <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No raw materials yet.</div>}
            </div>
          </div>

          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Flow</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
              1. Add raw materials and finished products as inventory items.
              <br />2. Build a BOM — pick the product and what a batch consumes.
              <br />3. Raise a production order against the BOM.
              <br />4. Complete the run: material leaves stock, finished goods arrive, WIP posts to the ledger.
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 580, maxHeight: "90vh", overflowY: "auto", fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Bill of Materials</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Finished Product</label>
                <select value={form.finishedItemId} onChange={(e) => setForm((c) => ({ ...c, finishedItemId: e.target.value }))} style={inputStyle}>
                  <option value="">— Select a finished product —</option>
                  {finishedItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Version</label>
                <input value={form.version} onChange={(e) => setForm((c) => ({ ...c, version: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Units per batch</label>
                <input type="number" min={1} value={form.yieldUnits} onChange={(e) => setForm((c) => ({ ...c, yieldUnits: Number(e.target.value) }))} style={inputStyle} />
              </div>
            </div>

            {/* Conversion cost. Leaving these at 0 values finished goods at
                material cost alone, which understates what a batch really cost. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Labour per batch</label>
                <input type="number" min={0} step="any" value={form.labourPerBatch}
                  onChange={(e) => setForm((c) => ({ ...c, labourPerBatch: Number(e.target.value) }))}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Overhead per batch</label>
                <input type="number" min={0} step="any" value={form.overheadPerBatch}
                  onChange={(e) => setForm((c) => ({ ...c, overheadPerBatch: Number(e.target.value) }))}
                  placeholder="0" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>Materials consumed per batch</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lines.map((line, index) => {
                  const item = itemsById.get(line.itemId);
                  const qty = Number(line.qty) || 0;
                  return (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 110px 96px 32px", gap: 8, alignItems: "center" }}>
                      <select value={line.itemId} onChange={(e) => setLine(index, { itemId: e.target.value })} style={inputStyle}>
                        <option value="">— Material —</option>
                        {rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.currentStock}{m.unit})</option>)}
                      </select>
                      <input type="number" min={0} step="any" placeholder="Qty" value={line.qty} onChange={(e) => setLine(index, { qty: e.target.value })} style={inputStyle} />
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", textAlign: "right" }}>
                        {item ? `Rs. ${Math.round(qty * item.unitCost).toLocaleString()}` : "—"}
                      </div>
                      <button
                        onClick={() => setLines((c) => (c.length === 1 ? [{ itemId: "", qty: "" }] : c.filter((_, i) => i !== index)))}
                        title="Remove line"
                        style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "8px 0" }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setLines((c) => [...c, { itemId: "", qty: "" }])} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + Add material
              </button>
            </div>

            <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Calculated from live material rates</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#22c55e" }}>Rs. {Math.round(draftCost.unitCost).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.4)" }}>/ unit</span></div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)" }}>Rs. {Math.round(draftCost.batchCost).toLocaleString()} per batch of {form.yieldUnits || 1}</div>
                {draftCost.conversion > 0 && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>
                    Material Rs. {Math.round(draftCost.materialCost).toLocaleString()} + conversion Rs. {Math.round(draftCost.conversion).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(249,115,22,.5)" : "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Create BOM"}
              </button>
              <button onClick={() => { setShowModal(false); setFormError(""); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
