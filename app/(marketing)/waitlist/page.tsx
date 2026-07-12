"use client";

import { useState } from "react";
import Link from "next/link";

const BENEFITS = [
  "Priority early access when new launches go live",
  "Direct product updates from the FinovaOS team",
  "Launch pricing and onboarding announcements",
  "A cleaner way to tell Google and visitors that the brand is real",
];

const TRUST_POINTS = [
  { label: "Cloud ERP", value: "Modern" },
  { label: "Built For", value: "SMEs" },
  { label: "Setup Flow", value: "Guided" },
];

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !company.trim()) {
      setError("Please fill in name, email, and company.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          source: "website-waitlist",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to join waitlist.");
      }

      setSuccess(data?.message || "You're on the list.");
      setName("");
      setEmail("");
      setCompany("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#060919 0%,#0a0f29 45%,#060919 100%)",
        color: "white",
        fontFamily: "'Outfit','DM Sans',sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        .wl-field:focus{
          outline:none;
          border-color:rgba(129,140,248,.6) !important;
          box-shadow:0 0 0 3px rgba(129,140,248,.14);
        }
        .wl-btn:hover:not(:disabled){
          transform:translateY(-2px);
          box-shadow:0 12px 30px rgba(99,102,241,.45);
        }
        @media(max-width:920px){
          .wl-grid{grid-template-columns:1fr !important;}
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(99,102,241,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.045) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          top: -120,
          right: -100,
          background: "radial-gradient(circle,rgba(99,102,241,.16),transparent 68%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "110px 24px 90px", position: "relative" }}>
        <div className="wl-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr .95fr", gap: 32, alignItems: "start" }}>
          <section>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 999,
                background: "rgba(99,102,241,.1)",
                border: "1px solid rgba(99,102,241,.22)",
                color: "#a5b4fc",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                marginBottom: 22,
              }}
            >
              Early Access
            </div>

            <h1
              style={{
                fontFamily: "'Lora',serif",
                fontSize: "clamp(36px,5.5vw,64px)",
                lineHeight: 1.05,
                letterSpacing: "-.04em",
                margin: "0 0 18px",
              }}
            >
              Modern Cloud ERP
              <span style={{ display: "block", color: "#a5b4fc" }}>
                Built for Growing Businesses
              </span>
            </h1>

            <p style={{ maxWidth: 620, fontSize: 17, lineHeight: 1.85, color: "rgba(255,255,255,.56)", margin: "0 0 28px" }}>
              Join the early access list and be among the first to experience AI-powered business management for accounting,
              inventory, invoicing, payroll, operations, and reporting in one polished platform.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
              {TRUST_POINTS.map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "11px 14px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.035)",
                    border: "1px solid rgba(255,255,255,.08)",
                    minWidth: 124,
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.36)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                borderRadius: 22,
                padding: 24,
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#c4b5fd", marginBottom: 14, letterSpacing: ".06em", textTransform: "uppercase" }}>
                Why Join
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {BENEFITS.map((benefit) => (
                  <div key={benefit} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#34d399", fontWeight: 900 }}>✓</span>
                    <span style={{ color: "rgba(255,255,255,.72)", lineHeight: 1.7, fontSize: 14 }}>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              borderRadius: 24,
              padding: 28,
              background: "linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.03))",
              border: "1px solid rgba(255,255,255,.1)",
              boxShadow: "0 24px 60px rgba(0,0,0,.28)",
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-.03em" }}>Join the Waitlist</div>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.48)", fontSize: 14, lineHeight: 1.7 }}>
                Name, email, and company are enough to get started. We&apos;ll use this to invite you into early access and onboarding.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <input
                className="wl-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.12)",
                  color: "white",
                  fontSize: 14,
                }}
              />
              <input
                className="wl-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email"
                type="email"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.12)",
                  color: "white",
                  fontSize: 14,
                }}
              />
              <input
                className="wl-field"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.12)",
                  color: "white",
                  fontSize: 14,
                }}
              />

              {error && (
                <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.22)", color: "#fca5a5", fontSize: 13, fontWeight: 700 }}>
                  {error}
                </div>
              )}
              {success && (
                <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.22)", color: "#86efac", fontSize: 13, fontWeight: 700 }}>
                  {success}
                </div>
              )}

              <button
                className="wl-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "15px 18px",
                  borderRadius: 14,
                  border: "none",
                  background: loading ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#818cf8,#6366f1)",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: loading ? "wait" : "pointer",
                  transition: "all .22s ease",
                  boxShadow: "0 10px 26px rgba(99,102,241,.32)",
                }}
              >
                {loading ? "Joining..." : "Join Early Access"}
              </button>
            </form>

            <div style={{ marginTop: 16, fontSize: 12.5, color: "rgba(255,255,255,.34)", lineHeight: 1.7 }}>
              By joining, you agree to our{" "}
              <Link href="/legal/privacy" style={{ color: "#a5b4fc", textDecoration: "none" }}>
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/legal/terms" style={{ color: "#a5b4fc", textDecoration: "none" }}>
                Terms of Service
              </Link>.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
