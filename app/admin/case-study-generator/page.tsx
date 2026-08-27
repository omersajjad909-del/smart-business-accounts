"use client";

/**
 * Case Study Generator — a customer story built from real numbers.
 *
 * The quote slots are given as much room on the page as the copy, and the
 * "before publishing" list sits at the top rather than the bottom. A case study
 * draft is not a deliverable; it is a draft plus a list of permissions that have
 * to be obtained, and putting that list last is how it gets skipped.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, Loading, PageHeader, Pill, Prose,
  ScoreBar, Section, adminApi, aiKitCss, card, fmtDate, getJson, inputStyle,
  pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Quote = { id: string; source: string; text: string; name: string | null; role: string | null; rating: number | null };

type Candidate = {
  companyId: string; name: string; businessType: string; country: string | null;
  plan: string; monthsActive: number; invoicesTotal: number; vouchersTotal: number;
  itemCount: number; accountCount: number; userCount: number; branchCount: number;
  employeeCount: number; consentedQuotes: Quote[]; strength: number;
};

type CaseStudy = {
  companyId: string;
  companyName: string;
  headline: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  metricsUsed: Array<{ label: string; value: string; source: string }>;
  quoteSlots: Array<{ placement: string; askThem: string }>;
  realQuotes: Array<{ id: string; source: string; text: string; name: string | null; role: string | null }>;
  beforePublishing: string[];
  flags: string[];
  createdAt: string;
};

type Saved = { id: string; key: string; title: string; createdAt: string; data: CaseStudy };
type Payload = { aiConfigured: boolean; candidates: Candidate[]; saved: Saved[] };

export default function CaseStudyGeneratorPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [useQuoteIds, setUseQuoteIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [study, setStudy] = useState<CaseStudy | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/case-study-generator")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const chosen = data?.candidates.find((c) => c.companyId === selected) || null;

  const generate = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setStudy(null);
    try {
      const res = await postJson<{ study: CaseStudy }>("/api/admin/case-study-generator", {
        companyId: selected, notes: notes.trim() || undefined, useQuoteIds,
      });
      setStudy(res.study);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [selected, notes, useQuoteIds]);

  const save = useCallback(async () => {
    if (!study) return;
    setSaving(true);
    try {
      await adminApi("/api/admin/case-study-generator", { method: "PUT", body: JSON.stringify({ study }) });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [study, load]);

  const remove = useCallback(async (id: string) => {
    await adminApi(`/api/admin/case-study-generator?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    load();
  }, [load]);

  const asMarkdown = study ? [
    `# ${study.headline}`, "", study.summary, "",
    ...study.sections.flatMap((s) => [`## ${s.heading}`, "", s.body, ""]),
    study.quoteSlots.length ? "## Quotes still needed" : "",
    ...study.quoteSlots.map((q) => `- ${q.placement} — ask: ${q.askThem}`),
  ].filter(Boolean).join("\n") : "";

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Case Study Generator"
        subtitle="A customer story assembled from what they actually did in the product. No quotation is ever generated — where a customer voice belongs, you get the question to ask them instead."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <div style={{
        ...card,
        background: "rgba(251,191,36,.05)", borderColor: "rgba(251,191,36,.25)",
        marginBottom: 18, fontSize: 12.5, color: "rgba(252,211,77,.85)", lineHeight: 1.75,
      }}>
        <strong style={{ display: "block", marginBottom: 5, fontSize: 13, color: "#fcd34d" }}>
          Nothing here is publishable as it stands
        </strong>
        A draft is a draft plus a list of permissions. The customer has to agree to be named, the
        quotes have to come from them, and the figures have to be confirmed with them before any of
        this reaches the site. Invented testimonials have already been removed from this marketing
        site once — that is why this page will not write one.
      </div>

      {loading && !data ? (
        <Loading label="Finding customers with a story…" />
      ) : !data ? (
        <Empty>Could not load candidates.</Empty>
      ) : (
        <>
          <Section title="Pick a customer">
            {data.candidates.length === 0 ? (
              <Empty>No customer companies yet.</Empty>
            ) : (
              <div style={{ display: "grid", gap: 9 }}>
                {data.candidates.map((c) => {
                  const on = selected === c.companyId;
                  return (
                    <button
                      key={c.companyId}
                      onClick={() => {
                        setSelected(c.companyId);
                        setUseQuoteIds(c.consentedQuotes.map((q) => q.id));
                        setStudy(null);
                      }}
                      style={{
                        textAlign: "left", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
                        background: on ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.03)",
                        border: on ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.07)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>{c.name}</span>
                            <Pill tone="grey">{c.businessType}</Pill>
                            {c.consentedQuotes.length ? (
                              <Pill tone="green">{c.consentedQuotes.length} consented quote{c.consentedQuotes.length === 1 ? "" : "s"}</Pill>
                            ) : (
                              <Pill tone="amber">No quote on file</Pill>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)" }}>
                            {c.monthsActive} month{c.monthsActive === 1 ? "" : "s"} · {c.invoicesTotal} invoices ·
                            {" "}{c.vouchersTotal} vouchers · {c.itemCount} items · {c.userCount} users ·
                            {" "}{c.country || "—"}
                          </div>
                        </div>
                        <div style={{ minWidth: 130 }}>
                          <ScoreBar value={c.strength} tone={c.strength >= 50 ? "green" : "blue"} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {chosen ? (
              <div style={{ marginTop: 18 }}>
                {chosen.consentedQuotes.length ? (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>
                      QUOTES THIS CUSTOMER HAS CONSENTED TO PUBLISH
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {chosen.consentedQuotes.map((q) => {
                        const on = useQuoteIds.includes(q.id);
                        return (
                          <label key={q.id} style={{
                            display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                            padding: "11px 14px", borderRadius: 11,
                            background: on ? "rgba(52,211,153,.06)" : "rgba(255,255,255,.03)",
                            border: on ? "1px solid rgba(52,211,153,.3)" : "1px solid rgba(255,255,255,.06)",
                          }}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => setUseQuoteIds((prev) =>
                                e.target.checked ? [...prev, q.id] : prev.filter((x) => x !== q.id))}
                              style={{ accentColor: "#34d399", marginTop: 3 }}
                            />
                            <div>
                              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.72)", lineHeight: 1.65 }}>
                                &ldquo;{q.text}&rdquo;
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 4 }}>
                                {[q.name, q.role, q.source, q.rating ? `${q.rating}★` : null].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    fontSize: 12.5, color: "rgba(251,191,36,.75)", lineHeight: 1.7, marginBottom: 16,
                    padding: "12px 15px", borderRadius: 11,
                    background: "rgba(251,191,36,.05)", border: "1px solid rgba(251,191,36,.2)",
                  }}>
                    This customer has no published testimonial and no review marked publishable, so
                    the draft will carry quote slots only. Getting one sentence from them is the
                    highest-value thing you could do for this case study.
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
                  WHAT YOU KNOW THAT THE DATA DOES NOT
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Were on Excel and a munshi's register. Moved over in three days because their accountant left. Two godowns that never reconciled."
                  style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }}
                />

                {data.aiConfigured ? (
                  <Button onClick={generate} busy={busy}>
                    {study ? "Draft again" : `Draft the case study for ${chosen.name}`}
                  </Button>
                ) : (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                    Set GROQ_API_KEY or OPENAI_API_KEY to draft case studies.
                  </div>
                )}
              </div>
            ) : null}
          </Section>

          {busy ? <Loading label="Writing the story…" /> : null}

          {study ? (
            <>
              {study.flags.length ? (
                <ErrorNote>
                  <strong>Do not publish this without fixing the following.</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {study.flags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </ErrorNote>
              ) : null}

              {study.beforePublishing.length ? (
                <Section title="Before this can be published">
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#fcd34d", lineHeight: 1.9 }}>
                    {study.beforePublishing.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </Section>
              ) : null}

              <Section
                title="Draft"
                right={
                  <div style={{ display: "flex", gap: 6 }}>
                    <CopyButton text={asMarkdown} label="Copy as markdown" />
                    <Button onClick={save} busy={saving} tone="good">Save draft</Button>
                  </div>
                }
              >
                <div style={{ fontSize: 20, fontWeight: 800, color: "#f8fafc", marginBottom: 10, lineHeight: 1.35 }}>
                  {study.headline}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.72)", lineHeight: 1.75, marginBottom: 22 }}>
                  {study.summary}
                </div>
                <div style={{ display: "grid", gap: 20 }}>
                  {study.sections.map((s, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>{s.heading}</div>
                      <Prose text={s.body} />
                    </div>
                  ))}
                </div>
              </Section>

              {study.quoteSlots.length ? (
                <Section title={`Quotes to get from the customer (${study.quoteSlots.length})`}>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7, marginBottom: 16 }}>
                    These are the points in the story where a customer sentence belongs. Send them
                    the questions; use their words exactly as they come back.
                  </div>
                  <div style={{ display: "grid", gap: 14 }}>
                    {study.quoteSlots.map((q, i) => (
                      <div key={i} style={{
                        borderLeft: "2px solid rgba(139,92,246,.5)", paddingLeft: 14,
                      }}>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", marginBottom: 5 }}>
                          {q.placement}
                        </div>
                        <div style={{ fontSize: 13.5, color: "#c4b5fd", lineHeight: 1.6 }}>
                          &ldquo;{q.askThem}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <CopyButton
                      text={study.quoteSlots.map((q) => q.askThem).join("\n\n")}
                      label="Copy the questions"
                    />
                  </div>
                </Section>
              ) : null}

              {study.realQuotes.length ? (
                <Section title={`Consented quotes used (${study.realQuotes.length})`}>
                  <div style={{ display: "grid", gap: 12 }}>
                    {study.realQuotes.map((q) => (
                      <div key={q.id} style={{
                        fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.7,
                        borderLeft: "2px solid rgba(52,211,153,.5)", paddingLeft: 14,
                      }}>
                        &ldquo;{q.text}&rdquo;
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 4 }}>
                          {[q.name, q.role, q.source].filter(Boolean).join(" · ")} — verbatim, not edited
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Every figure, and where it came from">
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <tbody>
                      {study.metricsUsed.map((m) => (
                        <tr key={m.label} style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                          <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.55)" }}>{m.label}</td>
                          <td style={{ padding: "8px 10px", color: "#e2e8f0", fontWeight: 700 }}>{m.value}</td>
                          <td style={{ padding: "8px 10px", color: "rgba(255,255,255,.3)", fontSize: 11.5 }}>{m.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 12, lineHeight: 1.7 }}>
                  No percentage improvement, time saved or cost reduction appears anywhere in this
                  draft, because none of it has been measured. If the customer tells you one, that is
                  a quote and it belongs to them.
                </div>
              </Section>
            </>
          ) : null}

          {data.saved.length ? (
            <Section title={`Saved drafts (${data.saved.length})`}>
              <div style={{ display: "grid", gap: 9 }}>
                {data.saved.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    gap: 12, padding: "11px 14px", borderRadius: 11,
                    background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 2 }}>
                        {s.data?.companyName} · {s.data?.quoteSlots?.length ?? 0} quote slot(s) ·
                        {" "}saved {fmtDate(s.createdAt)}
                        {s.data?.flags?.length ? " · flagged" : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button tone="ghost" onClick={() => { setStudy(s.data); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                        Open
                      </Button>
                      <Button tone="danger" onClick={() => remove(s.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
