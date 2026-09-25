"use client";
import Link from "next/link";
import { useState } from "react";

export default function Offer() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg,#7c3aed,#6366f1,#4f46e5)",
      color: "white",
      fontFamily: "'Outfit',sans-serif",
      fontSize: 13,
      fontWeight: 600,
      padding: "8px 44px 8px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      position: "relative",
      zIndex: 60,
      textAlign: "center",
      flexWrap: "nowrap",
    }}>
      <style>{`
        
        @media(max-width:600px){
          .offer-badge { display:none !important; }
          .offer-text  { font-size:12px !important; }
        }
      `}</style>

      <span style={{ fontSize: 15 }}>🔥</span>
      <span className="offer-badge" style={{
        background: "rgba(251,191,36,.2)", border: "1px solid rgba(251,191,36,.4)",
        borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 800,
        color: "#fbbf24", letterSpacing: ".06em",
      }}>Launch Offer</span>
      <span className="offer-text" style={{ color: "rgba(255,255,255,.85)" }}>
        50% Off — First 3 Months. Limited Time.
      </span>

      <Link href="/pricing" style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 14px", borderRadius: 20,
        background: "#fbbf24", color: "#0f172a",
        fontSize: 12, fontWeight: 800, textDecoration: "none",
        transition: "all .2s", flexShrink: 0,
        // Room for the absolutely-positioned close button so its touch
        // target doesn't sit flush against this one on narrow screens.
        marginRight: 20,
      }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f59e0b")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fbbf24")}
      >
        Claim Now
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>

      <button onClick={() => setClosed(true)} style={{
        position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer",
        color: "rgba(255,255,255,.5)", fontSize: 16, lineHeight: 1,
        // 44x44 touch target (was ~24x24) — the glyph itself stays the same
        // visual size, only the tappable area around it grows.
        width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "color .2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "white")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
        aria-label="Close offer banner"
      >✕</button>
    </div>
  );
}
