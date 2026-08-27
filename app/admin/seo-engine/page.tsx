"use client";

/**
 * SEO / GEO Content Engine — long-tail page briefs.
 *
 * The FAQ block gets its own section with its own explanation, because it is
 * the part people skip and the part that does the work in an answer engine.
 * Everything else on this page is ordinary on-page SEO that a copywriter would
 * recognise.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, Loading, PageHeader, Pill, Prose,
  ReviewNotice, Section, adminApi, aiKitCss, fmtDate, getJson,
  inputStyle, pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Draft = {
  keyword: string;
  intent: string;
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ href: string; anchor: string; why: string }>;
  keywordsCovered: string[];
  jsonLd: string;
  flags: string[];
  createdAt: string;
};

type Stored = { id: string; key: string; title: string; createdAt: string; data: Draft };
type Payload = { aiConfigured: boolean; drafts: Stored[]; routes: string[]; patterns: string[] };

const IDEAS = [
  "accounting software for PVC pipe traders in Pakistan",
  "best inventory software for textile units Faisalabad",
  "Tally alternative for Pakistani businesses",
  "accounting software with Urdu support",
  "pharma distribution software with batch and expiry tracking",
  "how to move from Excel to accounting software",
];

export default function SeoEnginePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [audience, setAudience] = useState("");
  const [angle, setAngle] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [droppedLinks, setDroppedLinks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/seo-engine")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const write = useCallback(async () => {
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      const res = await postJson<{ draft: Draft; droppedLinks: string[] }>("/api/admin/seo-engine", {
        keyword, audience: audience.trim() || undefined, angle: angle.trim() || undefined,
      });
      setDraft(res.draft);
      setDroppedLinks(res.droppedLinks || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [keyword, audience, angle]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await adminApi("/api/admin/seo-engine", { method: "PUT", body: JSON.stringify({ draft }) });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft, load]);

  const remove = useCallback(async (id: string) => {
    await adminApi(`/api/admin/seo-engine?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    load();
  }, [load]);

  const fullMarkdown = draft ? [
    `# ${draft.h1}`, "",
    ...draft.sections.flatMap((s) => [`## ${s.heading}`, "", s.body, ""]),
    "## Frequently asked questions", "",
    ...draft.faq.flatMap((f) => [`### ${f.question}`, "", f.answer, ""]),
  ].join("\n") : "";

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="SEO / GEO Content Engine"
        subtitle="Briefs for long-tail landing pages, written to rank in search and to be quotable by answer engines. Internal links are checked against the routes that actually exist, and every draft is scanned for claims FinovaOS cannot make."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <Section title="Write a page">
        <div style={{ display: "grid", gap: 11 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
              WHAT ARE THEY SEARCHING FOR?
            </div>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="accounting software for PVC pipe traders in Pakistan"
              style={inputStyle}
            />
          </div>
          <div className="ai-two">
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
                WHO IS SEARCHING IT (OPTIONAL)
              </div>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Owner, 40s, 8 staff, currently on Excel"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>
                ANGLE (OPTIONAL)
              </div>
              <input
                value={angle}
                onChange={(e) => setAngle(e.target.value)}
                placeholder="Lead on the godown stock problem"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {data?.aiConfigured ? (
            <Button onClick={write} busy={busy} disabled={!keyword.trim()}>
              {draft ? "Write again" : "Write the brief"}
            </Button>
          ) : (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
              Set GROQ_API_KEY or OPENAI_API_KEY to write briefs.
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", marginBottom: 8 }}>
            IDEAS
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {IDEAS.map((k) => (
              <button key={k} onClick={() => setKeyword(k)} style={{
                fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)",
                color: "rgba(255,255,255,.55)",
              }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {busy ? <Loading label="Writing the page…" /> : null}

      {draft ? (
        <>
          {draft.flags.length ? (
            <ErrorNote>
              <strong>This draft makes a claim FinovaOS cannot make.</strong> Fix it before any of
              it is published: {draft.flags.join(" · ")}
            </ErrorNote>
          ) : null}

          <Section
            title="Page metadata"
            right={<Button onClick={save} busy={saving} tone="good">Save this draft</Button>}
          >
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { k: "Intent", v: draft.intent },
                { k: "Slug", v: `/${draft.slug}`, mono: true },
                { k: "Title", v: draft.title, count: draft.title.length, limit: 60 },
                { k: "Meta description", v: draft.metaDescription, count: draft.metaDescription.length, limit: 155 },
                { k: "H1", v: draft.h1 },
              ].map((f) => (
                <div key={f.k}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)" }}>
                      {f.k.toUpperCase()}
                    </span>
                    {f.count !== undefined ? (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700,
                        color: f.count > (f.limit || 999) ? "#fca5a5" : "rgba(255,255,255,.3)",
                      }}>
                        {f.count} / {f.limit}
                      </span>
                    ) : null}
                  </div>
                  <div style={{
                    fontSize: 13, color: "#e2e8f0", lineHeight: 1.6,
                    fontFamily: f.mono ? "ui-monospace,monospace" : "inherit",
                  }}>
                    {f.v}
                  </div>
                </div>
              ))}
              {draft.keywordsCovered.length ? (
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)", marginBottom: 6 }}>
                    SEARCHES THIS SHOULD COVER
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {draft.keywordsCovered.map((k) => <Pill key={k} tone="grey">{k}</Pill>)}
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="Page copy" right={<CopyButton text={fullMarkdown} label="Copy as markdown" />}>
            <div style={{ display: "grid", gap: 20 }}>
              {draft.sections.map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", marginBottom: 8 }}>{s.heading}</div>
                  <Prose text={s.body} />
                </div>
              ))}
            </div>
          </Section>

          <Section title={`FAQ — the part answer engines quote (${draft.faq.length})`}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", lineHeight: 1.7, marginBottom: 16 }}>
              Each answer is written to stand on its own, because that is how it will be quoted —
              lifted out of the page, with nothing around it. If an answer only makes sense in
              context, it will be paraphrased into something we did not say.
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {draft.faq.map((f, i) => {
                const words = f.answer.trim().split(/\s+/).length;
                return (
                  <div key={i}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#c7d2fe", marginBottom: 5 }}>
                      {f.question}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", lineHeight: 1.75 }}>
                      {f.answer}
                    </div>
                    <div style={{
                      fontSize: 10.5, marginTop: 4,
                      color: words < 35 || words > 80 ? "rgba(251,191,36,.7)" : "rgba(255,255,255,.22)",
                    }}>
                      {words} words{words < 35 ? " — short for a quotable answer" : words > 80 ? " — long for a quotable answer" : ""}
                    </div>
                  </div>
                );
              })}
            </div>

            {draft.jsonLd ? (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.3)" }}>
                    FAQPAGE JSON-LD — PASTE INTO THE PAGE HEAD
                  </span>
                  <CopyButton text={draft.jsonLd} label="Copy JSON-LD" />
                </div>
                <pre style={{
                  margin: 0, padding: "12px 14px", borderRadius: 11,
                  background: "rgba(0,0,0,.3)", border: "1px solid rgba(255,255,255,.06)",
                  fontSize: 11, color: "rgba(255,255,255,.55)", lineHeight: 1.6,
                  maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap",
                  fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                }}>
                  {draft.jsonLd}
                </pre>
              </div>
            ) : null}
          </Section>

          <Section title={`Internal links (${draft.internalLinks.length})`}>
            <div style={{ display: "grid", gap: 10 }}>
              {draft.internalLinks.map((l) => (
                <div key={l.href} style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", color: "#6ee7b7" }}>{l.href}</span>
                  <span style={{ color: "rgba(255,255,255,.3)" }}> · </span>
                  <span style={{ color: "#e2e8f0" }}>&ldquo;{l.anchor}&rdquo;</span>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{l.why}</div>
                </div>
              ))}
            </div>
            {droppedLinks.length ? (
              <div style={{ fontSize: 11.5, color: "rgba(251,191,36,.7)", marginTop: 12, lineHeight: 1.6 }}>
                {droppedLinks.length} proposed link(s) pointed at routes that do not exist and were
                removed: {droppedLinks.join(", ")}
              </div>
            ) : null}
            <ReviewNotice>
              This is a brief, not a page. Nothing here is deployed until somebody builds the route
              and pastes it in — which is the review step, and the reason there is no button that
              publishes it.
            </ReviewNotice>
          </Section>
        </>
      ) : null}

      {loading && !data ? (
        <Loading label="Loading saved drafts…" />
      ) : data?.drafts.length ? (
        <Section title={`Saved drafts (${data.drafts.length})`}>
          <div style={{ display: "grid", gap: 9 }}>
            {data.drafts.map((s) => (
              <div key={s.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                gap: 12, padding: "11px 14px", borderRadius: 11,
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 2 }}>
                    /{s.data?.slug} · {s.data?.faq?.length ?? 0} FAQ · saved {fmtDate(s.createdAt)}
                    {s.data?.flags?.length ? " · flagged" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button tone="ghost" onClick={() => { setDraft(s.data); setDroppedLinks([]); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    Open
                  </Button>
                  <Button tone="danger" onClick={() => remove(s.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : !draft ? (
        <Section>
          <Empty>No saved drafts yet. Write one above and save it if it is worth keeping.</Empty>
        </Section>
      ) : null}
    </div>
  );
}
