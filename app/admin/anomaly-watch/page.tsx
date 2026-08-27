"use client";

/**
 * Data Anomaly Watch — errors in customer books, grouped by customer.
 *
 * Grouped by customer rather than by check because the action is per customer:
 * one message saying "three things in your books need a look" beats three
 * messages. The check breakdown is available above, for deciding which rule is
 * firing too often and needs tightening.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, Section, aiKitCss, card, fmtDate, getJson, pageStyle,
  postJson, type Tone,
} from "@/app/admin/components/AiKit";

type Anomaly = {
  check: string;
  severity: "high" | "medium" | "low";
  companyId: string;
  companyName: string;
  reference: string;
  detail: string;
  date: string | null;
};

type Payload = {
  aiConfigured: boolean;
  generatedAt?: string;
  anomalies: Anomaly[];
  checks: Record<string, { label: string; why: string }>;
  summary: {
    total: number; high: number; companiesAffected: number; companiesScanned: number;
    byCheck?: Record<string, number>;
  };
};

const SEVERITY_TONE: Record<Anomaly["severity"], Tone> = {
  high: "red", medium: "amber", low: "grey",
};

export default function AnomalyWatchPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [checkFilter, setCheckFilter] = useState<string>("all");

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/anomaly-watch")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const draftNotice = useCallback(async (companyId: string) => {
    setBusy(companyId);
    setError(null);
    try {
      const res = await postJson<{ notice: string | null; note?: string }>("/api/admin/anomaly-watch", { companyId });
      if (res.notice) setNotices((p) => ({ ...p, [companyId]: res.notice as string }));
      else if (res.note) setError(res.note);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const filtered = (data?.anomalies || []).filter((a) => checkFilter === "all" || a.check === checkFilter);

  // Grouped by company, ordered by how bad the worst finding is.
  const byCompany = new Map<string, { name: string; items: Anomaly[] }>();
  for (const a of filtered) {
    const entry = byCompany.get(a.companyId) || { name: a.companyName, items: [] };
    entry.items.push(a);
    byCompany.set(a.companyId, entry);
  }
  const groups = [...byCompany.entries()].sort((a, b) => {
    const highs = (g: Anomaly[]) => g.filter((x) => x.severity === "high").length;
    return highs(b[1].items) - highs(a[1].items) || b[1].items.length - a[1].items.length;
  });

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Data Anomaly Watch"
        subtitle="Vouchers that do not balance, duplicate invoice numbers, totals that disagree with their lines, negative stock, impossible tax rates. Every check is arithmetic, not a model — the model only writes the message telling the customer."
        right={<Button tone="ghost" onClick={load} busy={loading}>Run the scan</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Checking every set of books…" />
      ) : !data ? (
        <Empty>The scan could not be completed.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Needs attention", value: data.summary.high, color: data.summary.high ? "#f87171" : "#34d399", sub: "Affects the numbers" },
            { label: "Findings", value: data.summary.total, color: "#fbbf24", sub: "All severities" },
            { label: "Customers affected", value: `${data.summary.companiesAffected} / ${data.summary.companiesScanned}`, color: "#c4b5fd", sub: "Of those scanned" },
          ]} />

          {data.summary.byCheck && Object.keys(data.summary.byCheck).length ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
              <button onClick={() => setCheckFilter("all")} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: checkFilter === "all" ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                border: checkFilter === "all" ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
                color: checkFilter === "all" ? "#818cf8" : "rgba(255,255,255,.4)",
              }}>
                All ({data.summary.total})
              </button>
              {Object.entries(data.summary.byCheck).map(([k, v]) => (
                <button key={k} onClick={() => setCheckFilter(k)} title={data.checks[k]?.why} style={{
                  padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: checkFilter === k ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                  border: checkFilter === k ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
                  color: checkFilter === k ? "#818cf8" : "rgba(255,255,255,.4)",
                }}>
                  {data.checks[k]?.label || k} ({v})
                </button>
              ))}
            </div>
          ) : null}

          {groups.length === 0 ? (
            <Section>
              <Empty>
                {data.summary.companiesScanned === 0
                  ? "No customer companies to scan."
                  : `Every check passed across ${data.summary.companiesScanned} set${data.summary.companiesScanned === 1 ? "" : "s"} of books. Vouchers balance, invoice numbers are unique, no stock has gone negative.`}
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {groups.map(([companyId, g]) => {
                const notice = notices[companyId];
                const highs = g.items.filter((x) => x.severity === "high").length;
                return (
                  <div key={companyId} style={card}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", gap: 12,
                      alignItems: "center", flexWrap: "wrap", marginBottom: 14,
                    }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{g.name}</span>
                        {highs ? <Pill tone="red">{highs} affecting the numbers</Pill> : null}
                        <Pill tone="grey">{g.items.length} finding{g.items.length === 1 ? "" : "s"}</Pill>
                      </div>
                      {data.aiConfigured ? (
                        <Button onClick={() => draftNotice(companyId)} busy={busy === companyId}>
                          {notice ? "Redraft the message" : "Draft the message"}
                        </Button>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 7, marginBottom: notice ? 16 : 0 }}>
                      {g.items.slice(0, 40).map((a, i) => (
                        <div key={`${a.check}-${a.reference}-${i}`} style={{
                          display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 11,
                          alignItems: "center", padding: "9px 12px", borderRadius: 10,
                          background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)",
                        }}>
                          <Pill tone={SEVERITY_TONE[a.severity]}>{a.severity}</Pill>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: "#e2e8f0" }}>
                              <strong style={{ fontWeight: 700 }}>{data.checks[a.check]?.label || a.check}</strong>
                              <span style={{ color: "rgba(255,255,255,.3)" }}> · </span>
                              <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11.5, color: "rgba(255,255,255,.6)" }}>
                                {a.reference}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.42)", marginTop: 2 }}>
                              {a.detail}
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", whiteSpace: "nowrap" }}>
                            {a.date ? fmtDate(a.date) : ""}
                          </div>
                        </div>
                      ))}
                      {g.items.length > 40 ? (
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", paddingLeft: 4 }}>
                          …and {g.items.length - 40} more.
                        </div>
                      ) : null}
                    </div>

                    {notice ? (
                      <div style={{
                        background: "rgba(56,189,248,.05)", border: "1px solid rgba(56,189,248,.2)",
                        borderRadius: 14, padding: "16px 18px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#93c5fd" }}>MESSAGE TO THE CUSTOMER</span>
                          <CopyButton text={notice} />
                        </div>
                        <Prose text={notice} />
                        <ReviewNotice>
                          Check the document numbers against their books before you send this. Being
                          right is the entire value of the message; being nearly right costs more
                          trust than saying nothing.
                        </ReviewNotice>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <Section title="What each check means" style={{ marginTop: 18 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {Object.entries(data.checks).map(([k, c]) => (
                <div key={k} style={{ fontSize: 12.5, lineHeight: 1.65 }}>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{c.label}</span>
                  <span style={{ color: "rgba(255,255,255,.45)" }}> — {c.why}</span>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
            Scanned {fmtDate(data.generatedAt)}. Only document numbers, dates and the size of a
            discrepancy leave the database — no line items, party names or balances are shown here
            or sent to a model. Invoice-total checks allow a wide tolerance because per-line tax is
            not reconstructed, so they under-report rather than cry wolf.
          </div>
        </>
      )}
    </div>
  );
}
