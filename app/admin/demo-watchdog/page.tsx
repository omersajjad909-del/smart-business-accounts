"use client";

/**
 * Demo Watchdog — everyone who tried FinovaOS and stopped.
 *
 * Ordered by how deep they got, not by when they arrived. Someone who built a
 * chart of accounts in the sandbox three weeks ago is a better lead than someone
 * who booked a slot this morning and has not shown up yet.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, ScoreBar, Section, aiKitCss, card, fmtDate, getJson,
  pageStyle, postJson, type Tone,
} from "@/app/admin/components/AiKit";

type Kind = "booking" | "sandbox" | "abandoned-signup";

type Lead = {
  id: string;
  kind: Kind;
  name: string;
  email: string | null;
  company: string | null;
  businessType: string | null;
  createdAt: string;
  stage: string;
  depth: number;
  activity: string[];
  converted: boolean;
};

type Payload = {
  aiConfigured: boolean;
  days: number;
  leads: Lead[];
  summary: {
    total: number; converted: number; bookings: number;
    sandboxes: number; abandoned: number; hotOpen: number;
  };
};

const KIND_LABEL: Record<Kind, string> = {
  booking: "Booked demo",
  sandbox: "Sandbox",
  "abandoned-signup": "Abandoned signup",
};

const KIND_TONE: Record<Kind, Tone> = {
  booking: "blue", sandbox: "violet", "abandoned-signup": "amber",
};

const WINDOWS = [7, 30, 90, 180];

export default function DemoWatchdogPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hooks, setHooks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [showConverted, setShowConverted] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");

  const load = useCallback((d: number) => {
    setLoading(true);
    getJson<Payload>(`/api/admin/demo-watchdog?days=${d}`)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const draftHook = useCallback(async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const res = await postJson<{ id: string; hook: string }>("/api/admin/demo-watchdog", { id, days });
      setHooks((prev) => ({ ...prev, [id]: res.hook }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [days]);

  const rows = (data?.leads || [])
    .filter((l) => showConverted || !l.converted)
    .filter((l) => kindFilter === "all" || l.kind === kindFilter);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Demo Watchdog"
        subtitle="Booked demos, sandbox sessions and abandoned signups — the three places people reach the product and stop. Ranked by how far in they got, because that is the only honest measure of how interested they were."
        right={<Button tone="ghost" onClick={() => load(days)} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {WINDOWS.map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: days === d ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
            border: days === d ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
            color: days === d ? "#818cf8" : "rgba(255,255,255,.4)",
          }}>
            {d} days
          </button>
        ))}
        <span style={{ width: 12 }} />
        {(["all", "sandbox", "booking", "abandoned-signup"] as const).map((k) => (
          <button key={k} onClick={() => setKindFilter(k)} style={{
            padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: kindFilter === k ? "rgba(139,92,246,.22)" : "rgba(255,255,255,.05)",
            border: kindFilter === k ? "1px solid #8b5cf6" : "1px solid rgba(255,255,255,.1)",
            color: kindFilter === k ? "#c4b5fd" : "rgba(255,255,255,.4)",
          }}>
            {k === "all" ? "All routes" : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Loading label="Reading demo bookings, sandboxes and signups…" />
      ) : !data ? (
        <Empty>Could not load demo activity.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Warm and open", value: data.summary.hotOpen, color: "#f87171", sub: "Did real work, never signed up" },
            { label: "Sandboxes", value: data.summary.sandboxes, color: "#c4b5fd", sub: "Self-serve demos opened" },
            { label: "Booked demos", value: data.summary.bookings, color: "#93c5fd", sub: "Slots requested" },
            { label: "Abandoned signups", value: data.summary.abandoned, color: "#fbbf24", sub: "Never entered the code" },
            { label: "Converted", value: data.summary.converted, color: "#34d399", sub: "Became a real account" },
          ]} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,.45)", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showConverted}
                onChange={(e) => setShowConverted(e.target.checked)}
                style={{ accentColor: "#6366f1" }}
              />
              Show the ones who did sign up
            </label>
          </div>

          {rows.length === 0 ? (
            <Section>
              <Empty>
                {data.summary.total === 0
                  ? "Nobody has booked a demo, opened a sandbox or started a signup in this window."
                  : "Nothing left in this filter — everyone here converted."}
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map((l) => {
                const hook = hooks[l.id];
                return (
                  <div key={l.id} style={{
                    ...card,
                    opacity: l.converted ? 0.55 : 1,
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", gap: 14,
                      alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                          <Pill tone={KIND_TONE[l.kind]}>{KIND_LABEL[l.kind]}</Pill>
                          {l.converted ? <Pill tone="green">Converted</Pill> : null}
                          {l.businessType ? <Pill tone="grey">{l.businessType}</Pill> : null}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#f8fafc" }}>{l.name}</div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.38)", marginTop: 3 }}>
                          {[l.company, l.email, fmtDate(l.createdAt)].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", fontWeight: 700, marginBottom: 5 }}>
                          HOW FAR IN
                        </div>
                        <ScoreBar value={l.depth} tone={l.depth >= 65 ? "violet" : "blue"} />
                      </div>
                    </div>

                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", marginBottom: l.activity.length ? 10 : 14 }}>
                      {l.stage}
                    </div>

                    {l.activity.length ? (
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                        {l.activity.map((a) => (
                          <span key={a} style={{
                            fontSize: 11.5, padding: "5px 11px", borderRadius: 8,
                            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                            color: "rgba(255,255,255,.6)",
                          }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {hook ? (
                      <div style={{
                        background: "rgba(56,189,248,.05)", border: "1px solid rgba(56,189,248,.2)",
                        borderRadius: 14, padding: "16px 18px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#93c5fd" }}>FOLLOW-UP</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <CopyButton text={hook} />
                            <Button tone="ghost" onClick={() => draftHook(l.id)} busy={busy === l.id}>Redraft</Button>
                          </div>
                        </div>
                        <Prose text={hook} />
                        <ReviewNotice />
                      </div>
                    ) : !l.converted && data.aiConfigured ? (
                      <Button onClick={() => draftHook(l.id)} busy={busy === l.id}>
                        Draft the follow-up
                      </Button>
                    ) : null}

                    {l.kind === "sandbox" && !l.email ? (
                      <div style={{ fontSize: 11, color: "rgba(251,191,36,.6)", marginTop: 10, lineHeight: 1.6 }}>
                        A sandbox is anonymous — there is no email on this row. The draft is
                        something to say if you can work out who they were, from the chat log or a
                        booking around the same time.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
            A lead counts as converted when a registered user shares their email address. Sandboxes
            are anonymous and can never be marked converted, so treat that number as a floor.
            Abandoned signups are only counted an hour after they started, to leave room for someone
            who is still reading the email.
          </div>
        </>
      )}
    </div>
  );
}
