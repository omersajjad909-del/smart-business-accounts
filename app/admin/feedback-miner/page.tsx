"use client";

/**
 * Feedback Miner — what customers keep asking for, grouped and ranked.
 *
 * Themes are shown with their evidence expanded by default rather than hidden
 * behind a chevron. A theme without its quotes is an opinion; the quotes are the
 * reason to believe it, so they get the same weight on the page.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill, ScoreBar,
  Section, aiKitCss, card, fmtDate, getJson, pageStyle, postJson, type Tone,
} from "@/app/admin/components/AiKit";

type Corpus = {
  aiConfigured: boolean;
  days: number;
  corpusSize: number;
  byKind: Record<string, number>;
  averageRating: number | null;
  ratingCount: number;
};

type Theme = {
  theme: string;
  kind: "feature-request" | "bug" | "confusion" | "praise" | "pricing" | "other";
  mentions: number;
  impact: number;
  effortGuess: "small" | "medium" | "large" | "unknown";
  whatTheyWant: string;
  recommendation: string;
  evidence: Array<{ id: string; quote: string }>;
};

type Result = {
  themes: Theme[];
  corpusSize: number;
  analysedCount?: number;
  days?: number;
  generatedAt?: string;
  note?: string;
};

const KIND_TONE: Record<Theme["kind"], Tone> = {
  "feature-request": "violet",
  bug: "red",
  confusion: "amber",
  praise: "green",
  pricing: "blue",
  other: "grey",
};

const EFFORT_LABEL: Record<Theme["effortGuess"], string> = {
  small: "Small build", medium: "Medium build", large: "Large build", unknown: "Size unclear",
};

const WINDOWS = [30, 90, 180, 365];

export default function FeedbackMinerPage() {
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((d: number) => {
    setLoading(true);
    getJson<Corpus>(`/api/admin/feedback-miner?days=${d}`)
      .then(setCorpus)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const mine = useCallback(async () => {
    setMining(true);
    setError(null);
    setResult(null);
    try {
      setResult(await postJson<Result>("/api/admin/feedback-miner", { days }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMining(false);
    }
  }, [days]);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Feedback Miner"
        subtitle="Reviews, complaints, bug reports, support tickets, chat transcripts and enquiry messages, read together and grouped into the things customers actually keep asking for. Every theme carries the quotes it was built from."
        right={
          corpus?.aiConfigured ? (
            <Button onClick={mine} busy={mining} disabled={!corpus.corpusSize}>
              {result ? "Run again" : "Find the themes"}
            </Button>
          ) : null
        }
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {WINDOWS.map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: days === d ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
            border: days === d ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
            color: days === d ? "#818cf8" : "rgba(255,255,255,.4)",
          }}>
            {d < 365 ? `${d} days` : "1 year"}
          </button>
        ))}
      </div>

      {loading && !corpus ? (
        <Loading label="Counting what customers have said…" />
      ) : !corpus ? (
        <Empty>Could not read the feedback corpus.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Messages", value: corpus.corpusSize, color: "#818cf8", sub: `Last ${corpus.days} days` },
            { label: "Average rating", value: corpus.averageRating ?? "—", color: "#fbbf24", sub: corpus.ratingCount ? `${corpus.ratingCount} rated` : "Nobody has rated yet" },
            { label: "Sources", value: Object.keys(corpus.byKind).length, color: "#c4b5fd", sub: Object.entries(corpus.byKind).map(([k, v]) => `${k} ${v}`).join(" · ") || "None" },
          ]} />

          {corpus.corpusSize === 0 ? (
            <Section>
              <Empty>
                No customer messages in this window. Widen it, or wait — this page has nothing to
                mine until people start writing in.
              </Empty>
            </Section>
          ) : null}

          {mining ? <Loading label={`Reading ${corpus.corpusSize} messages…`} /> : null}

          {result?.note ? (
            <Section>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>{result.note}</div>
            </Section>
          ) : null}

          {result && result.themes.length > 0 ? (
            <>
              <div style={{ display: "grid", gap: 14 }}>
                {result.themes.map((t, i) => (
                  <div key={`${t.theme}-${i}`} style={card}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", gap: 14,
                      alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.25)",
                            width: 22, display: "inline-block",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Pill tone={KIND_TONE[t.kind] ?? "grey"}>{t.kind}</Pill>
                          <Pill tone="grey">{t.mentions} mention{t.mentions === 1 ? "" : "s"}</Pill>
                          <Pill tone="grey">{EFFORT_LABEL[t.effortGuess] ?? "Size unclear"}</Pill>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", marginBottom: 5 }}>
                          {t.theme}
                        </div>
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", lineHeight: 1.65 }}>
                          {t.whatTheyWant}
                        </div>
                      </div>
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", fontWeight: 700, marginBottom: 5 }}>
                          IMPACT
                        </div>
                        <ScoreBar value={t.impact} tone={t.impact >= 60 ? "violet" : "blue"} />
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)",
                      borderRadius: 11, padding: "11px 14px", marginBottom: 14,
                      fontSize: 12.5, color: "#c7d2fe", lineHeight: 1.6,
                    }}>
                      <strong style={{ fontWeight: 800 }}>Recommendation:</strong> {t.recommendation}
                    </div>

                    {t.evidence.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.32)", marginBottom: 8 }}>
                          WHAT THEY ACTUALLY WROTE
                        </div>
                        <div style={{ display: "grid", gap: 7 }}>
                          {t.evidence.map((e) => (
                            <div key={e.id} style={{
                              fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.6,
                              borderLeft: "2px solid rgba(255,255,255,.15)", paddingLeft: 11,
                            }}>
                              &ldquo;{e.quote}&rdquo;
                              <span style={{ color: "rgba(255,255,255,.22)", marginLeft: 7, fontSize: 10.5 }}>
                                {e.id.slice(0, 8)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "rgba(251,191,36,.7)" }}>
                        No verifiable quotes survived the id check for this theme — treat it with
                        suspicion.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
                Read {result.analysedCount} of {result.corpusSize} messages, {result.days} day window,
                {" "}{fmtDate(result.generatedAt)}. Quotes whose source id was not in the batch are
                stripped before this page renders, so anything shown above can be traced back to a
                real row.
              </div>
            </>
          ) : null}

          {result && result.themes.length === 0 && !result.note ? (
            <Section>
              <Empty>
                No theme was supported by two or more separate messages. That is a finding, not a
                failure — there is no pattern in this window yet.
              </Empty>
            </Section>
          ) : null}

          {!result && !mining && corpus.corpusSize > 0 && corpus.aiConfigured ? (
            <Section>
              <Empty>
                {corpus.corpusSize} message{corpus.corpusSize === 1 ? "" : "s"} ready to read.
                Nothing is analysed until you ask for it.
              </Empty>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
