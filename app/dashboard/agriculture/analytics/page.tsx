"use client";

import { useEffect, useMemo, useState } from "react";
import { AgricultureControlCenter, agricultureBg, agricultureBorder, agricultureFont, agricultureMuted, fetchJson } from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: agricultureMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: agricultureMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

const emptyState: AgricultureControlCenter = {
  summary: {
    fields: 0,
    activeFields: 0,
    totalArea: 0,
    crops: 0,
    growingCrops: 0,
    failedCrops: 0,
    harvests: 0,
    harvestQuantity: 0,
    harvestRevenue: 0,
    livestockGroups: 0,
    livestockCount: 0,
    healthyAnimals: 0,
  },
  crops: [],
  fields: [],
  livestock: [],
  harvests: [],
};

export default function AgricultureAnalyticsPage() {
  const [data, setData] = useState<AgricultureControlCenter>(emptyState);

  useEffect(() => {
    fetchJson("/api/agriculture/control-center", emptyState).then(setData);
  }, []);

  const avgYieldPerHarvest = data.harvests.length ? Math.round(data.summary.harvestQuantity / data.harvests.length) : 0;

  const cropMix = useMemo(() => {
    const cropMixMap = new Map<string, number>();
    data.crops.forEach((crop) => {
      cropMixMap.set(crop.name, (cropMixMap.get(crop.name) || 0) + 1);
    });
    return [...cropMixMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data.crops]);

  const topBuyers = useMemo(() => {
    const buyerMap = new Map<string, number>();
    data.harvests.forEach((harvest) => {
      const buyer = harvest.buyer || "Walk-in";
      buyerMap.set(buyer, (buyerMap.get(buyer) || 0) + harvest.revenue);
    });
    return [...buyerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data.harvests]);

  const activeArea = data.fields.filter((field) => field.status === "active").reduce((sum, field) => sum + field.area, 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: agricultureFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Agriculture Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Yield, land utilization, and farm-side revenue</h1>
        <p style={{ margin: 0, fontSize: 14, color: agricultureMuted, maxWidth: 760 }}>
          This board shows crop mix, top buyers, and active land productivity from the live farm records.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Harvest Revenue" value={`Rs. ${data.summary.harvestRevenue.toLocaleString()}`} note="Recorded harvest sales" color="#34d399" />
        <Metric title="Active Land" value={`${activeArea.toFixed(1)} acres`} note={`${data.summary.fields} fields registered`} color="#60a5fa" />
        <Metric title="Average Yield" value={`${avgYieldPerHarvest}`} note="Per harvest record" color="#f59e0b" />
        <Metric title="Livestock Base" value={String(data.summary.livestockCount)} note="Animals on record" color="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Crop Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {cropMix.length === 0 ? (
              <div style={{ color: agricultureMuted, fontSize: 13 }}>Add crop cycles to see the crop mix here.</div>
            ) : cropMix.map(([crop, count]) => {
              const pct = data.crops.length ? Math.max(10, Math.round((count / data.crops.length) * 100)) : 10;
              return (
                <div key={crop}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{crop}</span>
                    <span style={{ fontSize: 12, color: agricultureMuted }}>{count} cycles</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#f59e0b)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Buyers</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topBuyers.length === 0 ? (
              <div style={{ color: agricultureMuted, fontSize: 13 }}>Add harvest sales to see buyer revenue here.</div>
            ) : topBuyers.map(([buyer, value]) => (
              <div key={buyer} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{buyer}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
