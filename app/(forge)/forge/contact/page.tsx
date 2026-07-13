"use client";
import { useState } from "react";
import { ForgeNav, ForgeFooter, useInView } from "../../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 14px",
        borderRadius: 100,
        background: "rgba(245,158,11,.08)",
        border: "1px solid rgba(245,158,11,.2)",
        fontSize: 11,
        fontWeight: 700,
        color: "#fbbf24",
        letterSpacing: ".08em",
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.12)",
  color: "white",
  fontSize: 14,
  outline: "none",
  fontFamily: ff,
  boxSizing: "border-box",
  transition: "all .2s",
};

function Hero() {
  return (
    <section
      style={{
        minHeight: "50vh",
        padding: "clamp(90px,15vw,140px) clamp(16px,3vw,48px) clamp(40px,7vw,60px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,.16), transparent)",
        fontFamily: ff,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />
      <div style={{ maxWidth: 640, position: "relative", zIndex: 1 }}>
        <Chip>CONTACT</Chip>
        <h1
          style={{
            fontSize: "clamp(36px,6vw,62px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            margin: "0 0 20px",
            lineHeight: 1.08,
          }}
        >
          Let&apos;s Talk
        </h1>
        <p
          style={{
            fontSize: "clamp(14px,2vw,17px)",
            color: "rgba(255,255,255,.4)",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          Questions, partnership opportunities, or just want to say hello? We&apos;d love to hear from you.
        </p>
      </div>
    </section>
  );
}

function ContactSection() {
  const [ref, vis] = useInView();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 6000);
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { icon: "✉️", label: "Email", value: "hello@finovaforge.com", href: "mailto:hello@finovaforge.com" },
    { icon: "💼", label: "LinkedIn", value: "FinovaForge", href: "https://linkedin.com/company/finovaforge" },
    { icon: "🐦", label: "Twitter / X", value: "@finovaforge", href: "https://twitter.com/finovaforge" },
  ];

  return (
    <section
      style={{
        padding: "clamp(48px,8vw,80px) clamp(16px,3vw,48px) clamp(72px,12vw,120px)",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        className="forge-contact-grid"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
          gap: 48,
          opacity: vis ? 1 : 0,
          transform: vis ? "none" : "translateY(28px)",
          transition: "all .65s ease",
        }}
      >
        {/* Left — form */}
        <div>
          <h2
            style={{
              fontSize: "clamp(22px,3vw,32px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1px",
              margin: "0 0 8px",
            }}
          >
            Send us a message
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", margin: "0 0 32px", lineHeight: 1.7 }}>
            We typically respond within one business day.
          </p>

          <div
            className="forge-form-card"
            style={{
              padding: "36px",
              borderRadius: 20,
              background: "linear-gradient(135deg,rgba(245,158,11,.06),rgba(239,68,68,.03))",
              border: "1px solid rgba(245,158,11,.16)",
            }}
          >
            {sent ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "rgba(34,197,94,.15)",
                    border: "1px solid rgba(34,197,94,.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 22,
                    color: "#4ade80",
                  }}
                >
                  ✓
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "white", margin: "0 0 8px" }}>Message Sent!</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: 0 }}>
                  Thanks for reaching out. We&apos;ll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div className="forge-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.55)",
                        marginBottom: 7,
                        letterSpacing: ".02em",
                      }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your name"
                      style={inputStyle}
                      onFocus={(e) => {
                        (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(245,158,11,.4)";
                        (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.08)";
                      }}
                      onBlur={(e) => {
                        (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,.12)";
                        (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.05)";
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "rgba(255,255,255,.55)",
                        marginBottom: 7,
                        letterSpacing: ".02em",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="you@company.com"
                      style={inputStyle}
                      onFocus={(e) => {
                        (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(245,158,11,.4)";
                        (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.08)";
                      }}
                      onBlur={(e) => {
                        (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,.12)";
                        (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.05)";
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.55)",
                      marginBottom: 7,
                      letterSpacing: ".02em",
                    }}
                  >
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                    onFocus={(e) => {
                      (e.currentTarget as HTMLSelectElement).style.borderColor = "rgba(245,158,11,.4)";
                      (e.currentTarget as HTMLSelectElement).style.background = "rgba(255,255,255,.08)";
                    }}
                    onBlur={(e) => {
                      (e.currentTarget as HTMLSelectElement).style.borderColor = "rgba(255,255,255,.12)";
                      (e.currentTarget as HTMLSelectElement).style.background = "rgba(255,255,255,.05)";
                    }}
                  >
                    <option style={{ background: "rgb(7,8,15)" }} value="">
                      Select a subject...
                    </option>
                    <option style={{ background: "rgb(7,8,15)" }} value="sales">
                      Sales Inquiry
                    </option>
                    <option style={{ background: "rgb(7,8,15)" }} value="support">
                      Technical Support
                    </option>
                    <option style={{ background: "rgb(7,8,15)" }} value="partnership">
                      Partnership
                    </option>
                    <option style={{ background: "rgb(7,8,15)" }} value="press">
                      Press & Media
                    </option>
                    <option style={{ background: "rgb(7,8,15)" }} value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.55)",
                      marginBottom: 7,
                      letterSpacing: ".02em",
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us what's on your mind..."
                    style={{ ...inputStyle, resize: "none" }}
                    onFocus={(e) => {
                      (e.currentTarget as HTMLTextAreaElement).style.borderColor = "rgba(245,158,11,.4)";
                      (e.currentTarget as HTMLTextAreaElement).style.background = "rgba(255,255,255,.08)";
                    }}
                    onBlur={(e) => {
                      (e.currentTarget as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,.12)";
                      (e.currentTarget as HTMLTextAreaElement).style.background = "rgba(255,255,255,.05)";
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "13px 24px",
                    borderRadius: 11,
                    background: loading ? "rgba(245,158,11,.4)" : "linear-gradient(135deg,#f59e0b,#ef4444)",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 14,
                    border: "none",
                    cursor: loading ? "default" : "pointer",
                    transition: "all .3s",
                    fontFamily: ff,
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {loading ? "Sending..." : "Send Message →"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right — contact methods + info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div>
            <h2
              style={{
                fontSize: "clamp(20px,3vw,28px)",
                fontWeight: 900,
                color: "white",
                letterSpacing: "-1px",
                margin: "0 0 8px",
              }}
            >
              Other ways to reach us
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", margin: "0 0 24px" }}>
              Pick your preferred channel.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {methods.map((m, i) => (
                <a
                  key={i}
                  href={m.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "18px 20px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,.025)",
                    border: "1px solid rgba(255,255,255,.07)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    transition: "all .25s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(245,158,11,.06)";
                    el.style.borderColor = "rgba(245,158,11,.2)";
                    el.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.background = "rgba(255,255,255,.025)";
                    el.style.borderColor = "rgba(255,255,255,.07)";
                    el.style.transform = "translateX(0)";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(255,255,255,.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".04em", marginBottom: 2 }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{m.value}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Response time */}
          <div
            style={{
              padding: "24px",
              borderRadius: 16,
              background: "rgba(255,255,255,.02)",
              border: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 8 }}>
              Response times
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { type: "Sales inquiries", time: "Same day" },
                { type: "Support", time: "Within 24 hours" },
                { type: "Partnerships", time: "2–3 business days" },
              ].map((r) => (
                <div
                  key={r.type}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.38)" }}>{r.type}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,158,11,.7)" }}>{r.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <div style={{ fontFamily: ff, color: "white" }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:rgb(7,8,15);overflow-x:hidden}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2)}
        select option{background:rgb(7,8,15);color:white}
        @media (max-width: 900px) {
          .forge-contact-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 700px) {
          .forge-form-row { grid-template-columns: 1fr !important; }
          .forge-form-card { padding: 24px 20px !important; }
        }
      `}</style>
      <ForgeNav />
      <Hero />
      <ContactSection />
      <ForgeFooter />
    </div>
  );
}
