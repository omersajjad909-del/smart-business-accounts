"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { mapFinishedGoodsRecord, mapQualityCheckRecord } from "../_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ManufacturingQualityPage() {
  const qualityStore = useBusinessRecords("quality_check");
  const finishedGoodsStore = useBusinessRecords("finished_good_batch");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    itemName: "",
    stage: "final",
    inspector: "",
    result: "passed",
    notes: "",
    checkedDate: new Date().toISOString().slice(0, 10),
  });

  const checks = useMemo(() => qualityStore.records.map(mapQualityCheckRecord), [qualityStore.records]);
  const finishedGoods = useMemo(() => finishedGoodsStore.records.map(mapFinishedGoodsRecord), [finishedGoodsStore.records]);

  async function save() {
    if (!form.itemName) return;
    await qualityStore.create({
      title: form.itemName,
      status: form.result,
      date: form.checkedDate,
      data: {
        inspectionNo: `QC-${String(checks.length + 1).padStart(4, "0")}`,
        stage: form.stage,
        inspector: form.inspector,
        notes: form.notes,
      },
    });
    setShowModal(false);
    setForm({
      itemName: "",
      stage: "final",
      inspector: "",
      result: "passed",
      notes: "",
      checkedDate: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Quality Control</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Inspect in-process and finished production batches before dispatch.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#a855f7", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Inspection
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Checks", value: checks.length, color: "#a855f7" },
          { label: "Passed", value: checks.filter((item) => item.result === "passed").length, color: "#22c55e" },
          { label: "Rejected", value: checks.filter((item) => item.result === "rejected").length, color: "#ef4444" },
          { label: "Finished Goods Tracked", value: finishedGoods.length, color: "#38bdf8" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Inspection", "Item", "Stage", "Inspector", "Date", "Result"].map((head) => (
                  <th key={head} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${border}`, fontWeight: 600 }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.id}>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.55)" }}>{check.inspectionNo}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", fontWeight: 700 }}>{check.itemName}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{check.stage}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{check.inspector || "Not assigned"}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>{check.checkedDate}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                    <span style={{ display: "inline-block", background: check.result === "passed" ? "rgba(34,197,94,.15)" : check.result === "rejected" ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.15)", color: check.result === "passed" ? "#22c55e" : check.result === "rejected" ? "#ef4444" : "#f59e0b", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
                      {check.result.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {!qualityStore.loading && checks.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
                    No quality inspections recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Latest Finished Batches</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {finishedGoods.slice(0, 5).map((batch) => (
              <div key={batch.id} style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,.02)" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{batch.product}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 4 }}>
                  {batch.batchNo} • Qty {batch.quantity} • {batch.productionDate}
                </div>
              </div>
            ))}
            {!finishedGoods.length && <div style={{ color: "rgba(255,255,255,.3)" }}>No finished goods batches yet.</div>}
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 520, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Quality Inspection</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Item / Batch</label>
                <input list="manufacturing-finished-goods" value={form.itemName} onChange={(e) => setForm((current) => ({ ...current, itemName: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-finished-goods">
                  {finishedGoods.map((batch) => (
                    <option key={batch.id} value={`${batch.product} (${batch.batchNo})`} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Stage</label>
                <select value={form.stage} onChange={(e) => setForm((current) => ({ ...current, stage: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="incoming">Incoming</option>
                  <option value="in_process">In Process</option>
                  <option value="final">Final</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Inspector</label>
                <input value={form.inspector} onChange={(e) => setForm((current) => ({ ...current, inspector: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Result</label>
                <select value={form.result} onChange={(e) => setForm((current) => ({ ...current, result: e.target.value }))} style={{ width: "100%", background: "#161b27", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff" }}>
                  <option value="passed">Passed</option>
                  <option value="rejected">Rejected</option>
                  <option value="hold">Hold</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Checked Date</label>
                <input type="date" value={form.checkedDate} onChange={(e) => setForm((current) => ({ ...current, checkedDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#a855f7", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Inspection</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
