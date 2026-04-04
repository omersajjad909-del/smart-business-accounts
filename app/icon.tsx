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
            background: "linear-gradient(145deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.22)",
          }}
        >
          {/* Layers / stack icon — top diamond */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, position: "relative", width: 240, height: 220 }}>
            {/* Top layer */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}>
              <div style={{
                width: 240,
                height: 52,
                background: "rgba(255,255,255,1)",
                borderRadius: 12,
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}/>
            </div>
            {/* Middle layer */}
            <div style={{
              position: "absolute",
              top: 76,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}>
              <div style={{
                width: 240,
                height: 52,
                background: "rgba(255,255,255,.85)",
                borderRadius: 12,
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}/>
            </div>
            {/* Bottom layer */}
            <div style={{
              position: "absolute",
              top: 152,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}>
              <div style={{
                width: 240,
                height: 52,
                background: "rgba(255,255,255,.65)",
                borderRadius: 12,
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              }}/>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
