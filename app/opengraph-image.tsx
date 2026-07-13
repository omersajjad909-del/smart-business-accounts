import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FinovaOS — AI Cloud Accounting Software for SMEs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOGO_URL = "https://www.finovaos.app/icon.png";

export default async function OpengraphImage() {
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
          background:
            "linear-gradient(135deg, #060919 0%, #0c0f2e 45%, #060919 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(99,102,241,0.28), transparent 55%), radial-gradient(circle at 80% 70%, rgba(129,140,248,0.20), transparent 55%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            zIndex: 1,
          }}
        >
          <img
            src={LOGO_URL}
            width={72}
            height={72}
            style={{
              borderRadius: 18,
              boxShadow: "0 12px 32px rgba(99,102,241,0.45)",
            }}
            alt=""
          />
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.6px",
            }}
          >
            FinovaOS
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 26,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 74,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2.2px",
              lineHeight: 1.04,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>AI Cloud Accounting</span>
            <span
              style={{
                background:
                  "linear-gradient(90deg, #a5b4fc 0%, #c4b5fd 60%, #f0abfc 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              for Growing Businesses
            </span>
          </div>
          <div
            style={{
              fontSize: 27,
              color: "rgba(255,255,255,0.62)",
              fontWeight: 500,
              maxWidth: 960,
              lineHeight: 1.35,
            }}
          >
            Invoicing, inventory, HR & payroll, bank reconciliation, CRM — all in one intelligent platform.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {["Accounting", "Invoicing", "Inventory", "HR & Payroll", "AI"].map(
              (tag) => (
                <div
                  key={tag}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 100,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 18,
                    fontWeight: 600,
                    display: "flex",
                  }}
                >
                  {tag}
                </div>
              ),
            )}
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.5)",
              fontWeight: 600,
              letterSpacing: "0.3px",
            }}
          >
            finovaos.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
