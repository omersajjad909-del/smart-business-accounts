"use client";
// FILE: app/dashboard/import/page.tsx
//
// The migration, laid out as the eight steps it actually is, in the order they
// have to happen.
//
// Deliberately numbered down the page rather than presented as a grid of equal
// tiles. Import order is not a preference: opening balances cannot attach to
// accounts that are not there yet, and an open invoice cannot find a customer
// nobody imported. A grid invites someone to start at step 6, and every one of
// those rows then fails with "no account matches", which reads as the product
// being broken rather than the steps being out of order.
//
// Each row shows what is already in the database for that step, so two people
// working a migration across two days can both see where it got to.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";
import { IMPORT_DATA_TYPES } from "@/lib/importEngine";

const FONT = "'Outfit','Inter',sans-serif";

type Status = {
  counts: Record<string, number>;
  trialBalance: { debit: number; credit: number; difference: number; balanced: boolean };
  cutoverDate: string | null;
};

const card: React.CSSProperties = {
  background: "var(--panel-bg)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

const money = (n: number) =>
  `Rs. ${Math.round(n).toLocaleString("en-PK")}`;

export default function ImportCenterPage() {
  const { isMobile } = useResponsive();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  const headers = useCallback((): Record<string, string> => {
    const u = getCurrentUser();
    return u
      ? { "x-user-id": u.id, "x-user-role": u.role ?? "", "x-company-id": u.companyId || "" }
      : {};
  }, []);

  useEffect(() => {
    fetch("/api/import/status", { headers: headers(), credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!d?.error) setStatus(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [headers]);

  const steps = [...IMPORT_DATA_TYPES].sort((a, b) => a.order - b.order);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--app-bg)", color: "var(--text-primary)",
      padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: FONT,
    }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.5 }}>
          Import Center
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", maxWidth: 760, lineHeight: 1.6 }}>
          Move your business onto FinovaOS from Oracle, QuickBooks, Xero, Sage, Tally or a
          spreadsheet. Work down the list — each step needs the one above it.
        </p>
      </div>

      {/* ── The one thing worth saying before anybody starts ── */}
      <div style={{
        ...card,
        borderColor: "rgba(99,102,241,.3)",
        background: "rgba(99,102,241,.08)",
        padding: isMobile ? "14px 14px" : "18px 22px",
        marginBottom: 22,
        display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>💡</div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            You do not import ten years of transactions. You import balances.
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.65 }}>
            Pick a cutover date — the start of a financial year is easiest — and bring across the
            position on that date: the trial balance, the parties, the items, the stock on hand and
            the bills still unpaid. History before that date stays in the old system, which you keep
            read-only. Run both in parallel for a month or two before you switch off.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard/import/oracle-guide" style={{
              fontSize: 12.5, fontWeight: 700, color: "#818cf8", textDecoration: "none",
            }}>
              The cutover plan →
            </Link>
            <Link href="/dashboard/import/guide" style={{
              fontSize: 12.5, fontWeight: 700, color: "#818cf8", textDecoration: "none",
            }}>
              How to export from your system →
            </Link>
            <Link href="/dashboard/import/guide/fields" style={{
              fontSize: 12.5, fontWeight: 700, color: "#818cf8", textDecoration: "none",
            }}>
              Column reference →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Trial balance check ── */}
      {status && status.counts.opening_balances > 0 && (
        <div style={{
          ...card,
          borderColor: status.trialBalance.balanced ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)",
          background: status.trialBalance.balanced ? "rgba(34,197,94,.07)" : "rgba(239,68,68,.07)",
          padding: isMobile ? "13px 14px" : "16px 22px",
          marginBottom: 22,
        }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, marginBottom: 4,
            color: status.trialBalance.balanced ? "#22c55e" : "#ef4444",
          }}>
            {status.trialBalance.balanced
              ? "✓ Opening trial balance is balanced"
              : `✗ Opening trial balance is out by ${money(Math.abs(status.trialBalance.difference))}`}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Debit {money(status.trialBalance.debit)} · Credit {money(status.trialBalance.credit)}
            {!status.trialBalance.balanced &&
              " — an account from the old system has not come across, or came across on the wrong side."}
          </div>
        </div>
      )}

      {/* ── The steps ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step, index) => {
          const count = status?.counts?.[step.id] ?? 0;
          const done = count > 0;
          return (
            <div key={step.id} style={{
              ...card,
              padding: isMobile ? "14px 14px" : "16px 20px",
              display: "flex", gap: isMobile ? 12 : 16,
              alignItems: isMobile ? "flex-start" : "center",
              flexWrap: "wrap",
            }}>
              {/* Number */}
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800,
                background: done ? "rgba(34,197,94,.14)" : "rgba(255,255,255,.05)",
                border: `1px solid ${done ? "rgba(34,197,94,.3)" : "var(--border)"}`,
                color: done ? "#22c55e" : "var(--text-muted)",
              }}>
                {done ? "✓" : index + 1}
              </div>

              {/* Name + why */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 3 }}>
                  {step.icon} {step.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {step.desc}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", opacity: 0.72, marginTop: 3, fontStyle: "italic" }}>
                  {step.why}
                </div>
              </div>

              {/* Count */}
              <div style={{ textAlign: isMobile ? "left" : "right", minWidth: 92 }}>
                <div style={{
                  fontSize: 18, fontWeight: 800,
                  color: done ? "#22c55e" : "var(--text-muted)",
                }}>
                  {loading ? "—" : count.toLocaleString("en-PK")}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  in system
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a
                  href={`/api/import/template?dataType=${step.id}`}
                  style={{
                    padding: "8px 13px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--text-muted)", textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  ⬇ Template
                </a>
                <Link
                  href={`/dashboard/import-wizard?dataType=${step.id}`}
                  style={{
                    padding: "8px 15px", borderRadius: 9, fontSize: 12, fontWeight: 700,
                    border: "none", background: "#6366f1", color: "#fff",
                    textDecoration: "none", whiteSpace: "nowrap",
                  }}
                >
                  Import →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── After the import ── */}
      <div style={{ ...card, padding: isMobile ? "16px 14px" : "20px 24px", marginTop: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Once every step is green</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
          {[
            { href: "/dashboard/reports/trial-balance", label: "Trial Balance", why: "Must equal the old system's, to the rupee." },
            { href: "/dashboard/reports/stock", label: "Stock Report", why: "Quantities and value against the physical count." },
            { href: "/dashboard/reports/ageing", label: "Receivables Ageing", why: "Party totals against the old ageing report." },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
              textDecoration: "none", color: "var(--text-primary)", display: "block",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{item.label} →</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.why}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
