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
        {/* Purple rounded square background */}
        <div
          style={{
            width: 460,
            height: 460,
            borderRadius: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            boxShadow: "0 16px 48px rgba(99,102,241,0.45)",
          }}
        >
          {/* Layers / stack SVG icon — same as sidebar logo */}
          <svg
            width="260"
            height="260"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
