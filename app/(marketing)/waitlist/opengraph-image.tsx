import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Join the FinovaOS waitlist";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function WaitlistOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #07111f 0%, #101b3a 45%, #1d2c61 100%)",
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
              "radial-gradient(circle at 20% 20%, rgba(129,140,248,0.28), transparent 40%), radial-gradient(circle at 80% 70%, rgba(167,139,250,0.22), transparent 45%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, #8b5cf6 0%, #38bdf8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                color: "white",
                boxShadow: "0 14px 34px rgba(56, 189, 248, 0.35)",
              }}
            >
              F
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.6px" }}>
              FinovaOS
            </div>
          </div>

          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(255,255,255,0.82)",
            }}
          >
            Early access
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, zIndex: 1 }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              letterSpacing: "-2px",
              lineHeight: 1.02,
            }}
          >
            Join the waitlist
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 600,
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            Be first to try the AI cloud accounting platform built for growing businesses.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 1,
            flexWrap: "wrap",
          }}
        >
          {[
            "Launch updates",
            "Priority onboarding",
            "AI accounting",
          ].map((item) => (
            <div
              key={item}
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 20,
                fontWeight: 600,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
