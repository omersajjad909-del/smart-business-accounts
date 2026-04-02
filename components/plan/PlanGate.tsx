"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  feature: string;        // e.g. "hrPayroll", "crm", "bankReconciliation", "apiAccess", "multiBranch"
  requiredPlan?: string;  // display name, e.g. "Professional"
  children: React.ReactNode;
};

const FEATURE_MAP: Record<string, { label: string; plan: string }> = {
  hrPayroll:         { label: "HR & Payroll",          plan: "Enterprise" },
  crm:               { label: "CRM",                    plan: "Professional" },
  bankReconciliation:{ label: "Bank Reconciliation",    plan: "Professional" },
  apiAccess:         { label: "API Access",             plan: "Enterprise" },
  multiBranch:       { label: "Multi-Branch",           plan: "Professional" },
  advancedReports:   { label: "Advanced Reports",       plan: "Professional" },
  inventoryReports:  { label: "Inventory Reports",      plan: "Professional" },
  backupRestore:     { label: "Backup & Restore",       plan: "Professional" },
};

export default function PlanGate({ feature, requiredPlan, children }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cRes, cfgRes] = await Promise.all([
          fetch("/api/me/company", { cache: "no-store" }),
          fetch("/api/public/plan-config", { cache: "no-store" }),
        ]);

        if (!cRes.ok) { setAllowed(true); return; } // fail open

        const company = await cRes.json();
        const plan = String(company?.plan || "STARTER").toUpperCase();

        // Map plan codes
        const planRank: Record<string, number> = {
          STARTER: 0, PRO: 1, PROFESSIONAL: 1, ENTERPRISE: 2, CUSTOM: 2,
        };
        const userRank = planRank[plan] ?? 0;

        // Check feature against plan config if available
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (Array.isArray(cfg?.plans)) {
            const planCode = plan === "PROFESSIONAL" ? "pro" : plan.toLowerCase();
            const p = cfg.plans.find((p: any) => p.code === planCode);
            if (p?.features && feature in p.features) {
              setAllowed(!!p.features[feature]);
              return;
            }
          }
        }

        // Fallback: use hardcoded feature-to-plan mapping
        const info = FEATURE_MAP[feature];
        if (!info) { setAllowed(true); return; }

        const requiredRank = info.plan === "Enterprise" ? 2 : 1;
        setAllowed(userRank >= requiredRank);
      } catch {
        setAllowed(true); // fail open
      }
    })();
  }, [feature]);

  if (allowed === null) return null; // loading — show nothing

  if (!allowed) {
    const info = FEATURE_MAP[feature] || { label: feature, plan: requiredPlan || "a higher plan" };
    return (
      <div style={{
        minHeight: 360, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "60px 32px", fontFamily: "'Inter',sans-serif",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", marginBottom: 24,
          background: "rgba(99,102,241,.12)", border: "1.5px solid rgba(99,102,241,.25)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 10px" }}>
          {info.label} — Upgrade Required
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", maxWidth: 380, lineHeight: 1.7, margin: "0 0 28px" }}>
          This feature is available on the <strong style={{ color: "#a5b4fc" }}>{info.plan}</strong> plan and above.
          Upgrade your subscription to unlock {info.label}.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboard/billing" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 10,
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(99,102,241,.35)",
          }}>
            Upgrade Now →
          </Link>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center",
            padding: "12px 20px", borderRadius: 10,
            border: "1.5px solid rgba(255,255,255,.1)",
            color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 14, textDecoration: "none",
          }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
