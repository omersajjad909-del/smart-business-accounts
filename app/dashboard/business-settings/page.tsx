"use client";
import { useState, useEffect } from "react";
import { BUSINESS_TYPES } from "@/lib/businessModules";

interface LiveBizType {
  id: string;
  label: string;
  icon: string;
  phase: number;
  category: string;
  description: string;
  isLive: boolean;
}

export default function BusinessSettingsPage() {
  const [current, setCurrent]   = useState<string>("trading");
  const [selected, setSelected] = useState<string>("trading");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);
  const [liveTypes, setLiveTypes] = useState<LiveBizType[]>([]);

  useEffect(() => {
    // Load current business type + live types in parallel
    Promise.all([
      fetch("/api/company/business-type").then(r => r.json()).catch(() => ({})),
      fetch("/api/public/business-types").then(r => r.json()).catch(() => ({ types: [] })),
    ]).then(([bizData, typesData]) => {
      if (bizData.businessType) {
        setCurrent(bizData.businessType);
        setSelected(bizData.businessType);
      }
      const live = (typesData.types || []).filter((t: LiveBizType) => t.isLive);
      setLiveTypes(live);
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/company/business-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: selected, businessSetupDone: true }),
      });
      setCurrent(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setTimeout(() => window.location.href = "/dashboard", 800);
    } catch { setSaving(false); }
  }

  // Get full module config if available, else use icon/label from live types
  const getDisplay = (id: string) => {
    const fullConfig = BUSINESS_TYPES.find(b => b.id === id);
    if (fullConfig) return { icon: fullConfig.icon, label: fullConfig.label, color: fullConfig.color, gradient: fullConfig.gradient, description: fullConfig.description };
    const liveType = liveTypes.find(t => t.id === id);
    return {
      icon: liveType?.icon || "🏢",
      label: liveType?.label || id,
      color: "#818cf8",
      gradient: "linear-gradient(135deg,#6366f1,#4f46e5)",
      description: liveType?.description || "",
    };
  };

  const currentDisplay = getDisplay(current);
  const selectedDisplay = getDisplay(selected);

  return (
    <div style={{ padding: "32px 28px", maxWidth: 960, color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: currentDisplay.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {currentDisplay.icon}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "white" }}>Business Type Settings</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
              Currently: <span style={{ color: currentDisplay.color, fontWeight: 700 }}>{currentDisplay.label}</span> — Change to update your dashboard modules
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading…</div>
      ) : (
        <>
          {/* Info box */}
          <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", marginBottom: 28, fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.6 }}>
            ℹ️ Changing your business type updates your sidebar navigation. Your existing data is <strong style={{ color: "white" }}>not affected</strong>. Only live business types are shown below.
          </div>

          {/* Grid of live types */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 28 }}>
            {liveTypes.map(b => {
              const disp = getDisplay(b.id);
              const isSelected = selected === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelected(b.id)}
                  style={{
                    borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "all .2s",
                    border: `2px solid ${isSelected ? disp.color : "rgba(255,255,255,.07)"}`,
                    background: isSelected ? `${disp.color}10` : "rgba(255,255,255,.02)",
                    boxShadow: isSelected ? `0 0 24px ${disp.color}20` : "none",
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 8 }}>{disp.icon}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "white", marginBottom: 4 }}>{disp.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.45, marginBottom: 8 }}>{disp.description}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.25)", fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>
                    {b.category}
                    {isSelected && <span style={{ color: disp.color, marginLeft: 6 }}>✓ Selected</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={save}
              disabled={saving || selected === current}
              style={{
                padding: "13px 36px", borderRadius: 12, border: "none",
                cursor: saving || selected === current ? "not-allowed" : "pointer",
                background: saved
                  ? "rgba(52,211,153,.2)"
                  : selected !== current
                    ? selectedDisplay.gradient
                    : "rgba(255,255,255,.06)",
                color: selected !== current ? "white" : "rgba(255,255,255,.3)",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s",
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved! Redirecting…" : selected === current ? "No changes" : `Switch to ${selectedDisplay.label} →`}
            </button>
            {selected !== current && (
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>Sidebar will update after save</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
