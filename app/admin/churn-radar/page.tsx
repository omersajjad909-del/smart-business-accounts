"use client";

/**
 * Churn Radar — every customer ranked by how likely they are to leave.
 *
 * Built as one table rather than a dashboard of charts. With a customer base
 * this size a chart hides the thing that matters, which is the individual name
 * and the individual reason next to it. Charts can come back when there are
 * enough rows that reading them all stops being possible.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, ScoreBar, Section, aiKitCss, card, fmtDate, getJson,
  pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Company = {
  companyId: string;
  name: string;
  plan: string;
  billedPlan: string | null;
  billingStatus: string | null;
  pricePerMonth: number;
  country: string | null;
  ageDays: number;
  userCount: number;
  daysSinceLogin: number | null;
  lastLoginAt: string | null;
  invoicesLast30: number;
  invoicesPrev30: number;
  invoiceTrendPct: number | null;
  setupDone: boolean;
  risk: number;
  band: "critical" | "watch" | "healthy";
  reasons: string[];
};

type Payload = {
  aiConfigured: boolean;
  generatedAt: string;
  companies: Company[];
  summary: { total: number; critical: number; watch: number; healthy: number; mrrAtRisk: number };
};

type Draft = { companyId: string; name: string; risk: number; reasons: string[]; draft: string };

const BANDS = {
  critical: { label: "Critical", tone: "red" as const },
  watch: { label: "Watch", tone: "amber" as const },
  healthy: { label: "Healthy", tone: "green" as const },
};

export default function ChurnRadarPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "critical" | "watch" | "healthy">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/churn-radar")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const draftMessage = useCallback(async (companyId: string) => {
    setDrafting(companyId);
    setError(null);
    try {
      const d = await postJson<Draft>("/api/admin/churn-radar", { companyId });
      setDrafts((prev) => ({ ...prev, [companyId]: d }));
      setOpen(companyId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDrafting(null);
    }
  }, []);

  const rows = (data?.companies || []).filter((c) => filter === "all" || c.band === filter);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Churn Radar"
        subtitle="Every customer scored on the signals that come before a cancellation — silence, a stalled setup, invoicing that stopped, a payment that failed. Scores are rules, not a model, so they are the same every time you load this page."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Reading usage signals…" />
      ) : !data ? (
        <Empty>Could not load customer signals.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Critical", value: data.summary.critical, color: "#f87171", sub: "Act this week" },
            { label: "Watch", value: data.summary.watch, color: "#fbbf24", sub: "Worth a message" },
            { label: "Healthy", value: data.summary.healthy, color: "#34d399", sub: "Nothing to do" },
            { label: "MRR at risk", value: `$${data.summary.mrrAtRisk.toLocaleString()}`, color: "#c4b5fd", sub: "Critical + watch" },
          ]} />

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {(["all", "critical", "watch", "healthy"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                textTransform: "capitalize",
                background: filter === f ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                border: filter === f ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
                color: filter === f ? "#818cf8" : "rgba(255,255,255,.4)",
              }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            {rows.length === 0 ? (
              <Empty>
                {data.summary.total === 0
                  ? "No customer companies yet. Demo sandboxes and internal test workspaces are excluded from this list on purpose."
                  : "Nothing in this band."}
              </Empty>
            ) : (
              rows.map((c, i) => {
                const isOpen = open === c.companyId;
                const draft = drafts[c.companyId];
                return (
                  <div key={c.companyId} className="ai-row" style={{
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.05)",
                  }}>
                    <div className="ai-listrow" onClick={() => setOpen(isOpen ? null : c.companyId)}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                          {c.billedPlan || c.plan} · {c.country || "—"} · {c.userCount} user{c.userCount === 1 ? "" : "s"} · {c.ageDays}d old
                        </div>
                      </div>
                      <Pill tone={BANDS[c.band].tone}>{BANDS[c.band].label}</Pill>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)" }}>
                        {c.daysSinceLogin === null ? "Never in" : `${c.daysSinceLogin}d quiet`}
                      </div>
                      <ScoreBar value={c.risk} />
                      <div style={{ fontSize: 16, color: "rgba(255,255,255,.2)", textAlign: "right" }}>
                        {isOpen ? "▾" : "▸"}
                      </div>
                    </div>

                    {isOpen ? (
                      <div style={{ padding: "0 20px 20px", display: "grid", gap: 16 }}>
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10,
                        }}>
                          {[
                            { k: "Last login", v: c.lastLoginAt ? fmtDate(c.lastLoginAt) : "Never" },
                            { k: "Invoices (30d)", v: `${c.invoicesLast30} vs ${c.invoicesPrev30} prior` },
                            { k: "Trend", v: c.invoiceTrendPct === null ? "No baseline" : `${c.invoiceTrendPct > 0 ? "+" : ""}${c.invoiceTrendPct}%` },
                            { k: "Billing", v: c.billingStatus || "—" },
                            { k: "Price", v: c.pricePerMonth ? `$${c.pricePerMonth}/mo` : "—" },
                            { k: "Setup", v: c.setupDone ? "Complete" : "Not finished" },
                          ].map((x) => (
                            <div key={x.k} style={{
                              background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
                              borderRadius: 10, padding: "9px 12px",
                            }}>
                              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", fontWeight: 700 }}>{x.k}</div>
                              <div style={{ fontSize: 12.5, color: "#e2e8f0", marginTop: 2 }}>{x.v}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,.45)", marginBottom: 7 }}>
                            WHY THIS SCORE
                          </div>
                          {c.reasons.length === 0 ? (
                            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>
                              Nothing flagged. This customer logs in, invoices, and pays.
                            </div>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "rgba(255,255,255,.7)", lineHeight: 1.8 }}>
                              {c.reasons.map((r) => <li key={r}>{r}</li>)}
                            </ul>
                          )}
                        </div>

                        {draft ? (
                          <div style={{
                            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                            borderRadius: 14, padding: "16px 18px",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.5)" }}>DRAFT MESSAGE</span>
                              <div style={{ display: "flex", gap: 6 }}>
                                <CopyButton text={draft.draft} />
                                <Button tone="ghost" onClick={() => draftMessage(c.companyId)} busy={drafting === c.companyId}>
                                  Redraft
                                </Button>
                              </div>
                            </div>
                            <Prose text={draft.draft} />
                            <ReviewNotice>
                              Nothing is sent from this page. Copy it, read it once more, and send it yourself
                              from wherever you already talk to this customer.
                            </ReviewNotice>
                          </div>
                        ) : data.aiConfigured ? (
                          <div>
                            <Button onClick={() => draftMessage(c.companyId)} busy={drafting === c.companyId}>
                              Draft a message to {c.name.split(" ")[0]}
                            </Button>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                            Set GROQ_API_KEY or OPENAI_API_KEY to draft retention messages here.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <Section style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", lineHeight: 1.7 }}>
              Scored {fmtDate(data.generatedAt)}. A score is the sum of the flags listed under each
              customer, capped at 100 — no model is involved in the ranking, so the same data always
              produces the same order. Customers with no invoicing history are not scored on a drop
              they cannot have had.
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
