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
          background: "transparent",
        }}
      >
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            background: "linear-gradient(145deg, #4f46e5 0%, #6366f1 55%, #7c3aed 100%)",
            border: "1px solid rgba(255,255,255,.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 20,
              borderRadius: 92,
              border: "1px solid rgba(255,255,255,.1)",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 72,
              left: 86,
              width: 120,
              height: 18,
              borderRadius: 999,
              background: "rgba(255,255,255,.16)",
              transform: "rotate(-28deg)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              transform: "translateX(8px)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 228,
                borderRadius: 32,
                background: "#ffffff",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 26,
                left: 54,
                width: 154,
                height: 54,
                borderRadius: 27,
                background: "#ffffff",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 108,
                left: 54,
                width: 122,
                height: 48,
                borderRadius: 24,
                background: "#ffffff",
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
