export default function Page() {
  return (
    <div style={{ padding: "32px 24px", color: "var(--text-primary)", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <span>🔧</span> Maintenance
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>Schedule and track maintenance for rental equipment.</p>
      </div>
      <div style={{
        padding: "48px 32px", borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 8 }}>Maintenance</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 400, margin: "0 auto" }}>
          Schedule and track maintenance for rental equipment.
        </div>
      </div>
    </div>
  );
}
