"use client";

/**
 * Error Triage — what is failing, how often, and what to do about it.
 *
 * The Sentry status banner is deliberately loud when Sentry cannot be read.
 * Half of this page is dark without those three environment variables, and a
 * page that quietly shows only email bounces would read as "nothing much is
 * wrong" — which is a worse outcome than an empty page.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Section, aiKitCss, card, fmtDate, getJson, pageStyle, postJson, type Tone,
} from "@/app/admin/components/AiKit";

type Source = "sentry" | "email" | "billing" | "security" | "system";

type Problem = {
  key: string;
  source: Source;
  title: string;
  detail: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  affected: number;
};

type Payload = {
  aiConfigured: boolean;
  days: number;
  sentry: { configured: boolean; reachable: boolean; note: string };
  problems: Problem[];
  summary: {
    distinct: number; occurrences: number; customersAffected: number;
    bySource: Record<string, number>;
  };
};

type Verdict = {
  key: string;
  severity: "critical" | "high" | "medium" | "low" | "noise";
  plainEnglish: string;
  likelyCause: string;
  suggestedFix: string;
  customerImpact: string;
};

const SEVERITY_TONE: Record<Verdict["severity"], Tone> = {
  critical: "red", high: "red", medium: "amber", low: "blue", noise: "grey",
};

const SOURCE_TONE: Record<Source, Tone> = {
  sentry: "violet", email: "amber", billing: "red", security: "red", system: "blue",
};

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, noise: 4 } as const;

export default function ErrorTriagePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [triaging, setTriaging] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback((d: number) => {
    setLoading(true);
    getJson<Payload>(`/api/admin/error-triage?days=${d}`)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const triage = useCallback(async () => {
    setTriaging(true);
    setError(null);
    try {
      const res = await postJson<{ verdicts: Verdict[]; note?: string }>("/api/admin/error-triage", { days });
      const map: Record<string, Verdict> = {};
      for (const v of res.verdicts) map[v.key] = v;
      setVerdicts(map);
      if (!res.verdicts.length && res.note) setError(res.note);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTriaging(false);
    }
  }, [days]);

  const rows = [...(data?.problems || [])].sort((a, b) => {
    const va = verdicts[a.key], vb = verdicts[b.key];
    if (va && vb && va.severity !== vb.severity) return SEVERITY_RANK[va.severity] - SEVERITY_RANK[vb.severity];
    if (va && !vb) return -1;
    if (!va && vb) return 1;
    return b.count - a.count;
  });

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Error Triage"
        subtitle="Exceptions from Sentry alongside the failures Sentry never sees — bounced emails, declined payments, security incidents. Grouped by normalised message in code, so the counts are counts and not a model's opinion."
        right={
          <>
            <Button tone="ghost" onClick={() => load(days)} busy={loading}>Refresh</Button>
            {data?.aiConfigured ? (
              <Button onClick={triage} busy={triaging} disabled={!data.problems.length}>
                Explain these
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {[1, 7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: days === d ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
            border: days === d ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
            color: days === d ? "#818cf8" : "rgba(255,255,255,.4)",
          }}>
            {d === 1 ? "24 hours" : `${d} days`}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Loading label="Reading failure logs…" />
      ) : !data ? (
        <Empty>Could not read the failure log.</Empty>
      ) : (
        <>
          {!data.sentry.reachable ? (
            <div style={{
              background: data.sentry.configured ? "rgba(248,113,113,.07)" : "rgba(251,191,36,.06)",
              border: `1px solid ${data.sentry.configured ? "rgba(248,113,113,.3)" : "rgba(251,191,36,.28)"}`,
              borderRadius: 14, padding: "14px 18px", marginBottom: 18,
              fontSize: 12.5, lineHeight: 1.7,
              color: data.sentry.configured ? "#fca5a5" : "#fcd34d",
            }}>
              <strong style={{ display: "block", marginBottom: 4, fontSize: 13 }}>
                Exceptions are not being shown
              </strong>
              {data.sentry.note}
              {!data.sentry.configured ? (
                <div style={{ marginTop: 8, color: "rgba(252,211,77,.75)" }}>
                  Create a token in Sentry under Settings → Auth Tokens with <code>project:read</code>,
                  then set <code>SENTRY_AUTH_TOKEN</code>, <code>SENTRY_ORG</code> and
                  {" "}<code>SENTRY_PROJECT</code>. Everything below this banner works without it.
                </div>
              ) : null}
            </div>
          ) : null}

          <KpiRow items={[
            { label: "Distinct problems", value: data.summary.distinct, color: data.summary.distinct ? "#f87171" : "#34d399", sub: `In the last ${data.days} day${data.days === 1 ? "" : "s"}` },
            { label: "Occurrences", value: data.summary.occurrences, color: "#fbbf24", sub: "Total events" },
            { label: "Subjects affected", value: data.summary.customersAffected, color: "#c4b5fd", sub: "Customers, addresses, incidents" },
            { label: "Sources", value: Object.entries(data.summary.bySource).map(([k, v]) => `${k} ${v}`).join(" · ") || "—", color: "#93c5fd", sub: "Where they came from" },
          ]} />

          {rows.length === 0 ? (
            <Section>
              <Empty>
                Nothing failed in this window — no bounced email, no declined payment, no security
                incident{data.sentry.reachable ? ", no unresolved Sentry issue" : ""}. Widen the
                window if that seems too good.
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map((p) => {
                const v = verdicts[p.key];
                const isOpen = open === p.key;
                return (
                  <div key={p.key} style={card}>
                    <div onClick={() => setOpen(isOpen ? null : p.key)} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        <Pill tone={SOURCE_TONE[p.source]}>{p.source}</Pill>
                        {v ? <Pill tone={SEVERITY_TONE[v.severity]}>{v.severity}</Pill> : null}
                        <Pill tone="grey">{p.count}×</Pill>
                        {p.affected > 0 ? <Pill tone="grey">{p.affected} affected</Pill> : null}
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                          last {fmtDate(p.lastSeen)}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13.5, fontWeight: 700, color: "#f8fafc", lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}>
                        {p.title}
                      </div>
                      {v ? (
                        <div style={{
                          marginTop: 10, fontSize: 12.5, color: "rgba(255,255,255,.7)",
                          borderLeft: "2px solid rgba(139,92,246,.5)", paddingLeft: 11, lineHeight: 1.65,
                        }}>
                          {v.plainEnglish}
                        </div>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                        {v ? (
                          <div style={{ display: "grid", gap: 10 }}>
                            {[
                              { k: "Likely cause", t: v.likelyCause, c: "#93c5fd" },
                              { k: "What a customer sees", t: v.customerImpact, c: "#fcd34d" },
                              { k: "Next step", t: v.suggestedFix, c: "#6ee7b7" },
                            ].map((x) => (
                              <div key={x.k}>
                                <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)", marginBottom: 4 }}>
                                  {x.k.toUpperCase()}
                                </div>
                                <div style={{ fontSize: 12.5, color: x.c, lineHeight: 1.65 }}>{x.t}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)" }}>RAW</span>
                            <CopyButton text={`${p.title}\n\n${p.detail}`} />
                          </div>
                          <pre style={{
                            margin: 0, padding: "12px 14px", borderRadius: 11,
                            background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.06)",
                            fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.6,
                            whiteSpace: "pre-wrap", wordBreak: "break-word",
                            maxHeight: 260, overflowY: "auto",
                            fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                          }}>
                            {p.detail}
                          </pre>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 7 }}>
                            First seen {fmtDate(p.firstSeen)} · last seen {fmtDate(p.lastSeen)} · {p.count} occurrence{p.count === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
            Problems are grouped by message with ids, timestamps and long strings normalised out, so
            the same failure with a different invoice id counts once. &ldquo;Subjects affected&rdquo;
            means distinct recipients for email, distinct companies for billing, and distinct
            incidents for security — it is not one number about customers.
          </div>
        </>
      )}
    </div>
  );
}
