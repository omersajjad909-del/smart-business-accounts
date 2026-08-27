"use client";

/**
 * Revenue Analyst — ask the numbers a question in plain language.
 *
 * The fact sheet is shown on the page next to the conversation, not hidden
 * behind the chat. Anyone reading an answer should be able to glance left and
 * check it against the table it came from — that is the difference between a
 * tool you can act on and a tool you have to trust.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Prose,
  Section, aiKitCss, card, fmtDate, getJson, inputStyle, pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type MonthRow = {
  month: string; invoices: number; gross: number; refunds: number;
  net: number; newCompanies: number; cancellations: number;
};

type Facts = {
  generatedAt: string;
  currency: string;
  mrr: number;
  activeSubscriptions: number;
  payingCompanies: number;
  totalCompanies: number;
  planMix: Record<string, number>;
  providerMix: Record<string, number>;
  countryMix: Record<string, number>;
  months: MonthRow[];
  lifetimeRevenue: number;
  refundedLifetime: number;
  pastDue: number;
  cancelledLast90: Array<{ name: string; plan: string; when: string; monthsHeld: number }>;
  topCustomers: Array<{ name: string; plan: string; lifetime: number; country: string | null }>;
  caveats: string[];
};

type Payload = { aiConfigured: boolean; facts: Facts; suggestions: string[] };
type Turn = { q: string; a: string };

export default function RevenueAnalystPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [months, setMonths] = useState(12);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback((m: number) => {
    setLoading(true);
    getJson<Payload>(`/api/admin/revenue-analyst?months=${m}`)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(months); }, [load, months]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  const ask = useCallback(async (q: string) => {
    const text = q.trim();
    if (!text || asking) return;
    setAsking(true);
    setError(null);
    setQuestion("");
    try {
      const res = await postJson<{ answer: string }>("/api/admin/revenue-analyst", {
        question: text, months, history: turns.slice(-2),
      });
      setTurns((prev) => [...prev, { q: text, a: res.answer }]);
    } catch (e) {
      setError((e as Error).message);
      setQuestion(text);
    } finally {
      setAsking(false);
    }
  }, [asking, months, turns]);

  const f = data?.facts;

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Revenue Analyst"
        subtitle="Ask about the numbers in plain language. The model reads a fact sheet computed in readable code — it writes no queries and never touches a customer ledger, so a question the sheet does not cover gets an honest no rather than a guess."
        right={
          <>
            {[6, 12, 24].map((m) => (
              <button key={m} onClick={() => setMonths(m)} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: months === m ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                border: months === m ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
                color: months === m ? "#818cf8" : "rgba(255,255,255,.4)",
              }}>
                {m}m
              </button>
            ))}
          </>
        }
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Computing the fact sheet…" />
      ) : !f ? (
        <Empty>Could not assemble the fact sheet.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "MRR", value: `${f.currency} ${f.mrr.toLocaleString()}`, color: "#34d399", sub: `${f.activeSubscriptions} active subscription${f.activeSubscriptions === 1 ? "" : "s"}` },
            { label: "Lifetime billed", value: `${f.currency} ${f.lifetimeRevenue.toLocaleString()}`, color: "#818cf8", sub: f.refundedLifetime ? `${f.refundedLifetime.toLocaleString()} refunded` : "Nothing refunded" },
            { label: "Paying companies", value: `${f.payingCompanies} / ${f.totalCompanies}`, color: "#c4b5fd", sub: "Have ever paid / total" },
            { label: "Past due", value: f.pastDue, color: f.pastDue ? "#f87171" : "#34d399", sub: "Subscriptions behind" },
          ]} />

          {f.caveats.length ? (
            <div style={{
              background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.25)",
              borderRadius: 14, padding: "14px 18px", marginBottom: 18,
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#fcd34d", marginBottom: 8 }}>
                READ THESE BEFORE YOU TRUST THE NUMBERS
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "rgba(252,211,77,.85)", lineHeight: 1.75 }}>
                {f.caveats.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="ai-split">
            {/* ── conversation ── */}
            <div style={{ ...card, display: "flex", flexDirection: "column", minHeight: 460 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, color: "#f8fafc" }}>
                Ask
              </div>

              <div style={{ flex: 1, overflowY: "auto", maxHeight: 560, paddingRight: 4 }}>
                {turns.length === 0 ? (
                  <div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginBottom: 14, lineHeight: 1.7 }}>
                      Nothing asked yet. These are the questions the fact sheet can actually answer:
                    </div>
                    <div style={{ display: "grid", gap: 7 }}>
                      {(data?.suggestions || []).map((s) => (
                        <button key={s} onClick={() => ask(s)} disabled={!data?.aiConfigured || asking} style={{
                          textAlign: "left", padding: "11px 14px", borderRadius: 11,
                          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                          color: "rgba(255,255,255,.65)", fontSize: 12.5, cursor: data?.aiConfigured ? "pointer" : "not-allowed",
                          lineHeight: 1.5,
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 18 }}>
                    {turns.map((t, i) => (
                      <div key={i}>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: "#c7d2fe", marginBottom: 9,
                          borderLeft: "2px solid #6366f1", paddingLeft: 11, lineHeight: 1.55,
                        }}>
                          {t.q}
                        </div>
                        <Prose text={t.a} />
                        <div style={{ marginTop: 6 }}>
                          <CopyButton text={t.a} label="Copy answer" />
                        </div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                )}
                {asking ? <Loading label="Reading the fact sheet…" /> : null}
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
                  placeholder={data?.aiConfigured ? "Why did MRR move this month?" : "Set GROQ_API_KEY or OPENAI_API_KEY to ask"}
                  disabled={!data?.aiConfigured || asking}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <Button onClick={() => ask(question)} busy={asking} disabled={!data?.aiConfigured || !question.trim()}>
                  Ask
                </Button>
              </div>
              {turns.length > 0 ? (
                <button onClick={() => setTurns([])} style={{
                  marginTop: 10, background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,.3)", fontSize: 11.5, textAlign: "left", padding: 0,
                }}>
                  Clear conversation
                </button>
              ) : null}
            </div>

            {/* ── the fact sheet itself ── */}
            <div style={{ display: "grid", gap: 14 }}>
              <Section title={`Month by month (${f.currency})`}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                    <thead>
                      <tr style={{ color: "rgba(255,255,255,.35)", textAlign: "right" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Month</th>
                        <th style={{ padding: "6px 8px", fontWeight: 700 }}>Net</th>
                        <th style={{ padding: "6px 8px", fontWeight: 700 }}>Inv</th>
                        <th style={{ padding: "6px 8px", fontWeight: 700 }}>New</th>
                        <th style={{ padding: "6px 8px", fontWeight: 700 }}>Lost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {f.months.map((m) => (
                        <tr key={m.month} style={{ borderTop: "1px solid rgba(255,255,255,.05)", textAlign: "right" }}>
                          <td style={{ textAlign: "left", padding: "7px 8px", color: "rgba(255,255,255,.55)" }}>{m.month}</td>
                          <td style={{ padding: "7px 8px", color: m.net > 0 ? "#6ee7b7" : "rgba(255,255,255,.25)", fontWeight: 700 }}>
                            {m.net.toLocaleString()}
                          </td>
                          <td style={{ padding: "7px 8px", color: "rgba(255,255,255,.5)" }}>{m.invoices}</td>
                          <td style={{ padding: "7px 8px", color: m.newCompanies ? "#93c5fd" : "rgba(255,255,255,.2)" }}>{m.newCompanies}</td>
                          <td style={{ padding: "7px 8px", color: m.cancellations ? "#fca5a5" : "rgba(255,255,255,.2)" }}>{m.cancellations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              {f.topCustomers.length ? (
                <Section title="Largest customers">
                  <div style={{ display: "grid", gap: 8 }}>
                    {f.topCustomers.map((c) => (
                      <div key={c.name} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12.5 }}>
                        <span style={{ color: "rgba(255,255,255,.7)" }}>
                          {c.name}
                          <span style={{ color: "rgba(255,255,255,.28)", marginLeft: 7 }}>{c.plan} · {c.country || "?"}</span>
                        </span>
                        <span style={{ color: "#6ee7b7", fontWeight: 700 }}>{c.lifetime.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Mix">
                {([
                  ["Plans", f.planMix],
                  ["Providers", f.providerMix],
                  ["Countries", f.countryMix],
                ] as const).map(([label, mix]) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)", marginBottom: 6 }}>
                      {label.toUpperCase()}
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {Object.entries(mix).length === 0 ? (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)" }}>None</span>
                      ) : Object.entries(mix).map(([k, v]) => (
                        <span key={k} style={{
                          fontSize: 11.5, padding: "5px 10px", borderRadius: 8,
                          background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                          color: "rgba(255,255,255,.6)",
                        }}>
                          {k} <strong style={{ color: "#e2e8f0" }}>{v}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Section>

              {f.cancelledLast90.length ? (
                <Section title="Cancelled in the last 90 days">
                  <div style={{ display: "grid", gap: 8 }}>
                    {f.cancelledLast90.map((c) => (
                      <div key={`${c.name}-${c.when}`} style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)" }}>
                        <strong style={{ color: "#fca5a5" }}>{c.name}</strong> · {c.plan} · left {c.when} after
                        about {c.monthsHeld} month{c.monthsHeld === 1 ? "" : "s"}
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
            Fact sheet computed {fmtDate(f.generatedAt)} from platform invoices, subscriptions and
            company records. Rebuilt on every question, so an answer is never stale — but it can
            only ever be as good as the table beside it.
          </div>
        </>
      )}
    </div>
  );
}
