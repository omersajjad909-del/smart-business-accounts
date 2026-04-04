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
      padding: "9px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      position: "relative",
      zIndex: 60,
      textAlign: "center",
      flexWrap: "wrap",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');`}</style>

      <span style={{ fontSize: 15 }}>🔥</span>
      <span style={{
        background: "rgba(251,191,36,.2)", border: "1px solid rgba(251,191,36,.4)",
        borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 800,
        color: "#fbbf24", letterSpacing: ".06em",
      }}>75% OFF</span>
      <span style={{ color: "rgba(255,255,255,.85)" }}>
        75% off for the first 3 months.
      </span>

      <Link href="/pricing" style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 14px", borderRadius: 20,
        background: "#fbbf24", color: "#0f172a",
        fontSize: 12, fontWeight: 800, textDecoration: "none",
        transition: "all .2s", flexShrink: 0,
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
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer",
        color: "rgba(255,255,255,.5)", fontSize: 16, lineHeight: 1,
        padding: 4, transition: "color .2s",
      }}
        onMouseEnter={e => (e.currentTarget.style.color = "white")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
        aria-label="Close offer banner"
      >✕</button>
    </div>
  );
}
