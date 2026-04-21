"use client";
import { useState } from "react";
import { ForgeNav, ForgeFooter, useInView } from "../components/shared";

const ff = "'Outfit','DM Sans',sans-serif";

function Hero() {
  return (
    <section
      style={{
        minHeight: "60vh",
        padding: "120px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(245,158,11,.15), transparent)",
        fontFamily: ff,
      }}
    >
      <div style={{ maxWidth: 700 }}>
        <h1
          style={{
            fontSize: "clamp(36px,6vw,60px)",
            fontWeight: 900,
            color: "white",
            letterSpacing: "-2px",
            margin: "0 0 20px",
            lineHeight: 1.1,
          }}
        >
          Get in Touch
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.4)",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Questions, partnership opportunities, or just want to say hello? We'd love to hear from you.
        </p>
      </div>
    </section>
  );
}

function ContactForm() {
  const [ref, vis] = useInView();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real implementation, you would send this to your backend
      // For now, we'll just simulate a successful submission
      await new Promise(r => setTimeout(r, 1000));
      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSent(false), 5000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        padding: "80px 40px",
        background: "rgba(255,255,255,.01)",
        borderTop: "1px solid rgba(255,255,255,.05)",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 600,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <div
          style={{
            padding: "40px",
            borderRadius: 20,
            background: "linear-gradient(135deg,rgba(245,158,11,.08),rgba(239,68,68,.04))",
            border: "1px solid rgba(245,158,11,.2)",
          }}
        >
          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: "white", margin: "0 0 8px" }}>
                Message Sent!
              </h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.5)", margin: 0 }}>
                Thanks for reaching out. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 8,
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
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.15)",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: ff,
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(245,158,11,.3)";
                    (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.08)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,.15)";
                    (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.05)";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 8,
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
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.15)",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: ff,
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(245,158,11,.3)";
                    (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.08)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,.15)";
                    (e.currentTarget as HTMLInputElement).style.background = "rgba(255,255,255,.05)";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 8,
                  }}
                >
                  Subject
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.15)",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: ff,
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLSelectElement).style.borderColor = "rgba(245,158,11,.3)";
                    (e.currentTarget as HTMLSelectElement).style.background = "rgba(255,255,255,.08)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLSelectElement).style.borderColor = "rgba(255,255,255,.15)";
                    (e.currentTarget as HTMLSelectElement).style.background = "rgba(255,255,255,.05)";
                  }}
                >
                  <option style={{ background: "rgb(7,8,15)", color: "white" }} value="">
                    Select a subject...
                  </option>
                  <option style={{ background: "rgb(7,8,15)", color: "white" }} value="sales">
                    Sales Inquiry
                  </option>
                  <option style={{ background: "rgb(7,8,15)", color: "white" }} value="support">
                    Technical Support
                  </option>
                  <option style={{ background: "rgb(7,8,15)", color: "white" }} value="partnership">
                    Partnership
                  </option>
                  <option style={{ background: "rgb(7,8,15)", color: "white" }} value="other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 8,
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
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.15)",
                    color: "white",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: ff,
                    resize: "none",
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLTextAreaElement).style.borderColor = "rgba(245,158,11,.3)";
                    (e.currentTarget as HTMLTextAreaElement).style.background = "rgba(255,255,255,.08)";
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLTextAreaElement).style.borderColor = "rgba(255,255,255,.15)";
                    (e.currentTarget as HTMLTextAreaElement).style.background = "rgba(255,255,255,.05)";
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  background: loading
                    ? "rgba(245,158,11,.4)"
                    : "linear-gradient(135deg,#f59e0b,#ef4444)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: loading ? "default" : "pointer",
                  transition: "all .3s",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }
                }}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function DirectContact() {
  const [ref, vis] = useInView();
  const methods = [
    {
      icon: "✉️",
      label: "Email",
      value: "hello@finovaforge.com",
      href: "mailto:hello@finovaforge.com",
    },
    {
      icon: "🐦",
      label: "Twitter",
      value: "@finovaforge",
      href: "https://twitter.com/finovaforge",
    },
    {
      icon: "💼",
      label: "LinkedIn",
      value: "FinovaForge",
      href: "https://linkedin.com/company/finovaforge",
    },
  ];

  return (
    <section
      style={{
        padding: "80px 40px",
        fontFamily: ff,
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 900,
          margin: "0 auto",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(24px)",
          transition: "all .65s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontSize: "clamp(28px,4vw,40px)",
              fontWeight: 900,
              color: "white",
              letterSpacing: "-1.5px",
              margin: "0 0 12px",
            }}
          >
            Other Ways to Reach Us
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,.4)",
              margin: 0,
            }}
          >
            Pick your preferred channel.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {methods.map((method, i) => (
            <a
              key={i}
              href={method.href}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "32px 24px",
                borderRadius: 16,
                background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)",
                textDecoration: "none",
                textAlign: "center",
                transition: "all .3s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(245,158,11,.08)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,158,11,.2)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.025)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,.07)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{method.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 4 }}>
                {method.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                {method.value}
              </div>
            </a>
          ))}
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
        body{background:rgb(7,8,15)}
      `}</style>
      <ForgeNav />
      <Hero />
      <ContactForm />
      <DirectContact />
      <ForgeFooter />
    </div>
  );
}
