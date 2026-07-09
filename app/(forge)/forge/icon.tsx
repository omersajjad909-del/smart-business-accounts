import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
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
          background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
          borderRadius: 8,
          color: "white",
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "Arial, sans-serif",
          lineHeight: 1,
        }}
      >
        F
      </div>
    ),
    size,
  );
}
