"use client";

/**
 * Free Trials — every company that started a trial, how long it has left, and
 * whether it has done anything real yet.
 *
 * The column that matters is Activated: a trial that recorded an invoice or a
 * payment is a business using the product; one that only signed up is not, and
 * those are the ones worth a WhatsApp message before the days run out.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill, Section,
  aiKitCss, card, fmtDate, getJson, pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Row = {
  companyId: string;
  name: string;
  email: string | null;
  country: string | null;
  status: string;
  stage: "active" | "grace" | "expired" | "converted" | "ended";
  daysLeft: number;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  source: string | null;
  phone: string | null;
  invoices: number;
  receipts: number;
  activated: boolean;
  supportAccessUntil: string | null;
};

type Payload = {
  graceDays: number;
  summary: {
    total: number; active: number; grace: number; activated: number;
    converted: number; activationRate: number; conversionRate: number;
  };
  rows: Row[];
  openRequests: { companyId: string; name: string; note: string; at: string }[];
};

const STAGES = {
  active: { label: "In trial", tone: "green" as const },
  grace: { label: "Read-only grace", tone: "amber" as const },
  expired: { label: "Expired", tone: "red" as const },
  converted: { label: "Paid", tone: "blue" as const },
  ended: { label: "Ended", tone: "grey" as const },
};

export default function AdminTrialsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "idle" | "grace" | "converted">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/trials")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const act = useCallback(async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [load]);

  const extend = (companyId: string) =>
    act(`ext:${companyId}`, () =>
      postJson("/api/admin/billing/override", { companyId, action: "EXTEND_TRIAL", payload: { days: 7 } }),
    );
  const setupDone = (companyId: string) =>
    act(`done:${companyId}`, () => postJson("/api/admin/trials", { companyId, action: "setup_done" }));

  const rows = (data?.rows || []).filter((r) => {
    if (filter === "all") return true;
    if (filter === "idle") return r.stage === "active" && !r.activated;
    return r.stage === filter;
  });

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Free Trials"
        subtitle="Everyone who started a trial, how many days they have left, and whether they have recorded a real invoice or payment yet. Idle trials are the ones to message before the days run out."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Loading trials…" />
      ) : !data ? (
        <Empty>Could not load trials.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Trials started", value: data.summary.total, color: "#fb923c" },
            { label: "In trial now", value: data.summary.active, color: "#34d399" },
            { label: "Activated", value: `${data.summary.activationRate}%`, color: "#fbbf24", sub: `${data.summary.activated} recorded a real transaction` },
            { label: "Converted to paid", value: `${data.summary.conversionRate}%`, color: "#60a5fa", sub: `${data.summary.converted} paying` },
          ]} />

          {data.openRequests.length > 0 ? (
            <Section title={`Setup help requested (${data.openRequests.length})`}>
              {data.openRequests.map((r) => (
                <div key={r.companyId} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                      {fmtDate(r.at)}{r.note ? ` · ${r.note}` : ""}
                    </div>
                  </div>
                  <Button tone="ghost" busy={busy === `done:${r.companyId}`} onClick={() => setupDone(r.companyId)}>
                    Mark done
                  </Button>
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 10 }}>
                A request does not give you access to the company's data. Ask the customer to share their file or screen.
              </div>
            </Section>
          ) : null}

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {([
              ["all", "All"], ["active", "In trial"], ["idle", "Idle (no transaction)"],
              ["grace", "Grace"], ["converted", "Paid"],
            ] as const).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: filter === f ? "rgba(251,146,60,.2)" : "rgba(255,255,255,.05)",
                border: filter === f ? "1px solid #fb923c" : "1px solid rgba(255,255,255,.1)",
                color: filter === f ? "#fb923c" : "rgba(255,255,255,.4)",
              }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {rows.length === 0 ? (
              <Empty>{data.summary.total === 0 ? "No trials yet. They appear here as soon as someone signs up through the trial link." : "Nothing in this view."}</Empty>
            ) : (
              rows.map((r, i) => (
                <div key={r.companyId} style={{
                  display: "grid", gridTemplateColumns: "minmax(180px,2fr) 110px 90px 130px minmax(120px,1fr) 100px",
                  gap: 12, alignItems: "center", padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.06)", fontSize: 13,
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)" }}>
                      {r.email || "—"}{r.phone ? ` · ${r.phone}` : ""}
                    </div>
                    {r.supportAccessUntil ? (
                      <div style={{ fontSize: 11, color: "#34d399", marginTop: 2 }}>
                        Support access allowed until {fmtDate(r.supportAccessUntil)}
                      </div>
                    ) : null}
                  </div>
                  <div><Pill tone={STAGES[r.stage].tone}>{STAGES[r.stage].label}</Pill></div>
                  <div style={{ color: "rgba(255,255,255,.7)" }}>
                    {r.stage === "active" ? `${r.daysLeft}d left` : fmtDate(r.trialEndsAt)}
                  </div>
                  <div>
                    {r.activated
                      ? <Pill tone="green">{r.invoices} inv · {r.receipts} pay</Pill>
                      : <Pill tone="grey">No transaction</Pill>}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{r.source || "—"} · {r.country || "—"}</div>
                  <div style={{ textAlign: "right" }}>
                    {r.stage === "active" || r.stage === "grace" || r.stage === "expired" ? (
                      <Button tone="ghost" busy={busy === `ext:${r.companyId}`} onClick={() => extend(r.companyId)} title="Give this trial 7 more days from today">
                        +7 days
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
