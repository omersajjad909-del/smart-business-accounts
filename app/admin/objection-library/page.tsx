"use client";

/**
 * Objection Library — what people say no to, and the best answer so far.
 *
 * Three tabs rather than three pages, because they are one loop: mine what was
 * actually said, write the answer down, then walk into the next call with it.
 * Splitting them up is how the library stops being maintained.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, Section, adminApi, aiKitCss, card, fmtDate, getJson,
  inputStyle, pageStyle, postJson, type Tone,
} from "@/app/admin/components/AiKit";

type Objection = {
  objection: string;
  category: string;
  answer: string;
  evidence: Array<{ id: string; quote: string }>;
  flags: string[];
  updatedAt: string;
};

type Stored = { id: string; key: string; title: string; createdAt: string; data: Objection };
type Payload = { aiConfigured: boolean; objections: Stored[]; categories: string[] };

type Mined = {
  objection: string; category: string; count: number;
  evidence: Array<{ id: string; quote: string }>;
};

type Brief = {
  likelyObjections: Array<{ objection: string; why: string; answer: string }>;
  openWith: string;
  askThem: string[];
  walkAwayIf: string;
};

const CATEGORY_TONE: Record<string, Tone> = {
  price: "amber",
  "switching-cost": "violet",
  "existing-solution": "blue",
  trust: "red",
  "missing-feature": "violet",
  timing: "grey",
  authority: "grey",
  "data-security": "red",
  support: "blue",
  other: "grey",
};

const CATEGORIES = [
  "price", "switching-cost", "existing-solution", "trust", "missing-feature",
  "timing", "authority", "data-security", "support", "other",
];

type Tab = "library" | "mine" | "brief";

export default function ObjectionLibraryPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>("library");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // add / edit
  const [draftObjection, setDraftObjection] = useState("");
  const [draftCategory, setDraftCategory] = useState("other");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftEvidence, setDraftEvidence] = useState<Array<{ id: string; quote: string }>>([]);
  const [draftFlags, setDraftFlags] = useState<string[]>([]);

  // mining
  const [mined, setMined] = useState<Mined[] | null>(null);
  const [mineNote, setMineNote] = useState<string | null>(null);

  // brief
  const [prospect, setProspect] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefFlags, setBriefFlags] = useState<string[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/objection-library")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const startEditing = useCallback((o: Objection) => {
    setDraftObjection(o.objection);
    setDraftCategory(o.category || "other");
    setDraftAnswer(o.answer || "");
    setDraftEvidence(o.evidence || []);
    setDraftFlags(o.flags || []);
    setTab("library");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const generateAnswer = useCallback(async () => {
    if (!draftObjection.trim()) return;
    setBusy("answer");
    setError(null);
    try {
      const res = await postJson<{ answer: string; flags: string[] }>("/api/admin/objection-library", {
        mode: "answer", objection: draftObjection, category: draftCategory, answer: draftAnswer,
      });
      setDraftAnswer(res.answer);
      setDraftFlags(res.flags);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [draftObjection, draftCategory, draftAnswer]);

  const save = useCallback(async () => {
    if (!draftObjection.trim()) return;
    setBusy("save");
    setError(null);
    try {
      const res = await postJson<{ flags: string[] }>("/api/admin/objection-library", {
        mode: "save",
        objection: draftObjection, category: draftCategory,
        answer: draftAnswer, evidence: draftEvidence,
      });
      setDraftFlags(res.flags);
      setDraftObjection(""); setDraftAnswer(""); setDraftEvidence([]); setDraftCategory("other");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [draftObjection, draftCategory, draftAnswer, draftEvidence, load]);

  const mine = useCallback(async () => {
    setBusy("mine");
    setError(null);
    setMined(null);
    setMineNote(null);
    try {
      const res = await postJson<{ found: Mined[]; scanned: number; total?: number; note?: string }>(
        "/api/admin/objection-library", { mode: "mine", days: 180 },
      );
      setMined(res.found);
      setMineNote(res.note || `Read ${res.scanned} message${res.scanned === 1 ? "" : "s"}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  const buildBrief = useCallback(async () => {
    if (!prospect.trim()) return;
    setBusy("brief");
    setError(null);
    setBrief(null);
    try {
      const res = await postJson<{ brief: Brief; flags: string[] }>("/api/admin/objection-library", {
        mode: "brief", prospect,
      });
      setBrief(res.brief);
      setBriefFlags(res.flags);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [prospect]);

  const remove = useCallback(async (id: string) => {
    try {
      await adminApi(`/api/admin/objection-library?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [load]);

  const answered = (data?.objections || []).filter((o) => o.data?.answer?.trim()).length;
  const flagged = (data?.objections || []).filter((o) => o.data?.flags?.length).length;

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Objection Library"
        subtitle="The reasons people give for not buying, and the best answer worked out so far. Mine them from real conversations, write the answer down once, and walk into the next call with it."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <KpiRow items={[
        { label: "Objections stored", value: data?.objections.length ?? 0, color: "#818cf8", sub: "In the library" },
        { label: "With an answer", value: answered, color: answered ? "#34d399" : "#fbbf24", sub: "Ready to use on a call" },
        { label: "Flagged", value: flagged, color: flagged ? "#f87171" : "#34d399", sub: "Answer contains a claim we cannot make" },
      ]} />

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {([
          ["library", "Library"],
          ["mine", "Mine from conversations"],
          ["brief", "Pre-call brief"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            background: tab === id ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
            border: tab === id ? "1px solid #6366f1" : "1px solid rgba(255,255,255,.1)",
            color: tab === id ? "#818cf8" : "rgba(255,255,255,.4)",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── LIBRARY ── */}
      {tab === "library" ? (
        <>
          <Section title={draftObjection ? "Edit" : "Add an objection"}>
            <div style={{ display: "grid", gap: 11 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
                  WHAT THEY SAY
                </div>
                <input
                  value={draftObjection}
                  onChange={(e) => setDraftObjection(e.target.value)}
                  placeholder="Hamara accountant already sab kuch Excel me kar raha hai"
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
                  CATEGORY
                </div>
                <select value={draftCategory} onChange={(e) => setDraftCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)" }}>THE ANSWER</span>
                  {data?.aiConfigured ? (
                    <Button tone="ghost" onClick={generateAnswer} busy={busy === "answer"} disabled={!draftObjection.trim()}>
                      {draftAnswer.trim() ? "Improve it" : "Draft one"}
                    </Button>
                  ) : null}
                </div>
                <textarea
                  value={draftAnswer}
                  onChange={(e) => setDraftAnswer(e.target.value)}
                  rows={7}
                  placeholder="Write it yourself, or draft one and edit it. Yours will usually be better — you have been on the call."
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
                />
              </div>

              {draftFlags.length ? (
                <div style={{
                  background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)",
                  borderRadius: 11, padding: "11px 14px", fontSize: 12.5, color: "#fca5a5", lineHeight: 1.7,
                }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>This answer makes a claim we cannot make</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {draftFlags.map((fl) => <li key={fl}>{fl}</li>)}
                  </ul>
                </div>
              ) : null}

              {draftEvidence.length ? (
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", lineHeight: 1.7 }}>
                  Carrying {draftEvidence.length} quote{draftEvidence.length === 1 ? "" : "s"} from real messages.
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={save} busy={busy === "save"} disabled={!draftObjection.trim()}>
                  Save to library
                </Button>
                {draftObjection || draftAnswer ? (
                  <Button tone="ghost" onClick={() => {
                    setDraftObjection(""); setDraftAnswer(""); setDraftEvidence([]); setDraftFlags([]); setDraftCategory("other");
                  }}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </Section>

          {loading && !data ? (
            <Loading label="Loading the library…" />
          ) : !data?.objections.length ? (
            <Section>
              <Empty>
                The library is empty. Add the objection you heard on the last call, or mine the
                conversations you already have.
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.objections.map((o) => {
                const d = o.data;
                if (!d) return null;
                return (
                  <div key={o.id} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                          <Pill tone={CATEGORY_TONE[d.category] || "grey"}>{d.category}</Pill>
                          {d.flags?.length ? <Pill tone="red">Check this answer</Pill> : null}
                          {!d.answer?.trim() ? <Pill tone="amber">No answer yet</Pill> : null}
                        </div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#f8fafc", lineHeight: 1.5 }}>
                          &ldquo;{d.objection}&rdquo;
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {d.answer ? <CopyButton text={d.answer} /> : null}
                        <Button tone="ghost" onClick={() => startEditing(d)}>Edit</Button>
                        <Button tone="danger" onClick={() => remove(o.id)}>Delete</Button>
                      </div>
                    </div>

                    {d.answer ? (
                      <div style={{
                        background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.18)",
                        borderRadius: 12, padding: "14px 16px",
                      }}>
                        <Prose text={d.answer} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "rgba(251,191,36,.7)" }}>
                        Nobody has written the answer yet. That is the objection most worth spending
                        ten minutes on.
                      </div>
                    )}

                    {d.flags?.length ? (
                      <div style={{ fontSize: 11.5, color: "#fca5a5", marginTop: 10, lineHeight: 1.6 }}>
                        {d.flags.join(" · ")}
                      </div>
                    ) : null}

                    {d.evidence?.length ? (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.28)", marginBottom: 6 }}>
                          HEARD IT HERE
                        </div>
                        {d.evidence.map((e) => (
                          <div key={e.id} style={{
                            fontSize: 11.5, color: "rgba(255,255,255,.5)", lineHeight: 1.6,
                            borderLeft: "2px solid rgba(255,255,255,.13)", paddingLeft: 10, marginBottom: 5,
                          }}>
                            &ldquo;{e.quote}&rdquo;
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.22)", marginTop: 10 }}>
                      Updated {fmtDate(d.updatedAt || o.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {/* ── MINE ── */}
      {tab === "mine" ? (
        <>
          <Section title="Pull objections out of what people have already said">
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: 14 }}>
              Reads chat transcripts, enquiry messages, complaints and waitlist entries from the
              last six months and finds the reasons people gave for not proceeding. Nothing is saved
              automatically — you decide which ones are real, then add them.
            </div>
            {data?.aiConfigured ? (
              <Button onClick={mine} busy={busy === "mine"}>Mine the conversations</Button>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                Set GROQ_API_KEY or OPENAI_API_KEY to mine conversations.
              </div>
            )}
            {mineNote ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 12, lineHeight: 1.7 }}>{mineNote}</div>
            ) : null}
          </Section>

          {busy === "mine" ? <Loading label="Reading conversations…" /> : null}

          {mined && mined.length === 0 ? (
            <Section>
              <Empty>
                No objections found in what people have written. Most objections are spoken, not
                typed — add the ones you heard on calls by hand.
              </Empty>
            </Section>
          ) : null}

          {mined && mined.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {mined.map((m, i) => (
                <div key={i} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <Pill tone={CATEGORY_TONE[m.category] || "grey"}>{m.category}</Pill>
                        <Pill tone="grey">{m.count} time{m.count === 1 ? "" : "s"}</Pill>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc", lineHeight: 1.5 }}>
                        &ldquo;{m.objection}&rdquo;
                      </div>
                    </div>
                    <Button onClick={() => {
                      setDraftObjection(m.objection);
                      setDraftCategory(m.category);
                      setDraftAnswer("");
                      setDraftEvidence(m.evidence || []);
                      setDraftFlags([]);
                      setTab("library");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>
                      Add to library
                    </Button>
                  </div>
                  {m.evidence?.length ? (
                    <div>
                      {m.evidence.map((e) => (
                        <div key={e.id} style={{
                          fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.65,
                          borderLeft: "2px solid rgba(255,255,255,.14)", paddingLeft: 11, marginBottom: 6,
                        }}>
                          &ldquo;{e.quote}&rdquo;
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: "rgba(251,191,36,.65)" }}>
                      No verifiable quote survived the id check — treat this one with suspicion.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── BRIEF ── */}
      {tab === "brief" ? (
        <>
          <Section title="Before the call">
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              WHO ARE YOU TALKING TO?
            </div>
            <textarea
              value={prospect}
              onChange={(e) => setProspect(e.target.value)}
              rows={4}
              placeholder="PVC pipe wholesaler in Faisalabad, 12 staff, two godowns, currently on Excel plus a munshi. Owner is 55, his son pushed for this. Was quoted by Zoho last month."
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.32)", margin: "10px 0 14px", lineHeight: 1.65 }}>
              The more specific this is, the better the brief. The library is read as part of it, so
              anything you have already answered comes back in the prospect&apos;s terms.
            </div>
            {data?.aiConfigured ? (
              <Button onClick={buildBrief} busy={busy === "brief"} disabled={!prospect.trim()}>
                Build the brief
              </Button>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                Set GROQ_API_KEY or OPENAI_API_KEY to build briefs.
              </div>
            )}
          </Section>

          {busy === "brief" ? <Loading label="Reading the library…" /> : null}

          {briefFlags.length ? (
            <ErrorNote>
              This brief contains a claim FinovaOS cannot make — fix it before you take it into a
              call: {briefFlags.join(" · ")}
            </ErrorNote>
          ) : null}

          {brief ? (
            <>
              <Section title="Open with">
                <Prose text={brief.openWith} />
              </Section>

              <Section title={`Likely objections (${brief.likelyObjections?.length ?? 0})`}>
                <div style={{ display: "grid", gap: 16 }}>
                  {(brief.likelyObjections || []).map((o, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>
                        &ldquo;{o.objection}&rdquo;
                      </div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>
                        {o.why}
                      </div>
                      <div style={{
                        background: "rgba(52,211,153,.05)", border: "1px solid rgba(52,211,153,.18)",
                        borderRadius: 12, padding: "13px 16px",
                      }}>
                        <Prose text={o.answer} />
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Ask them">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.9 }}>
                  {(brief.askThem || []).map((q) => <li key={q}>{q}</li>)}
                </ul>
              </Section>

              <Section title="Walk away if">
                <div style={{ fontSize: 13, color: "#fcd34d", lineHeight: 1.7 }}>{brief.walkAwayIf}</div>
                <ReviewNotice>
                  A brief is a preparation, not a script. The answers come from your library plus
                  what you typed about this prospect — nothing here knows them.
                </ReviewNotice>
              </Section>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
