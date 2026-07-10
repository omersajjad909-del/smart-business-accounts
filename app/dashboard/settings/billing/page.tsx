"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

type Invoice = {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "open" | "void";
  plan: string;
  billingCycle: string;
};

type InvoicesResponse = { invoices: Invoice[] };

type PaymentMethodsResponse = {
  provider: string;
  managedExternally: boolean;
  paymentMethods: unknown[];
  defaultId: string | null;
  note: string;
};

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  PRO: "Professional",
  ENTERPRISE: "Enterprise",
  CUSTOM: "Custom",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20,
  padding: 24,
};

const softLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "rgba(255,255,255,.36)",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.14)",
  background: "linear-gradient(135deg, rgba(124,58,237,.95), rgba(139,92,246,.95))",
  color: "white",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 24px -14px rgba(124,58,237,.7)",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(255,255,255,.04)",
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function StatusPill({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], { bg: string; border: string; text: string; label: string }> = {
    paid: { bg: "rgba(52,211,153,.14)", border: "rgba(52,211,153,.3)", text: "#6ee7b7", label: "Paid" },
    open: { bg: "rgba(250,204,21,.14)", border: "rgba(250,204,21,.32)", text: "#fde68a", label: "Open" },
    void: { bg: "rgba(148,163,184,.14)", border: "rgba(148,163,184,.3)", text: "#cbd5e1", label: "Void" },
  };
  const c = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        textTransform: "uppercase",
      }}
    >
      {c.label}
    </span>
  );
}

function Alert({ msg, type }: { msg: string; type: "error" | "success" }) {
  const colors =
    type === "error"
      ? { bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.25)", text: "#fca5a5" }
      : { bg: "rgba(52,211,153,.12)", border: "rgba(52,211,153,.25)", text: "#86efac" };
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "11px 12px",
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {msg}
    </div>
  );
}

