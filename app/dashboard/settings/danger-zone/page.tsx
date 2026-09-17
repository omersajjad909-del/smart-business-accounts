"use client";

/**
 * Settings → Danger Zone.
 *
 * One irreversible action lives here: wipe every record this company has
 * ever entered (invoices, vouchers, ledger, contacts, employees — everything
 * clearCompanyData touches) while keeping the company, its plan and its
 * logins intact. Because there is no undo, the confirm step asks for two
 * things a stolen or hijacked session would not have handy: the admin's
 * current password, and the company's exact name typed by hand.
 */

import { useEffect, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(239,68,68,0.35)";

export default function DangerZonePage() {
  const { isMobile } = useResponsive();
  const [companyName, setCompanyName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/company/reset-all", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setError(d.error); return; }
        setCompanyName(d.companyName || "");
        setIsAdmin(Boolean(d.isAdmin));
      })
      .catch(() => setError("Could not load company info."))
      .finally(() => setLoading(false));
  }, []);

  function openConfirm() {
    setModalError("");
    setPassword("");
    setConfirmName("");
    setShowConfirm(true);
  }

  function closeConfirm() {
    if (submitting) return;
    setShowConfirm(false);
  }

  async function doReset() {
    setModalError("");
    if (!password) {
      setModalError("Enter your current password.");
      return;
    }
    if (confirmName.trim() !== companyName) {
      setModalError("Type the company name exactly as shown to confirm.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/company/reset-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Could not reset the system.");
      setShowConfirm(false);
      setDone(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Could not reset the system.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = password.length > 0 && confirmName.trim() === companyName && !submitting;

  return (
    <div style={{ fontFamily: ff, color: "#fff", padding: isMobile ? "16px 12px 80px" : "24px 28px 80px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Danger Zone</h1>
      <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.45)", margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
        Actions here cannot be undone. Read each one carefully before continuing.
      </p>

      {error && (
        <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {done && (
        <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.28)", color: "#86efac", fontSize: 12.5 }}>
          System reset. Every record has been cleared — your login, company and plan are untouched.
        </div>
      )}

      {loading ? (
        <div style={{ marginTop: 24, color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{ marginTop: 18, background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "16px 14px" : "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 480 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#fca5a5" }}>Reset All System</div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", margin: "6px 0 0", lineHeight: 1.7 }}>
                Permanently deletes every invoice, voucher, ledger entry, contact, employee, bank
                account and record this company has ever entered. Your login, the company itself
                and its subscription are kept — this only empties what is inside.
              </p>
            </div>
            {!isAdmin ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>
                Only an admin can do this
              </div>
            ) : (
              <button
                onClick={openConfirm}
                style={{
                  padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(239,68,68,.5)",
                  background: "rgba(239,68,68,.12)", color: "#fca5a5", fontSize: 13, fontWeight: 800,
                  fontFamily: ff, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                Reset All System
              </button>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={closeConfirm}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 440, background: "#0d1035", border: `1px solid ${border}`,
              borderRadius: 16, padding: "22px 22px 20px", fontFamily: ff, color: "#fff",
              boxShadow: "0 20px 60px rgba(0,0,0,.5)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fca5a5" }}>Reset all system data?</div>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", margin: "8px 0 16px", lineHeight: 1.7 }}>
              This deletes everything this company has recorded. It cannot be undone. To continue,
              confirm your password and type the company name below.
            </p>

            <label style={{ display: "block", fontSize: 11.5, color: "rgba(255,255,255,.5)", marginBottom: 5 }}>
              Current password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 13, fontFamily: ff,
                boxSizing: "border-box", outline: "none",
              }}
            />

            <label style={{ display: "block", fontSize: 11.5, color: "rgba(255,255,255,.5)", margin: "14px 0 5px" }}>
              Type <strong style={{ color: "#fff" }}>{companyName}</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={companyName}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 9, background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.1)", color: "#fff", fontSize: 13, fontFamily: ff,
                boxSizing: "border-box", outline: "none",
              }}
            />

            {modalError && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#fca5a5", fontSize: 12 }}>
                {modalError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                onClick={closeConfirm}
                disabled={submitting}
                style={{
                  padding: "9px 16px", borderRadius: 9, background: "rgba(255,255,255,.05)",
                  border: `1px solid ${border}`, color: "rgba(255,255,255,.7)", fontSize: 12.5,
                  fontWeight: 700, fontFamily: ff, cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={doReset}
                disabled={!canSubmit}
                style={{
                  padding: "9px 18px", borderRadius: 9, border: "none",
                  background: canSubmit ? "#ef4444" : "rgba(239,68,68,.35)",
                  color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: ff,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Resetting…" : "Reset everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
