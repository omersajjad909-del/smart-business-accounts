"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type CompliancePayload = {
  company: {
    name: string;
    country: string | null;
    baseCurrency: string;
    plan: string;
    subscriptionStatus: string | null;
    createdAt: string;
  };
  summary: {
    score: number;
    totalControls: number;
    activeApiKeys: number;
    apiUsageCount30: number;
    logCount30: number;
    loginCount30: number;
  };
  controls: Array<{
    key: string;
    label: string;
    status: string;
    detail: string;
  }>;
  sso: {
    configured: boolean;
    enabled: boolean;
    providerName: string;
    providerType: string;
    domainHint: string;
    updatedAt: string | null;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    keyPreview: string;
    status: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  plan: {
    code: string;
    subscriptionStatus: string | null;
    hasPlanConfig: boolean;
  };
};

function statusTone(status: string) {
  if (status === "configured") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  if (status === "attention") return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return "border-slate-500/20 bg-slate-500/10 text-slate-700";
}

export default function ComplianceReportPage() {
  const [data, setData] = useState<CompliancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = getCurrentUser();
        const res = await fetch("/api/reports/compliance", {
          headers: {
            "x-user-id": user?.id || "",
            "x-user-role": user?.role || "",
            "x-company-id": user?.companyId || "",
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load compliance report");
        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to load compliance report");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const readiness = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.summary.score / data.summary.totalControls) * 100);
  }, [data]);

  if (loading) {
    return <div className="p-6 text-sm text-[var(--text-muted)]">Loading compliance report...</div>;
  }
  if (error || !data) {
    return <div className="p-6 text-sm text-red-600">{error || "Failed to load compliance report"}</div>;
  }

  return (
    <div className="space-y-6 p-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Compliance Report</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{data.company.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Operational readiness summary for audit activity, identity controls, API access, backup posture, and key
              system administration signals.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4 text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Readiness</div>
            <div className="mt-1 text-3xl font-bold text-indigo-700">{readiness}%</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Plan</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.plan.code}</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">{data.plan.subscriptionStatus || "Unknown"}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Audit logs</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.summary.logCount30}</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">Last 30 days</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Active API keys</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.summary.activeApiKeys}</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">{data.summary.apiUsageCount30} API calls in 30 days</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Logins</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.summary.loginCount30}</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">Tracked access events</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Control status</h2>
          <div className="mt-4 grid gap-4">
            {data.controls.map((control) => (
              <div key={control.key} className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--text-primary)]">{control.label}</div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(control.status)}`}>
                    {control.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{control.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">SSO posture</h2>
            <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
              <p>Configured: {data.sso.configured ? "Yes" : "No"}</p>
              <p>Enabled: {data.sso.enabled ? "Yes" : "No"}</p>
              <p>Provider: {data.sso.providerName || "Not set"}</p>
              <p>Type: {data.sso.providerType || "Not set"}</p>
              <p>Domain: {data.sso.domainHint || "Not set"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">API key register</h2>
            <div className="mt-4 space-y-3">
              {data.apiKeys.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No API keys recorded.</div>
              ) : (
                data.apiKeys.map((key) => (
                  <div key={key.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text-primary)]">{key.name}</div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(key.status)}`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">{key.keyPreview}</div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Created: {new Date(key.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
