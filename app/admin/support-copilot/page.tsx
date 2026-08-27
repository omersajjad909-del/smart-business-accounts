"use client";

/**
 * Support Copilot — every unanswered customer message in one queue.
 *
 * Ordered by how long someone has been waiting rather than by source or
 * priority. Priority is a field somebody set once at submission; waiting time is
 * the thing that actually goes wrong.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, Section, aiKitCss, card, getJson, pageStyle, postJson,
  type Tone,
} from "@/app/admin/components/AiKit";

type Source = "ticket" | "chat" | "feedback";

type Item = {
  id: string;
  source: Source;
  subject: string;
  message: string;
  from: string;
  companyName: string | null;
  status: string;
  priority: string | null;
  createdAt: string;
  waitingHours: number;
  messageCount?: number;
};

type Payload = {
  aiConfigured: boolean;
  generatedAt: string;
  items: Item[];
  summary: {
    total: number; tickets: number; chats: number; feedback: number;
    oldestHours: number; over24h: number;
  };
};

type Triage = {
  id: string;
  category: string;
  urgency: "low" | "normal" | "high" | "urgent";
  summary: string;
  action: string;
};

const URGENCY_TONE: Record<Triage["urgency"], Tone> = {
  urgent: "red", high: "amber", normal: "blue", low: "grey",
};

const SOURCE_LABEL: Record<Source, string> = {
  ticket: "Ticket", chat: "Live chat", feedback: "Complaint",
};

function waitLabel(hours: number): { text: string; tone: Tone } {
  if (hours >= 72) return { text: `${Math.floor(hours / 24)}d waiting`, tone: "red" };
  if (hours >= 24) return { text: `${Math.floor(hours / 24)}d waiting`, tone: "amber" };
  if (hours >= 1) return { text: `${hours}h waiting`, tone: "blue" };
  return { text: "Just now", tone: "green" };
}

export default function SupportCopilotPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triage, setTriage] = useState<Record<string, Triage>>({});
  const [triaging, setTriaging] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all");

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/support-copilot")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const runTriage = useCallback(async () => {
    setTriaging(true);
    setError(null);
    try {
      const res = await postJson<{ triage: Triage[]; triagedCount: number; queueSize: number }>(
        "/api/admin/support-copilot", { mode: "triage" },
      );
      const map: Record<string, Triage> = {};
      for (const t of res.triage) map[t.id] = t;
      setTriage(map);
      if (res.triagedCount === 0 && res.queueSize > 0) {
        setError("The model returned nothing usable. The queue is unchanged — try again.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTriaging(false);
    }
  }, []);

  const draftReply = useCallback(async (id: string) => {
    setReplying(id);
    setError(null);
    try {
      const res = await postJson<{ id: string; reply: string }>(
        "/api/admin/support-copilot", { mode: "reply", id },
      );
      setReplies((prev) => ({ ...prev, [id]: res.reply }));
      setOpen(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReplying(null);
    }
  }, []);

  const rows = useMemo(() => {
    const items = data?.items || [];
    const filtered = sourceFilter === "all" ? items : items.filter((i) => i.source === sourceFilter);
    // Once triaged, urgency outranks waiting time — that is the whole point of
    // triaging. Untriaged items keep their waiting-time order underneath.
    const rank = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
    return [...filtered].sort((a, b) => {
      const ta = triage[a.id], tb = triage[b.id];
      if (ta && tb && ta.urgency !== tb.urgency) return rank[ta.urgency] - rank[tb.urgency];
      if (ta && !tb) return -1;
      if (!ta && tb) return 1;
      return b.waitingHours - a.waitingHours;
    });
  }, [data, sourceFilter, triage]);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Support Copilot"
        subtitle="Open tickets, live chats waiting on a human, and unresolved complaints — one queue, oldest wait first. Triage classifies the whole queue in a single pass; replies are drafted one at a time and never sent from here."
        right={
          <>
            <Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>
            {data?.aiConfigured ? (
              <Button onClick={runTriage} busy={triaging} disabled={!data.items.length}>
                Triage queue
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Reading tickets, chats and complaints…" />
      ) : !data ? (
        <Empty>Could not load the support queue.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Waiting", value: data.summary.total, color: data.summary.total ? "#818cf8" : "#34d399", sub: "Across all three inboxes" },
            { label: "Over 24 hours", value: data.summary.over24h, color: data.summary.over24h ? "#f87171" : "#34d399", sub: "Answer these first" },
            { label: "Oldest", value: data.summary.oldestHours >= 24 ? `${Math.floor(data.summary.oldestHours / 24)}d` : `${data.summary.oldestHours}h`, color: "#fbbf24", sub: "Longest anyone has waited" },
            { label: "Mix", value: `${data.summary.tickets}/${data.summary.chats}/${data.summary.feedback}`, color: "#c4b5fd", sub: "Tickets / chats / complaints" },
          ]} />

          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {(["all", "ticket", "chat", "feedback"] as const).map((f) => (
              <button key={f} onClick={() => setSourceFilter(f)} style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: sourceFilter === f ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                border: sourceFilter === f ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
                color: sourceFilter === f ? "#818cf8" : "rgba(255,255,255,.4)",
              }}>
                {f === "all" ? "All" : SOURCE_LABEL[f]}
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <Section>
              <Empty>
                {data.summary.total === 0
                  ? "Nothing is waiting on you. Every ticket is closed, every chat is answered, and no complaint is open."
                  : "Nothing in this source."}
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map((it) => {
                const t = triage[it.id];
                const w = waitLabel(it.waitingHours);
                const isOpen = open === it.id;
                const reply = replies[it.id];
                return (
                  <div key={it.id} style={card}>
                    <div
                      onClick={() => setOpen(isOpen ? null : it.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        <Pill tone="grey">{SOURCE_LABEL[it.source]}</Pill>
                        <Pill tone={w.tone}>{w.text}</Pill>
                        {t ? <Pill tone={URGENCY_TONE[t.urgency]}>{t.urgency}</Pill> : null}
                        {t ? <Pill tone="violet">{t.category}</Pill> : null}
                        {it.companyName ? (
                          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)" }}>{it.companyName}</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>
                        {it.subject}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>
                        {it.from}
                        {it.messageCount ? ` · ${it.messageCount} messages` : ""}
                      </div>
                      {t ? (
                        <div style={{
                          marginTop: 10, fontSize: 12.5, color: "rgba(255,255,255,.65)",
                          borderLeft: "2px solid rgba(139,92,246,.5)", paddingLeft: 11, lineHeight: 1.6,
                        }}>
                          <strong style={{ color: "#c4b5fd" }}>{t.summary}</strong>
                          <br />
                          <span style={{ color: "rgba(255,255,255,.45)" }}>Next: {t.action}</span>
                        </div>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                        <div style={{
                          background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.06)",
                          borderRadius: 12, padding: "14px 16px",
                          fontSize: 12.5, color: "rgba(255,255,255,.72)",
                          whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 320, overflowY: "auto",
                        }}>
                          {it.message || <span style={{ color: "rgba(255,255,255,.3)" }}>No message body.</span>}
                        </div>

                        {reply ? (
                          <div style={{
                            background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.2)",
                            borderRadius: 14, padding: "16px 18px",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#6ee7b7" }}>DRAFT REPLY</span>
                              <div style={{ display: "flex", gap: 6 }}>
                                <CopyButton text={reply} />
                                <Button tone="ghost" onClick={() => draftReply(it.id)} busy={replying === it.id}>Redraft</Button>
                              </div>
                            </div>
                            <Prose text={reply} />
                            <ReviewNotice>
                              Read the confidence line at the bottom before you send this. A
                              &quot;low&quot; means the model was guessing at something it could not
                              see — check that part yourself.
                            </ReviewNotice>
                          </div>
                        ) : data.aiConfigured ? (
                          <div>
                            <Button onClick={() => draftReply(it.id)} busy={replying === it.id}>
                              Draft a reply
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {!data.aiConfigured ? (
            <div style={{ marginTop: 18 }}>
              <Section>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>
                  The queue above is live and needs no model. Triage and reply drafting need one —
                  set GROQ_API_KEY or OPENAI_API_KEY to turn them on.
                </div>
              </Section>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
