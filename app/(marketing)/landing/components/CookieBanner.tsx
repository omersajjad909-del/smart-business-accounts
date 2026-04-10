"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COOKIE_CONSENT_VERSION,
  defaultCookieConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "@/lib/cookieConsent";

type CategoryKey = "necessary" | "functional" | "analytics" | "marketing";

const CATEGORIES: Array<{
  key: CategoryKey;
  label: string;
  desc: string;
  cookies: string[];
  locked?: boolean;
}> = [
  {
    key: "necessary",
    label: "Necessary",
    desc: "Required for secure login, session continuity, consent storage, and core app protection. These cookies cannot be switched off because the website would stop working correctly.",
    cookies: ["sb_auth", "sb_verify", "session state", "cookie consent choice"],
    locked: true,
  },
  {
    key: "functional",
    label: "Functional",
    desc: "Used to remember your preferences, business setup choices, UI settings, and convenience features like saved interface behaviour.",
    cookies: ["theme preference", "business setup preferences", "language or UI memory"],
  },
  {
    key: "analytics",
    label: "Analytics",
    desc: "Used to understand how visitors use the site, which pages perform best, and where users drop off so we can improve performance and UX.",
    cookies: ["visitor tracking session", "page visit analytics", "engagement signals"],
  },
  {
    key: "marketing",
    label: "Marketing",
    desc: "Used to measure campaigns, retarget visitors, and personalise promotional messaging across websites or advertising platforms when enabled.",
    cookies: ["campaign attribution", "ad retargeting", "marketing audience sync"],
  },
];

const panel = "rgba(9,13,30,.96)";
const line = "rgba(255,255,255,.09)";
const soft = "rgba(255,255,255,.67)";
const dim = "rgba(255,255,255,.42)";

