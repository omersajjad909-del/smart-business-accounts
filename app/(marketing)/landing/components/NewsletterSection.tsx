"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe.");
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, rgba(99,102,241,.06) 0%, transparent 100%)",
        borderTop: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 16px",
            borderRadius: 100,
            marginBottom: 20,
            background: "rgba(99,102,241,.1)",
            border: "1px solid rgba(99,102,241,.25)",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: "#a5b4fc", letterSpacing: ".08em" }}>
            NEWSLETTER
          </span>
        </div>

        <h2
          style={{
            margin: "0 0 14px",
            fontFamily: "'Outfit',sans-serif",
            fontSize: "clamp(26px,4vw,40px)",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          Updates, offers, and new features
          <br />
          <span style={{ color: "#a5b4fc" }}>delivered to your inbox first.</span>
        </h2>

        <p
          style={{
            margin: "0 0 36px",
            fontSize: 15,
            color: "rgba(255,255,255,.45)",
            lineHeight: 1.7,
          }}
        >
          Get product updates, launch announcements, and limited-time offers from Finova.
          <br />
          No spam. Unsubscribe anytime.
        </p>

        {done ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(52,211,153,.1)",
              border: "1.5px solid rgba(52,211,153,.25)",
              borderRadius: 16,
              padding: "18px 32px",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#34d399" }}>Subscribed!</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
                You will now receive Finova updates in your inbox.
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                maxWidth: 480,
                margin: "0 auto",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && subscribe()}
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: "13px 18px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.05)",
                  color: "white",
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                onClick={subscribe}
                disabled={loading}
                style={{
                  padding: "13px 28px",
                  borderRadius: 12,
                  border: "none",
                  background: loading ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366f1,#7c3aed)",
                  color: "white",
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 20px rgba(99,102,241,.3)",
                }}
              >
                {loading ? "..." : "Subscribe ->"}
              </button>
            </div>
            {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#f87171" }}>{error}</p>}
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "rgba(255,255,255,.25)" }}>
              Unsubscribe anytime. No spam, ever.
            </p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 40, flexWrap: "wrap" }}>
          {[
            { val: "5,000+", label: "Subscribers" },
            { val: "Weekly", label: "Updates" },
            { val: "Zero", label: "Spam" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "white" }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
