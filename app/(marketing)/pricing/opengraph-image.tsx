import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FinovaOS pricing plans from $49 per month";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOGO_URL = "https://www.finovaos.app/icon.png";

export default async function PricingOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #07111f 0%, #102849 52%, #123d4a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          color: "white",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 78% 22%, rgba(45,212,191,0.28), transparent 38%), radial-gradient(circle at 15% 88%, rgba(56,189,248,0.18), transparent 42%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
          <img src={LOGO_URL} width={68} height={68} style={{ borderRadius: 18 }} alt="" />
          <div style={{ fontSize: 35, fontWeight: 800, letterSpacing: "-0.6px" }}>FinovaOS</div>
          <div
            style={{
              marginLeft: "auto",
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(255,255,255,0.84)",
            }}
          >
            Simple, transparent pricing
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.02 }}>
            <span>Plans for every</span>
            <span style={{ color: "#5eead4" }}>growing business.</span>
          </div>
          <div style={{ fontSize: 28, color: "rgba(255,255,255,0.72)", fontWeight: 500 }}>
            Starter $49/mo · Professional $99/mo · Enterprise $249/mo
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {["Accounting", "Invoicing", "Inventory", "AI tools"].map((item) => (
              <div
                key={item}
                style={{
                  padding: "11px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.84)",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.54)", fontWeight: 600 }}>No hidden fees</div>
        </div>
      </div>
    ),
    { ...size },
  );
}