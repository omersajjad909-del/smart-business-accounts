"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c1e",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Outfit', sans-serif",
      color: "white",
      padding: 24,
      textAlign: "center"
    }}>
      <div style={{ maxWidth: 500 }}>
        {/* Error code */}
        <div style={{
          fontSize: "clamp(80px, 15vw, 140px)",
          fontWeight: 900,
          background: "linear-gradient(135deg, #4f46e5, #818cf8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: 20,
          letterSpacing: "-0.05em"
        }}>
          404
        </div>

        {/* Message */}
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
          Page not found
        </h1>
        <p style={{ color: "rgba(255,255,255,.4)", lineHeight: 1.6, marginBottom: 36 }}>
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" style={{
            padding: "13px 28px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
            color: "white",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
            boxShadow: "0 4px 20px rgba(79,70,229,.3)"
          }}>
            Back to Home
          </Link>
          <Link href="/contact" style={{
            padding: "13px 28px",
            borderRadius: 12,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.12)",
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 14
          }}>
            Contact Support
          </Link>
        </div>

        {/* Quick links */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.25)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>
            Quick Links
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {["Pricing", "Blog", "Security", "Changelog"].map(link => (
              <Link 
                key={link} 
                href={`/${link.toLowerCase()}`}
                style={{ fontSize: 13, color: "rgba(255,255,255,.45)", textDecoration: "none", fontWeight: 600 }}
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
