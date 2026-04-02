"use client";

import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  agricultureBg,
  agricultureBorder,
  agricultureFont,
  agricultureMuted,
  mapCrops,
  mapFields,
  mapHarvest,
  mapLivestock,
} from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: agricultureMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: agricultureMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function AgricultureAnalyticsPage() {
  const crops = mapCrops(useBusinessRecords("crop").records);
  const fields = mapFields(useBusinessRecords("field").records);
  const livestock = mapLivestock(useBusinessRecords("livestock").records);
  const harvests = mapHarvest(useBusinessRecords("harvest").records);

  const revenue = harvests.reduce((sum, harvest) => sum + harvest.revenue, 0);
  const activeArea = fields.filter((field) => field.status === "active").reduce((sum, field) => sum + field.area, 0);
  const yieldTotal = harvests.reduce((sum, harvest) => sum + harvest.quantity, 0);
  const avgYieldPerHarvest = harvests.length ? Math.round(yieldTotal / harvests.length) : 0;

  const cropMixMap = new Map<string, number>();
  crops.forEach((crop) => {
    cropMixMap.set(crop.name, (cropMixMap.get(crop.name) || 0) + 1);
  });
  const cropMix = [...cropMixMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const buyerMap = new Map<string, number>();
  harvests.forEach((harvest) => {
    const buyer = harvest.buyer || "Walk-in";
    buyerMap.set(buyer, (buyerMap.get(buyer) || 0) + harvest.revenue);
  });
  const topBuyers = [...buyerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: agricultureFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Agriculture Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Yield, land utilization, aur farm-side revenue</h1>
        <p style={{ margin: 0, fontSize: 14, color: agricultureMuted, maxWidth: 760 }}>
          Is board se farm owner ko pata chalta hai ke kaunsa crop mix chal raha hai, kis buyer se zyada revenue aa raha hai, aur active land kitna productive hai.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Harvest Revenue" value={`Rs. ${revenue.toLocaleString()}`} note="Recorded harvest sales" color="#34d399" />
        <Metric title="Active Land" value={`${activeArea.toFixed(1)} acres`} note={`${fields.length} fields registered`} color="#60a5fa" />
        <Metric title="Average Yield" value={`${avgYieldPerHarvest}`} note="Per harvest record" color="#f59e0b" />
        <Metric title="Livestock Base" value={String(livestock.reduce((sum, animal) => sum + animal.count, 0))} note="Animals on record" color="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Crop Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {cropMix.length === 0 ? (
              <div style={{ color: agricultureMuted, fontSize: 13 }}>Crop mix show karne ke liye crop cycles add karein.</div>
            ) : cropMix.map(([crop, count]) => {
              const pct = crops.length ? Math.max(10, Math.round((count / crops.length) * 100)) : 10;
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
              <div style={{ color: agricultureMuted, fontSize: 13 }}>Buyer revenue dekhne ke liye harvest sales add karein.</div>
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
