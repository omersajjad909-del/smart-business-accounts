"use client";
import { useState, useEffect } from "react";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessModules";

export default function BusinessSettingsPage() {
  const [current, setCurrent] = useState<BusinessType>("trading");
  const [selected, setSelected] = useState<BusinessType>("trading");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/company/business-type")
      .then(r => r.json())
      .then(d => { if (d.businessType) { setCurrent(d.businessType); setSelected(d.businessType); } })
      .catch(() => {})
      .finally(() => setLoading(false));
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
      // Reload page so sidebar updates
      setTimeout(() => window.location.href = "/dashboard", 800);
    } catch { setSaving(false); }
  }

  const bt = BUSINESS_TYPES.find(b => b.id === current);
  const cardStyle = (id: BusinessType, color: string, gradient: string): React.CSSProperties => ({
    borderRadius: 14,
    padding: "18px 20px",
    border: `2px solid ${selected === id ? color : "rgba(255,255,255,.07)"}`,
    background: selected === id ? `${color}10` : "rgba(255,255,255,.02)",
    cursor: "pointer",
    transition: "all .2s",
    boxShadow: selected === id ? `0 0 24px ${color}20` : "none",
  });

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900, color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: bt?.gradient || "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {bt?.icon || "🏢"}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "white" }}>Business Type Settings</h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
              Currently: <span style={{ color: bt?.color || "#818cf8", fontWeight: 700 }}>{bt?.label || "Trading"}</span> — Change to get different features in your sidebar
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
            ℹ️ Changing your business type will update your sidebar navigation to show/hide modules relevant to your business. Your existing data is <strong style={{ color: "white" }}>not affected</strong>.
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 28 }}>
            {BUSINESS_TYPES.map(b => (
              <div key={b.id} onClick={() => setSelected(b.id)} style={cardStyle(b.id, b.color, b.gradient)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{b.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", lineHeight: 1.4, marginBottom: 10 }}>{b.description}</div>
                <div style={{ fontSize: 11, color: selected === b.id ? b.color : "rgba(255,255,255,.25)", fontWeight: 700 }}>
                  {b.modules.length} modules {selected === b.id ? "✓" : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Save */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={save}
              disabled={saving || selected === current}
              style={{
                padding: "13px 36px", borderRadius: 12, border: "none", cursor: saving || selected === current ? "not-allowed" : "pointer",
                background: saved ? "rgba(52,211,153,.2)" : selected !== current ? (BUSINESS_TYPES.find(b => b.id === selected)?.gradient || "linear-gradient(135deg,#6366f1,#4f46e5)") : "rgba(255,255,255,.06)",
                color: selected !== current ? "white" : "rgba(255,255,255,.3)",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit", transition: "all .2s",
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved! Redirecting…" : selected === current ? "No changes" : `Switch to ${BUSINESS_TYPES.find(b=>b.id===selected)?.label} →`}
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
