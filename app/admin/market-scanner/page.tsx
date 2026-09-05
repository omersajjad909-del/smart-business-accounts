"use client";

/**
 * Market Scanner — Agent #1 of the AI Growth Department.
 *
 * Surfaces public Reddit posts matching the PVC/plastics costing-software
 * vocabulary from docs/growth/manual-lead-round.md. It never contacts anyone:
 * Reddit bans cold pitches, so every row here is something a human replies to
 * publicly first, then follows up by DM only if the poster engages. This page
 * is the review queue for that human step, not an outreach tool.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, Empty, ErrorNote, Loading, PageHeader, Pill, Section, aiKitCss,
  card, fmtDate, getJson, postJson, pageStyle, adminApi,
} from "@/app/admin/components/AiKit";

type Signal = {
  id: string;
  source: string;
  subreddit: string | null;
  externalId: string;
  url: string;
  title: string;
  snippet: string | null;
  author: string | null;
  matchedIndustry: string[] | null;
  matchedPain: string[] | null;
  matchedSoftware: string[] | null;
  tier: "A" | "B" | "C";
  status: "new" | "reviewed" | "replied" | "ignored";
  createdAt: string;
};

type Payload = { signals: Signal[]; counts: Array<{ tier: string; status: string; _count: number }> };

const TIER_TONE: Record<string, "amber" | "blue" | "grey"> = { A: "amber", B: "blue", C: "grey" };
const TIER_LABEL: Record<string, string> = {
  A: "Software pain + industry", B: "Costing pain + industry", C: "Software pain only",
};

export default function MarketScannerPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/market-scanner")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await postJson<{ scanned: number; found: number; stored: number }>(
        "/api/admin/market-scanner",
      );
      setScanResult(
        `Scanned ${result.scanned} posts across ${TARGET_SUBREDDIT_COUNT} subreddits — ${result.found} matched the vocabulary, ${result.stored} were new.`,
      );
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }, [load]);

  const setStatus = useCallback(async (id: string, status: Signal["status"]) => {
    setData((prev) => prev && { ...prev, signals: prev.signals.map((s) => (s.id === id ? { ...s, status } : s)) });
    try {
      const res = await adminApi("/api/admin/market-scanner", { method: "PATCH", body: JSON.stringify({ id, status }) });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any)?.error || `Request failed (${res.status})`);
      }
    } catch (e) {
      setError((e as Error).message);
      load();
    }
  }, [load]);

  const visible = (data?.signals || []).filter((s) => s.status !== "ignored");

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Market Scanner"
        subtitle="Reddit posts where a business, in its own words, describes the costing/inventory pain FinovaOS solves. Nothing here is sent automatically — reply publicly on the post first, DM only if they engage."
        right={<Button onClick={runScan} busy={scanning}>Run scan now</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {scanResult ? (
        <div style={{
          background: "rgba(129,140,248,.08)", border: "1px solid rgba(129,140,248,.25)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 12.5,
          color: "rgba(199,210,254,.9)",
        }}>
          {scanResult}
        </div>
      ) : null}

      <Section title="How to use this">
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", lineHeight: 1.8 }}>
          <strong style={{ color: "rgba(255,255,255,.8)" }}>Tier A</strong> mentions both the industry
          (PVC/plastics/injection molding) and a software complaint — reply first.{" "}
          <strong style={{ color: "rgba(255,255,255,.8)" }}>Tier B</strong> mentions industry and a
          costing/BOM/scrap pain, no software complaint yet.{" "}
          <strong style={{ color: "rgba(255,255,255,.8)" }}>Tier C</strong> is a software complaint with
          industry not confirmed — check the post before replying. A daily cron runs this
          automatically; "Run scan now" is for testing or an out-of-cycle check.
        </div>
      </Section>

      {loading && !data ? (
        <Loading label="Loading signals…" />
      ) : !visible.length ? (
        <Section>
          <Empty>
            No signals yet. Reddit rate-limits an unauthenticated scan fairly hard, and real pain
            posts are rare by nature — this fills in over days via the daily cron, not in one run.
          </Empty>
        </Section>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visible.map((s) => (
            <div key={s.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill tone={TIER_TONE[s.tier]}>Tier {s.tier}</Pill>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)" }}>{TIER_LABEL[s.tier]}</span>
                  {s.status !== "new" ? <Pill tone="grey">{s.status}</Pill> : null}
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>
                  r/{s.subreddit} · {fmtDate(s.createdAt)}
                </span>
              </div>

              <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", textDecoration: "none" }}>
                {s.title}
              </a>
              {s.author ? <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 3 }}>by u/{s.author}</div> : null}

              {s.snippet ? (
                <div style={{
                  marginTop: 10, padding: "10px 13px", background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.07)", borderRadius: 10,
                  fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.7,
                  maxHeight: 120, overflow: "hidden",
                }}>
                  {s.snippet}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {(s.matchedSoftware || []).map((k) => <Pill key={k} tone="amber">{k}</Pill>)}
                {(s.matchedIndustry || []).map((k) => <Pill key={k} tone="blue">{k}</Pill>)}
                {(s.matchedPain || []).map((k) => <Pill key={k} tone="grey">{k}</Pill>)}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Button tone="ghost" onClick={() => setStatus(s.id, "reviewed")}>Mark reviewed</Button>
                <Button tone="ghost" onClick={() => setStatus(s.id, "replied")}>Mark replied</Button>
                <Button tone="ghost" onClick={() => setStatus(s.id, "ignored")}>Ignore</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
        Source: Reddit's public RSS feed, not the JSON API — the JSON endpoints now redirect
        unauthenticated server requests to a login wall. Never send an unsolicited DM off a Tier A/B/C
        row; reply on the post itself first, per docs/growth/manual-lead-round.md.
      </div>
    </div>
  );
}

const TARGET_SUBREDDIT_COUNT = 10;
