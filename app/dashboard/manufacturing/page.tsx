"use client";

import { useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapBomRecord,
  mapFinishedGoodsRecord,
  mapProductionOrderRecord,
  mapQualityCheckRecord,
  mapRawMaterialRecord,
  mapWorkOrderRecord,
} from "./_shared";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function ManufacturingOverviewPage() {
  const bom = useBusinessRecords("bom");
  const productionOrders = useBusinessRecords("production_order");
  const workOrders = useBusinessRecords("work_order");
  const rawMaterials = useBusinessRecords("raw_material");
  const finishedGoods = useBusinessRecords("finished_good_batch");
  const qualityChecks = useBusinessRecords("quality_check");

  const stats = useMemo(() => {
    const boms = bom.records.map(mapBomRecord);
    const production = productionOrders.records.map(mapProductionOrderRecord);
    const works = workOrders.records.map(mapWorkOrderRecord);
    const materials = rawMaterials.records.map(mapRawMaterialRecord);
    const goods = finishedGoods.records.map(mapFinishedGoodsRecord);
    const quality = qualityChecks.records.map(mapQualityCheckRecord);

    return {
      bomCount: boms.length,
      plannedProduction: production.filter((item) => item.status === "planned").length,
      runningProduction: production.filter((item) => item.status === "in_progress").length,
      completedProduction: production.filter((item) => item.status === "completed").length,
      openWorkOrders: works.filter((item) => item.status !== "completed").length,
      blockedProduction: production.filter((item) =>
        item.status === "in_progress" &&
        works.some((work) => work.linkedProductionOrderId === item.orderId && work.status !== "completed")
      ).length,
      lowMaterials: materials.filter((item) => item.isLow).length,
      materialValue: materials.reduce((sum, item) => sum + item.currentStock * item.unitCost, 0),
      finishedQuantity: goods.reduce((sum, item) => sum + item.quantity, 0),
      passedChecks: quality.filter((item) => item.result === "passed").length,
      rejectedChecks: quality.filter((item) => item.result === "rejected").length,
      recentOrders: production.slice(0, 5),
    };
  }, [bom.records, productionOrders.records, workOrders.records, rawMaterials.records, finishedGoods.records, qualityChecks.records]);

  const loading = bom.loading || productionOrders.loading || workOrders.loading || rawMaterials.loading || finishedGoods.loading || qualityChecks.loading;

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Manufacturing Command Center</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>
          Raw material planning, production control, work orders, finished goods aur quality monitoring aik jagah.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { label: "BOMs", value: stats.bomCount, color: "#f97316" },
          { label: "Running Production", value: stats.runningProduction, color: "#f59e0b" },
          { label: "Open Work Orders", value: stats.openWorkOrders, color: "#38bdf8" },
          { label: "Low Materials", value: stats.lowMaterials, color: "#ef4444" },
          { label: "Finished Goods Qty", value: stats.finishedQuantity, color: "#34d399" },
          { label: "Material Stock Value", value: `Rs. ${stats.materialValue.toLocaleString()}`, color: "#22c55e" },
          { label: "Passed QC", value: stats.passedChecks, color: "#22c55e" },
          { label: "Rejected QC", value: stats.rejectedChecks, color: "#ef4444" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr .9fr", gap: 16 }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Recent Production Orders</div>
          {loading ? (
            <div style={{ color: "rgba(255,255,255,.35)", padding: "20px 0" }}>Loading manufacturing overview...</div>
          ) : stats.recentOrders.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.recentOrders.map((order) => (
                <div key={order.id} style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", background: "rgba(255,255,255,.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{order.product}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                        {order.orderId} • Qty {order.completed}/{order.quantity} • Due {order.plannedDate || "Not set"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: order.status === "completed" ? "#34d399" : order.status === "in_progress" ? "#f59e0b" : "#818cf8" }}>
                      {order.status.replace("_", " ").toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "rgba(255,255,255,.28)", padding: "20px 0" }}>No production orders yet.</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Production Snapshot</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.7 }}>
              Planned: {stats.plannedProduction}
              <br />
              In Progress: {stats.runningProduction}
              <br />
              Completed: {stats.completedProduction}
              <br />
              Blocked By Open Work Orders: {stats.blockedProduction}
            </div>
          </div>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Enterprise Alerts</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.7 }}>
              Low Materials: <span style={{ color: stats.lowMaterials ? "#f87171" : "#22c55e" }}>{stats.lowMaterials}</span>
              <br />
              Open Work Orders: <span style={{ color: stats.openWorkOrders ? "#f59e0b" : "#22c55e" }}>{stats.openWorkOrders}</span>
              <br />
              Rejected QC: <span style={{ color: stats.rejectedChecks ? "#f87171" : "#22c55e" }}>{stats.rejectedChecks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