function Toggle({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        position: "relative",
        width: 54,
        height: 30,
        borderRadius: 999,
        background: checked ? "linear-gradient(135deg,#2563eb,#4f46e5)" : "rgba(255,255,255,.11)",
        border: checked ? "1px solid rgba(99,102,241,.45)" : "1px solid rgba(255,255,255,.08)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.72 : 1,
        transition: "all .2s ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 27 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "white",
          transition: "left .2s ease",
          boxShadow: "0 4px 14px rgba(0,0,0,.22)",
        }}
      />
    </button>
  );
}

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasSavedConsent, setHasSavedConsent] = useState(false);
  const [prefs, setPrefs] = useState<Omit<CookieConsent, "savedAt" | "consentVersion">>({
    necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = readCookieConsent();
    if (!saved || saved.consentVersion !== COOKIE_CONSENT_VERSION) {
      setPrefs({
        necessary: true,
        functional: saved?.functional ?? true,
        analytics: saved?.analytics ?? false,
        marketing: saved?.marketing ?? false,
      });
      const timer = setTimeout(() => setShowBanner(true), 1200);
      return () => clearTimeout(timer);
    }
    setHasSavedConsent(true);
  }, []);

  const summary = useMemo(() => {
    const enabled = [];
    if (prefs.functional) enabled.push("Functional");
    if (prefs.analytics) enabled.push("Analytics");
    if (prefs.marketing) enabled.push("Marketing");
    return enabled.length ? enabled.join(", ") : "Necessary only";
  }, [prefs]);

  function persist(next: Omit<CookieConsent, "savedAt" | "consentVersion">) {
    writeCookieConsent(next);
    setHasSavedConsent(true);
    setShowBanner(false);
    setShowModal(false);
  }

  function acceptAll() {
    persist({ necessary: true, functional: true, analytics: true, marketing: true });
  }

  function rejectAll() {
    persist({ necessary: true, functional: false, analytics: false, marketing: false });
  }

  function savePreferences() {
    persist({ necessary: true, functional: prefs.functional, analytics: prefs.analytics, marketing: prefs.marketing });
  }

  function openManager() {
    setShowModal(true);
  }

  if (!showBanner && !showModal) return null;

  return (
    <>
      <style>{`
        @keyframes cookieRise {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cookie-scroll::-webkit-scrollbar { width: 10px; }
        .cookie-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.13); border-radius: 999px; }
      `}</style>

      {showBanner && !showModal && (
        <div
          style={{
            position: "fixed",
            inset: "auto 24px 24px 24px",
            zIndex: 99998,
            maxWidth: 560,
            background: panel,
            border: "1px solid rgba(94,162,255,.22)",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 28px 80px rgba(0,0,0,.55)",
            backdropFilter: "blur(18px)",
            animation: "cookieRise .35s ease",
            fontFamily: "'Outfit','Inter',sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: "linear-gradient(135deg,#4f46e5,#2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 14px 36px rgba(79,70,229,.35)",
              }}
            >
              <span style={{ fontSize: 20 }}>🍪</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "white" }}>Cookie Preferences</div>
              <p style={{ margin: "8px 0 0", fontSize: 13.5, color: soft, lineHeight: 1.7 }}>
                We use cookies to keep FinovaOS secure, remember your preferences, measure site usage, and improve the product. You can accept all, reject non-essential cookies, or customise your consent.
              </p>
              <div style={{ marginTop: 10, fontSize: 12, color: dim }}>
                Current preference: <strong style={{ color: "white" }}>{summary}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={acceptAll}
              style={{
                flex: 1,
                minWidth: 130,
                padding: "11px 16px",
                borderRadius: 14,
                background: "linear-gradient(135deg,#2563eb,#4f46e5)",
                border: "none",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 14px 32px rgba(37,99,235,.28)",
              }}
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={rejectAll}
              style={{
                flex: 1,
                minWidth: 130,
                padding: "11px 16px",
                borderRadius: 14,
                background: "rgba(255,255,255,.04)",
                border: `1px solid ${line}`,
                color: "rgba(255,255,255,.82)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={openManager}
              style={{
                padding: "11px 16px",
                borderRadius: 14,
                background: "transparent",
                border: `1px solid ${line}`,
                color: "rgba(255,255,255,.7)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Manage Preferences
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(2,6,23,.62)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: "'Outfit','Inter',sans-serif",
          }}
        >
          <div
            style={{
              width: "min(1060px, 100%)",
              maxHeight: "88vh",
              overflow: "hidden",
              background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01)), #fff",
              borderRadius: 24,
              boxShadow: "0 40px 100px rgba(0,0,0,.28)",
              display: "grid",
              gridTemplateColumns: "280px 1fr",
            }}
          >
            <div
              style={{
                padding: 28,
                background: "linear-gradient(180deg,#0f172a,#101938)",
                color: "white",
                borderRight: "1px solid rgba(255,255,255,.08)",
              }}
            >
              <div style={{ fontSize: 12, color: "#93c5fd", textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>
                Cookie Control
              </div>
              <div style={{ marginTop: 10, fontSize: 28, lineHeight: 1.05, fontWeight: 900 }}>Customise Consent Preferences</div>
              <div style={{ marginTop: 14, fontSize: 14, color: "rgba(255,255,255,.72)", lineHeight: 1.8 }}>
                Choose which cookie categories FinovaOS may use. Necessary cookies always stay active because they support login, security, and consent storage.
              </div>

              <div style={{ marginTop: 24, display: "grid", gap: 10 }}>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [category.key]: !prev[category.key] }))}
                    style={{
                      textAlign: "left",
                      padding: "13px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,.08)",
                      background: expanded[category.key] ? "rgba(94,162,255,.16)" : "rgba(255,255,255,.03)",
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 12, color: "rgba(255,255,255,.56)", lineHeight: 1.75 }}>
                Detailed cookie information is also available in our{" "}
                <Link href="/legal/privacy" style={{ color: "#bfdbfe", textDecoration: "none", fontWeight: 700 }}>
                  Privacy Policy
                </Link>
                .
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div
                style={{
                  padding: "24px 28px 18px",
                  borderBottom: "1px solid rgba(15,23,42,.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Detailed Cookie Categories</div>
                  <div style={{ marginTop: 8, color: "#475569", fontSize: 14, lineHeight: 1.7 }}>
                    We use cookies to help you navigate efficiently, remember your choices, analyse performance, and improve FinovaOS responsibly. You can expand each category below for more detail.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#94a3b8",
                    fontSize: 28,
                    lineHeight: 1,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="cookie-scroll" style={{ padding: 24, overflowY: "auto" }}>
                {CATEGORIES.map((category) => {
                  const isOpen = expanded[category.key];
                  const checked = category.key === "necessary" ? true : prefs[category.key];
                  return (
                    <div
                      key={category.key}
                      style={{
                        border: "1px solid rgba(15,23,42,.08)",
                        borderRadius: 18,
                        marginBottom: 14,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          padding: "16px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 18,
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => ({ ...prev, [category.key]: !prev[category.key] }))}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            textAlign: "left",
                            cursor: "pointer",
                            flex: 1,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 16, color: "#334155" }}>{isOpen ? "▾" : "▸"}</span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{category.label}</span>
                            {category.locked ? (
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a" }}>Always Active</span>
                            ) : null}
                          </div>
                        </button>
                        <Toggle
                          checked={checked}
                          disabled={category.locked}
                          onClick={() => {
                            if (category.locked) return;
                            setPrefs((prev) => ({ ...prev, [category.key]: !prev[category.key] }));
                          }}
                        />
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 18px 18px 46px", color: "#475569" }}>
                          <div style={{ fontSize: 14, lineHeight: 1.8 }}>{category.desc}</div>
                          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 }}>
                            Typical use
                          </div>
                          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {category.cookies.map((cookie) => (
                              <span
                                key={cookie}
                                style={{
                                  padding: "7px 10px",
                                  borderRadius: 999,
                                  background: "#f8fafc",
                                  border: "1px solid rgba(15,23,42,.07)",
                                  fontSize: 12,
                                  color: "#334155",
                                  fontWeight: 600,
                                }}
                              >
                                {cookie}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  padding: 20,
                  borderTop: "1px solid rgba(15,23,42,.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={rejectAll}
                  style={{
                    flex: 1,
                    minWidth: 170,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(220,38,38,.24)",
                    background: "white",
                    color: "#b91c1c",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={savePreferences}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,.1)",
                    background: "white",
                    color: "#0f172a",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Save My Preferences
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  style={{
                    flex: 1,
                    minWidth: 170,
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "none",
                    background: "linear-gradient(135deg,#2563eb,#4f46e5)",
                    color: "white",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 14px 34px rgba(37,99,235,.24)",
                  }}
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showBanner && !showModal && hasSavedConsent && (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            position: "fixed",
            left: 18,
            bottom: 18,
            zIndex: 99997,
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: "1px solid rgba(94,162,255,.22)",
            background: panel,
            color: "white",
            cursor: "pointer",
            boxShadow: "0 16px 44px rgba(0,0,0,.35)",
          }}
          aria-label="Manage cookie preferences"
          title="Manage cookie preferences"
        >
          🍪
        </button>
      )}
    </>
  );
}
