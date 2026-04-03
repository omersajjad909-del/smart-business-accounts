import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 28% 24%, rgba(129,140,248,.55), transparent 34%), linear-gradient(145deg, #0a1028 0%, #12183a 45%, #070b1b 100%)",
        }}
      >
        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            background:
              "linear-gradient(150deg, rgba(99,102,241,.98) 0%, rgba(79,70,229,.98) 42%, rgba(124,58,237,.98) 100%)",
            boxShadow:
              "0 40px 80px rgba(7, 11, 27, .45), inset 0 1px 0 rgba(255,255,255,.22)",
            border: "1px solid rgba(255,255,255,.18)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 18,
              borderRadius: 80,
              border: "1px solid rgba(255,255,255,.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 52,
              left: 58,
              width: 110,
              height: 18,
              borderRadius: 999,
              background: "rgba(255,255,255,.2)",
              transform: "rotate(-28deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              transform: "translateX(4px)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 214,
                borderRadius: 30,
                background: "#ffffff",
                boxShadow: "0 10px 24px rgba(255,255,255,.16)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 22,
                left: 52,
                width: 150,
                height: 56,
                borderRadius: 28,
                background: "#ffffff",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 102,
                left: 52,
                width: 122,
                height: 52,
                borderRadius: 26,
                background: "#c7d2fe",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
