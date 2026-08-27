"use client";

/**
 * Onboarding Assistant — a first-week setup plan for a new company.
 *
 * The chart of accounts is shown as the table it will become, not as prose,
 * because it is going to be imported and every row has to be checked. Rows the
 * server rejected are shown too — a silently shortened chart is how a customer
 * ends up missing a ledger they were told they had.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, Section, aiKitCss, card, fmtDate, getJson, inputStyle,
  pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Candidate = {
  companyId: string;
  name: string;
  businessType: string;
  country: string | null;
  plan: string;
  ageDays: number;
  setupDone: boolean;
  userCount: number;
  accountCount: number;
  itemCount: number;
  invoicesLast30: number;
  daysSinceLogin: number | null;
  stuck: boolean;
};

type Payload = {
  aiConfigured: boolean;
  candidates: Candidate[];
  summary: { total: number; stuck: number; setupIncomplete: number };
};

type Plan = {
  businessSummary: string;
  chartOfAccounts: Array<{ code: string; name: string; type: string; partyType: string; note?: string }>;
  checklist: Array<{ step: string; why: string; where: string }>;
  watchOutFor: string[];
  welcomeMessage: string;
};

type Result = {
  companyId: string;
  name: string;
  plan: Plan;
  csv: string;
  rejected: string[];
  generatedAt: string;
};

const TYPE_COLOR: Record<string, string> = {
  ASSET: "#6ee7b7",
  LIABILITY: "#fca5a5",
  EQUITY: "#c4b5fd",
  INCOME: "#93c5fd",
  EXPENSE: "#fcd34d",
  CONTRA_ASSET: "rgba(255,255,255,.45)",
};

export default function OnboardingAssistantPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/onboarding-assistant")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const build = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postJson<Result>("/api/admin/onboarding-assistant", {
        companyId: selected, notes: notes.trim() || undefined,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [selected, notes]);

  const chosen = data?.candidates.find((c) => c.companyId === selected) || null;

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Onboarding Assistant"
        subtitle="A chart of accounts built for the customer's actual trade, plus the order to do things in. The chart comes out as CSV in exactly the shape the accounts importer accepts — nothing on this page writes into a customer company."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Finding companies still setting up…" />
      ) : !data ? (
        <Empty>Could not load new companies.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Stuck", value: data.summary.stuck, color: data.summary.stuck ? "#f87171" : "#34d399", sub: "Days in, chart still empty" },
            { label: "Setup unfinished", value: data.summary.setupIncomplete, color: "#fbbf24", sub: "Flag never cleared" },
            { label: "In the window", value: data.summary.total, color: "#818cf8", sub: "New or still setting up" },
          ]} />

          {data.candidates.length === 0 ? (
            <Section>
              <Empty>
                No company is mid-setup. Every customer is past their first six weeks with a chart
                of accounts in place.
              </Empty>
            </Section>
          ) : (
            <Section title="Pick a company">
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                {data.candidates.map((c) => {
                  const on = selected === c.companyId;
                  return (
                    <button
                      key={c.companyId}
                      onClick={() => { setSelected(c.companyId); setResult(null); }}
                      style={{
                        textAlign: "left", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                        background: on ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.03)",
                        border: on ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.07)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>{c.name}</span>
                        <Pill tone="grey">{c.businessType}</Pill>
                        <Pill tone="grey">{c.plan}</Pill>
                        {c.stuck ? <Pill tone="red">Stuck</Pill> : null}
                        {!c.setupDone ? <Pill tone="amber">Setup unfinished</Pill> : null}
                      </div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)" }}>
                        {c.country || "—"} · {c.ageDays}d old · {c.accountCount} accounts ·
                        {" "}{c.itemCount} items · {c.invoicesLast30} invoices ·
                        {" "}{c.daysSinceLogin === null ? "never logged in" : `seen ${c.daysSinceLogin}d ago`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {chosen ? (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "rgba(255,255,255,.4)", marginBottom: 7 }}>
                    ANYTHING YOU KNOW THAT THE DATA DOES NOT (OPTIONAL)
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="PVC pipe trader in Faisalabad, sells by weight, imports raw material, keeps two godowns…"
                    style={{ ...inputStyle, resize: "vertical", marginBottom: 12 }}
                  />
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", marginBottom: 12, lineHeight: 1.6 }}>
                    This is the highest-value field on the page. &ldquo;Trading&rdquo; produces a
                    generic chart; &ldquo;PVC pipe trader who sells by weight&rdquo; produces the
                    freight-inward and wastage ledgers they will actually need.
                  </div>
                  {data.aiConfigured ? (
                    <Button onClick={build} busy={busy}>
                      {result ? "Build again" : `Build the setup plan for ${chosen.name}`}
                    </Button>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                      Set GROQ_API_KEY or OPENAI_API_KEY to generate setup plans.
                    </div>
                  )}
                </>
              ) : null}
            </Section>
          )}

          {busy ? <Loading label="Designing the chart of accounts…" /> : null}

          {result ? (
            <>
              <Section title={`Setup plan — ${result.name}`}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.7 }}>
                  {result.plan.businessSummary}
                </div>
              </Section>

              <Section
                title={`Chart of accounts (${result.plan.chartOfAccounts.length})`}
                right={<CopyButton text={result.csv} label="Copy CSV" />}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ color: "rgba(255,255,255,.35)", textAlign: "left" }}>
                        <th style={{ padding: "7px 10px", fontWeight: 700 }}>Code</th>
                        <th style={{ padding: "7px 10px", fontWeight: 700 }}>Name</th>
                        <th style={{ padding: "7px 10px", fontWeight: 700 }}>Type</th>
                        <th style={{ padding: "7px 10px", fontWeight: 700 }}>Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.plan.chartOfAccounts.map((a) => (
                        <tr key={a.code} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                          <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.45)", fontFamily: "ui-monospace,monospace" }}>{a.code}</td>
                          <td style={{ padding: "8px 10px", color: "#e2e8f0" }}>
                            {a.name}
                            {a.note ? (
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 2 }}>{a.note}</div>
                            ) : null}
                          </td>
                          <td style={{ padding: "8px 10px", color: TYPE_COLOR[a.type] || "rgba(255,255,255,.5)", fontWeight: 700, fontSize: 11.5 }}>
                            {a.type}
                          </td>
                          <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.4)", fontSize: 11.5 }}>{a.partyType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.rejected.length ? (
                  <div style={{
                    marginTop: 14, background: "rgba(248,113,113,.07)",
                    border: "1px solid rgba(248,113,113,.25)", borderRadius: 11, padding: "12px 15px",
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#fca5a5", marginBottom: 6 }}>
                      {result.rejected.length} ROW{result.rejected.length === 1 ? "" : "S"} DROPPED BEFORE YOU SAW THEM
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgba(252,165,165,.85)", lineHeight: 1.7 }}>
                      {result.rejected.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                    <div style={{ fontSize: 11.5, color: "rgba(252,165,165,.6)", marginTop: 7, lineHeight: 1.6 }}>
                      These had a code or a type the importer would not classify. They would have
                      imported and then gone missing from every report, so they were removed. Build
                      again if the chart now looks short.
                    </div>
                  </div>
                ) : null}

                <ReviewNotice>
                  Read every row before this goes anywhere. Paste the CSV into the customer&apos;s
                  Accounts → Import screen, or hand it to them. The columns are exactly what the
                  importer expects: code, name, type, partyType.
                </ReviewNotice>
              </Section>

              <Section title="Do these in this order">
                <div style={{ display: "grid", gap: 12 }}>
                  {result.plan.checklist.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 13 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                        background: "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.4)",
                        color: "#a5b4fc", fontSize: 12, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>{s.step}</div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", marginTop: 3, lineHeight: 1.6 }}>
                          {s.why}
                        </div>
                        <div style={{ fontSize: 11.5, color: "rgba(129,140,248,.7)", marginTop: 3 }}>{s.where}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {result.plan.watchOutFor?.length ? (
                <Section title="What usually goes wrong for this kind of business">
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.85 }}>
                    {result.plan.watchOutFor.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </Section>
              ) : null}

              <Section
                title="Welcome message"
                right={<CopyButton text={result.plan.welcomeMessage} />}
              >
                <Prose text={result.plan.welcomeMessage} />
                <ReviewNotice />
              </Section>

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", lineHeight: 1.7 }}>
                Generated {fmtDate(result.generatedAt)}. Account codes follow the ranges used
                elsewhere in the product (1xxx assets through 5xxx expenses) and types are checked
                against what the balance sheet can classify before they reach this page.
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
