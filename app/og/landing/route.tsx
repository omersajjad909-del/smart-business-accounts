import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "60px",
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 60%)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background:
              "linear-gradient(135deg, rgb(79,70,229) 0%, rgb(37,99,235) 100%)",
            boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
          }}
        />
        <div style={{ height: "24px" }} />
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: -1,
          }}
        >
          Smart Business Accounts
        </div>
        <div style={{ height: "16px" }} />
        <div
          style={{
            fontSize: 28,
            color: "#334155",
            maxWidth: "900px",
            lineHeight: 1.3,
          }}
        >
          Cloud Financial Management for SMEs — professional, trustworthy, and
          simple. Real-time dashboards, smart reporting, and multi-company
          control.
        </div>
        <div style={{ height: "28px" }} />
        <div
          style={{
            display: "flex",
            gap: "12px",
            fontSize: 18,
            color: "#1e293b",
          }}
        >
          <div style={{ padding: "8px 12px", background: "#e0e7ff", borderRadius: 8 }}>
            Secure Cloud
          </div>
          <div style={{ padding: "8px 12px", background: "#e2e8f0", borderRadius: 8 }}>
            Multi-Company
          </div>
          <div style={{ padding: "8px 12px", background: "#e2e8f0", borderRadius: 8 }}>
            Smart Reports
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
