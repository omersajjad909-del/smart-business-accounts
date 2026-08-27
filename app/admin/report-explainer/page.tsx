"use client";

/**
 * Report Explainer — a customer's numbers, said plainly.
 *
 * The raw figures sit next to the explanation rather than behind a toggle. An
 * explanation nobody can check is an assertion, and this one is going to be read
 * out to a customer on a phone call.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, Loading, PageHeader, Prose, Section,
  aiKitCss, fmtDate, getJson, inputStyle, pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Company = {
  id: string; name: string; businessType: string;
  country: string | null; baseCurrency: string; plan: string;
};

type Config = {
  aiConfigured: boolean;
  companies: Company[];
  reports: Array<{ id: string; name: string; blurb: string }>;
  languages: Array<{ id: string; name: string }>;
};

type Result = {
  companyId: string; report: string; language: string;
  explanation: string; facts: string; generatedAt: string;
};

export default function ReportExplainerPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [companyId, setCompanyId] = useState("");
  const [report, setReport] = useState("overview");
  const [language, setLanguage] = useState("en");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Config>("/api/admin/report-explainer")
      .then((c) => {
        setConfig(c);
        if (c.companies.length === 1) setCompanyId(c.companies[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const explain = useCallback(async () => {
    if (!companyId) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postJson<Result>("/api/admin/report-explainer", { companyId, report, language }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [companyId, report, language]);

  const companies = (config?.companies || []).filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()));

  const chosen = config?.companies.find((c) => c.id === companyId) || null;
  const activeReport = config?.reports.find((r) => r.id === report) || null;

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Report Explainer"
        subtitle="Any customer's financial position, explained the way you would say it on the phone. The figures come from the same computation the in-product assistant uses, so this page and the customer's own dashboard cannot disagree."
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <Section title="Pick a customer and a report">
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              CUSTOMER
            </div>
            {(config?.companies.length ?? 0) > 8 ? (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers"
                style={{ ...inputStyle, marginBottom: 9 }}
              />
            ) : null}
            {companies.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)" }}>
                {config ? "No customer companies to explain." : "Loading…"}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {companies.map((c) => {
                  const on = companyId === c.id;
                  return (
                    <button key={c.id} onClick={() => { setCompanyId(c.id); setResult(null); }} style={{
                      padding: "9px 14px", borderRadius: 11, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      textAlign: "left",
                      background: on ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.03)",
                      border: on ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.08)",
                      color: on ? "#c7d2fe" : "rgba(255,255,255,.6)",
                    }}>
                      {c.name}
                      <span style={{ display: "block", fontSize: 10.5, color: "rgba(255,255,255,.3)", fontWeight: 500, marginTop: 2 }}>
                        {c.businessType} · {c.baseCurrency}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              REPORT
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(config?.reports || []).map((r) => {
                const on = report === r.id;
                return (
                  <button key={r.id} onClick={() => { setReport(r.id); setResult(null); }} title={r.blurb} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    background: on ? "rgba(139,92,246,.2)" : "rgba(255,255,255,.03)",
                    border: on ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,.08)",
                    color: on ? "#c4b5fd" : "rgba(255,255,255,.5)",
                  }}>
                    {r.name}
                  </button>
                );
              })}
            </div>
            {activeReport ? (
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", marginTop: 8 }}>
                {activeReport.blurb}
              </div>
            ) : null}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              LANGUAGE
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(config?.languages || []).map((l) => {
                const on = language === l.id;
                return (
                  <button key={l.id} onClick={() => { setLanguage(l.id); setResult(null); }} style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    background: on ? "rgba(52,211,153,.16)" : "rgba(255,255,255,.03)",
                    border: on ? "1px solid #34d399" : "1px solid rgba(255,255,255,.08)",
                    color: on ? "#6ee7b7" : "rgba(255,255,255,.5)",
                  }}>
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {config?.aiConfigured ? (
              <Button onClick={explain} busy={busy} disabled={!companyId}>
                {result ? "Explain again" : "Explain it"}
              </Button>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                Set GROQ_API_KEY or OPENAI_API_KEY to explain reports.
              </div>
            )}
          </div>
        </div>
      </Section>

      {busy ? <Loading label="Reading the numbers…" /> : null}

      {result ? (
        <div className="ai-split">
          <Section
            title={`${chosen?.name || "Customer"} — ${activeReport?.name || result.report}`}
            right={<CopyButton text={result.explanation} />}
          >
            <div style={{ direction: result.language === "ur" ? "rtl" : "ltr" }}>
              <Prose text={result.explanation} size={14} />
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
              Generated {fmtDate(result.generatedAt)}. Every figure quoted comes from the panel
              beside this one — nothing was computed by the model. Check the numbers before you read
              any of this out to the customer.
            </div>
          </Section>

          <Section title="The figures it read" right={<CopyButton text={result.facts} label="Copy figures" />}>
            <pre style={{
              margin: 0, fontSize: 11.5, color: "rgba(255,255,255,.6)", lineHeight: 1.75,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              maxHeight: 620, overflowY: "auto",
              fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
            }}>
              {result.facts}
            </pre>
          </Section>
        </div>
      ) : !busy && config ? (
        <Section>
          <Empty>
            Pick a customer and a report. Nothing is computed until you ask — this reads a
            customer&apos;s live financial position, so it does not run on page load.
          </Empty>
        </Section>
      ) : null}
    </div>
  );
}