export default function BillingSettingsPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isAdmin = currentUser?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payment, setPayment] = useState<PaymentMethodsResponse | null>(null);
  const [loadError, setLoadError] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const u = currentUser;
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;

        const [invRes, pmRes] = await Promise.all([
          fetch("/api/billing/invoices", { cache: "no-store", headers }),
          fetch("/api/billing/payment-methods", { cache: "no-store", headers }),
        ]);

        if (!active) return;

        if (invRes.ok) {
          const data: InvoicesResponse = await invRes.json();
          setInvoices(data.invoices || []);
        } else {
          setLoadError("Could not load invoices.");
        }

        if (pmRes.ok) {
          const data: PaymentMethodsResponse = await pmRes.json();
          setPayment(data);
        }
      } catch {
        if (active) setLoadError("Something went wrong while loading your billing.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [currentUser]);

  const current = invoices[0];
  const planKey = (current?.plan || "STARTER").toUpperCase();
  const planLabel = PLAN_LABELS[planKey] || planKey;
  const cycle = (current?.billingCycle || "MONTHLY").toLowerCase();

  async function handleCancel() {
    if (!isAdmin) return;
    setCancelling(true);
    setCancelError("");
    setCancelSuccess("");
    try {
      const u = currentUser;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;
      if (u?.companyId) headers["x-company-id"] = u.companyId;

      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data?.error || "Could not cancel subscription.");
      } else {
        setCancelSuccess(data?.message || "Your subscription has been cancelled.");
        setCancelOpen(false);
        setCancelReason("");
      }
    } catch {
      setCancelError("Network error. Please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px 32px 60px",
        color: "white",
        fontFamily: "'Outfit','DM Sans',sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 26, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ ...softLabel, marginBottom: 8 }}>Settings · Billing</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -0.4 }}>
            My Billing
          </h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.5)", fontSize: 13.5, maxWidth: 620 }}>
            Manage your subscription, payment method, and invoices. Everything about your FinovaOS plan in one place.
          </p>
        </div>
        <Link
          href="/billing"
          style={{
            ...ghostBtnStyle,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>⚡</span> Compare Plans
        </Link>
      </div>

      {loadError && <Alert msg={loadError} type="error" />}
      {cancelSuccess && <Alert msg={cancelSuccess} type="success" />}

      {loading ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60, color: "rgba(255,255,255,.5)" }}>
          Loading your billing…
        </div>
      ) : (
        <>
          {/* CURRENT PLAN + PAYMENT METHOD */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
              gap: 18,
              marginBottom: 22,
            }}
          >
            {/* Current Plan */}
            <div
              style={{
                ...cardStyle,
                background:
                  "linear-gradient(135deg, rgba(124,58,237,.16), rgba(59,130,246,.10) 60%, rgba(255,255,255,.02))",
                border: "1px solid rgba(139,92,246,.22)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 180,
                  height: 180,
                  background: "radial-gradient(circle, rgba(139,92,246,.35), transparent 70%)",
                  filter: "blur(20px)",
                  pointerEvents: "none",
                }}
              />
              <div style={softLabel}>Current Plan</div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.6 }}>{planLabel}</div>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "rgba(52,211,153,.14)",
                    border: "1px solid rgba(52,211,153,.3)",
                    color: "#6ee7b7",
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  Active
                </span>
              </div>
              {current && (
                <div style={{ marginTop: 6, fontSize: 14, color: "rgba(255,255,255,.62)" }}>
                  {formatMoney(current.amount, current.currency)} · billed {cycle}
                </div>
              )}
              {current?.date && (
                <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.66)" }}>
                  <span style={{ fontSize: 15 }}>🗓️</span>
                  Next renewal on <b style={{ color: "white", fontWeight: 700 }}>{current.date}</b>
                </div>
              )}
              <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/billing" style={{ ...primaryBtnStyle, textDecoration: "none" }}>
                  Adjust Plan
                </Link>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setCancelOpen((v) => !v)}
                    style={{
                      ...ghostBtnStyle,
                      color: "#fca5a5",
                      borderColor: "rgba(239,68,68,.28)",
                    }}
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div style={cardStyle}>
              <div style={softLabel}>Payment Method</div>
              <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 54,
                    height: 36,
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#f97316,#ef4444)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: 0.5,
                    boxShadow: "0 6px 14px -6px rgba(239,68,68,.5)",
                  }}
                >
                  💳
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {payment?.managedExternally ? "Managed by LemonSqueezy" : "No card on file"}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 2 }}>
                    {payment?.note || "Add a payment method to activate billing."}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/billing" style={{ ...primaryBtnStyle, textDecoration: "none" }}>
                  Update Card
                </Link>
                <button type="button" style={ghostBtnStyle} onClick={() => window.location.reload()}>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* CANCEL PANEL */}
          {cancelOpen && isAdmin && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 22,
                border: "1px solid rgba(239,68,68,.22)",
                background: "rgba(239,68,68,.05)",
              }}
            >
              <div style={{ ...softLabel, color: "rgba(252,165,165,.7)" }}>Cancel Subscription</div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 10 }}>
                Your account will move to read-only for 30 days, and your data will be retained for 90 days
                before permanent deletion. You can reactivate any time during this window.
              </p>
              {cancelError && <Alert msg={cancelError} type="error" />}
              <label style={{ display: "block", marginTop: 12 }}>
                <span style={{ ...softLabel, display: "block", marginBottom: 6 }}>
                  Reason (optional)
                </span>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Help us improve — what made you cancel?"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.1)",
                    color: "white",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancel}
                  style={{
                    ...primaryBtnStyle,
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    boxShadow: "0 10px 24px -14px rgba(239,68,68,.7)",
                    opacity: cancelling ? 0.6 : 1,
                    cursor: cancelling ? "not-allowed" : "pointer",
                  }}
                >
                  {cancelling ? "Cancelling…" : "Confirm Cancel"}
                </button>
                <button type="button" onClick={() => setCancelOpen(false)} style={ghostBtnStyle}>
                  Keep Subscription
                </button>
              </div>
            </div>
          )}

          {/* INVOICES */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={softLabel}>Invoices</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0 0" }}>Billing History</h2>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                {invoices.length} record{invoices.length === 1 ? "" : "s"}
              </div>
            </div>

            {invoices.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "rgba(255,255,255,.42)",
                  fontSize: 13,
                  border: "1px dashed rgba(255,255,255,.08)",
                  borderRadius: 14,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>🧾</div>
                No invoices yet. They will appear here once your first payment is processed.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 640 }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      {["Invoice", "Date", "Plan", "Total", "Status", "Action"].map((h) => (
                        <th
                          key={h}
                          style={{
                            ...softLabel,
                            padding: "10px 14px",
                            borderBottom: "1px solid rgba(255,255,255,.08)",
                            fontWeight: 800,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ padding: "14px", fontSize: 13, fontWeight: 700 }}>{inv.number}</td>
                        <td style={{ padding: "14px", fontSize: 13, color: "rgba(255,255,255,.72)" }}>{inv.date}</td>
                        <td style={{ padding: "14px", fontSize: 13, color: "rgba(255,255,255,.72)" }}>
                          {PLAN_LABELS[inv.plan?.toUpperCase()] || inv.plan}
                          <span style={{ color: "rgba(255,255,255,.35)", marginLeft: 6, fontSize: 11 }}>
                            · {inv.billingCycle?.toLowerCase()}
                          </span>
                        </td>
                        <td style={{ padding: "14px", fontSize: 13, fontWeight: 800 }}>
                          {formatMoney(inv.amount, inv.currency)}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <StatusPill status={inv.status} />
                        </td>
                        <td style={{ padding: "14px" }}>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#a78bfa",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footnote */}
          <p style={{ marginTop: 22, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.34)" }}>
            Need help with billing? <Link href="/dashboard/support" style={{ color: "#a78bfa" }}>Contact support</Link> — we usually reply within a few hours.
          </p>
        </>
      )}
    </div>
  );
}
