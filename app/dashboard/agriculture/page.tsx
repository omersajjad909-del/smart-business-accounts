"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgricultureControlCenter, agricultureBg, agricultureBorder, agricultureFont, agricultureMuted, fetchJson } from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: agricultureMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
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

export default function AgricultureOverviewPage() {
  const [data, setData] = useState<AgricultureControlCenter>(emptyState);

  useEffect(() => {
    fetchJson("/api/agriculture/control-center", emptyState).then(setData);
  }, []);

  const topFields = useMemo(() => [...data.fields].sort((a, b) => b.area - a.area).slice(0, 4), [data.fields]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: agricultureFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Agriculture / Farm</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Farm Control Center</h1>
        <p style={{ margin: 0, fontSize: 14, color: agricultureMuted, maxWidth: 760 }}>
          Field planning, crop cycles, livestock records, and harvest sales now roll up through one agriculture control center.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Fields" value={data.summary.fields} tone="#34d399" />
        <StatCard label="Total Area" value={`${data.summary.totalArea.toFixed(1)} acres`} tone="#f59e0b" />
        <StatCard label="Growing Crops" value={data.summary.growingCrops} tone="#60a5fa" />
        <StatCard label="Livestock" value={data.summary.livestockCount} tone="#a78bfa" />
        <StatCard label="Harvest Revenue" value={`Rs. ${data.summary.harvestRevenue.toLocaleString()}`} tone="#22c55e" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,.12), rgba(245,158,11,.1))", border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#dcfce7", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Business Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Prepare Field", body: `${data.summary.activeFields} active field blocks are in current rotation.` },
              { title: "Plant Crop", body: `${data.summary.crops} crop cycles are recorded across the farm.` },
              { title: "Track Livestock", body: `${data.summary.healthyAnimals} healthy animals are currently on the books.` },
              { title: "Record Harvest", body: `${data.summary.harvests} harvest records have produced Rs. ${data.summary.harvestRevenue.toLocaleString()}.` },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(134,239,172,.16)", color: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/agriculture/fields", label: "Manage Fields", hint: "Soil, area, and irrigation control" },
              { href: "/dashboard/agriculture/crops", label: "Track Crops", hint: "Planting, growth, and harvest planning" },
              { href: "/dashboard/agriculture/livestock", label: "Open Livestock Desk", hint: "Animal records and health reading" },
              { href: "/dashboard/agriculture/harvest", label: "Record Harvest", hint: "Yield and buyer-side revenue capture" },
              { href: "/dashboard/agriculture/analytics", label: "See Farm Analytics", hint: "Yield, revenue, and utilization insights" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: agricultureMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Largest Active Fields</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topFields.length === 0 ? (
              <div style={{ color: agricultureMuted, fontSize: 13 }}>Top land blocks will appear here once fields are added.</div>
            ) : topFields.map((field) => (
              <div key={field.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{field.name}</div>
                  <div style={{ fontSize: 12, color: agricultureMuted }}>{field.soilType} | {field.irrigationType}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: field.status === "active" ? "#34d399" : "#94a3b8" }}>{field.area.toFixed(1)} acres</div>
                  <div style={{ fontSize: 12, color: agricultureMuted }}>{field.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: agricultureBg, border: `1px solid ${agricultureBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Harvest quantity", value: `${data.summary.harvestQuantity.toLocaleString()} total units`, tone: "#60a5fa" },
              { label: "Active crop cycles", value: `${data.summary.growingCrops} running`, tone: "#34d399" },
              { label: "Failed crops", value: `${data.summary.failedCrops} at risk`, tone: "#f87171" },
              { label: "Animal groups", value: `${data.summary.livestockGroups} types recorded`, tone: "#f59e0b" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: agricultureMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
