"use client";

/**
 * Competitor Watch — what the alternatives charge, and what moved.
 *
 * Changes are pinned to the top of a competitor card and coloured, because they
 * are the only part of this page that is not already available by opening a
 * browser tab. A snapshot with no changes is deliberately quiet.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, Empty, ErrorNote, Loading, PageHeader, Pill, Section, aiKitCss,
  card, fmtDate, getJson, inputStyle, pageStyle, postJson, adminApi,
} from "@/app/admin/components/AiKit";

type Plan = {
  name: string; price: string; period: string; currency: string;
  seats: string; highlights: string[];
};

type Snapshot = {
  competitor: string;
  url: string;
  capturedAt: string;
  plans: Plan[];
  positioning: string;
  freeTrial: string;
  notableClaims: string[];
  changes: string[];
  method: "fetched" | "pasted";
};

type Stored = { id: string; key: string; title: string; createdAt: string; data: Snapshot };

type Payload = {
  aiConfigured: boolean;
  snapshots: Stored[];
  suggested: Array<{ name: string; url: string }>;
};

export default function CompetitorWatchPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/competitor-watch")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const check = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/admin/competitor-watch", {
        name, url, pastedText: showPaste ? pastedText : undefined,
      });
      setPastedText("");
      setShowPaste(false);
      load();
    } catch (e) {
      setError((e as Error).message);
      // A fetch that was refused is the normal case, not an exception. Opening
      // the paste box automatically saves the operator a click every time.
      if (/paste the page text/i.test((e as Error).message)) setShowPaste(true);
    } finally {
      setBusy(false);
    }
  }, [name, url, pastedText, showPaste, load]);

  const remove = useCallback(async (id: string) => {
    try {
      await adminApi(`/api/admin/competitor-watch?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [load]);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Competitor Watch"
        subtitle="Pricing and positioning for the products FinovaOS is compared against, captured and compared over time. The diff is the point — a snapshot is only worth keeping because the next one can be measured against it."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      <Section title="Check a competitor">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) auto", gap: 10, alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>NAME</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Xero" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.35)", marginBottom: 6 }}>PRICING PAGE URL</div>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.xero.com/pk/pricing-plans/" style={inputStyle} />
          </div>
          <Button onClick={check} busy={busy} disabled={!data?.aiConfigured || !name.trim() || (!url.trim() && !pastedText.trim())}>
            Check
          </Button>
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={() => setShowPaste((v) => !v)} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: "rgba(129,140,248,.8)", fontSize: 12,
          }}>
            {showPaste ? "Use the URL instead" : "The site blocks us — paste the page text instead"}
          </button>
        </div>

        {showPaste ? (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={7}
              placeholder="Open the pricing page in a browser, select all, paste here. This always works — most marketing sites refuse a server-side request."
              style={{ ...inputStyle, resize: "vertical", fontSize: 12, lineHeight: 1.6 }}
            />
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.3)", marginBottom: 8 }}>
            WORTH WATCHING
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(data?.suggested || []).map((s) => (
              <button key={s.name} onClick={() => { setName(s.name); setUrl(s.url); }} style={{
                fontSize: 11.5, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)",
                color: "rgba(255,255,255,.55)",
              }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {busy ? <Loading label="Reading the pricing page…" /> : null}

      {loading && !data ? (
        <Loading label="Loading snapshots…" />
      ) : !data?.snapshots.length ? (
        <Section>
          <Empty>
            No snapshots yet. Check one competitor above, then check it again in a few weeks — the
            second run is where this page starts earning its place.
          </Empty>
        </Section>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {data.snapshots.map((s) => {
            const snap = s.data;
            if (!snap) return null;
            return (
              <div key={s.id} style={card}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  gap: 12, flexWrap: "wrap", marginBottom: 14,
                }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>{snap.competitor}</span>
                      <Pill tone={snap.method === "fetched" ? "blue" : "grey"}>{snap.method}</Pill>
                      {snap.changes.length ? <Pill tone="amber">{snap.changes.length} change{snap.changes.length === 1 ? "" : "s"}</Pill> : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 4 }}>
                      Captured {fmtDate(snap.capturedAt)}
                      {snap.url ? <> · <a href={snap.url} target="_blank" rel="noreferrer" style={{ color: "rgba(129,140,248,.75)" }}>source</a></> : null}
                    </div>
                  </div>
                  <button onClick={() => remove(s.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,.25)", fontSize: 11.5,
                  }}>
                    Remove
                  </button>
                </div>

                {snap.changes.length ? (
                  <div style={{
                    background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.28)",
                    borderRadius: 12, padding: "13px 16px", marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#fcd34d", marginBottom: 7 }}>
                      CHANGED SINCE LAST CHECK
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "rgba(252,211,77,.9)", lineHeight: 1.8 }}>
                      {snap.changes.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                ) : null}

                {snap.plans.length ? (
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 10, marginBottom: 14,
                  }}>
                    {snap.plans.map((p) => (
                      <div key={p.name} style={{
                        background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
                        borderRadius: 12, padding: "13px 15px",
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.55)" }}>{p.name}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: "#f8fafc", margin: "4px 0 2px" }}>
                          {p.currency && p.currency !== "not stated" ? `${p.currency} ` : ""}{p.price}
                          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", fontWeight: 600 }}>
                            {p.period && p.period !== "not stated" ? ` / ${p.period}` : ""}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 8 }}>{p.seats}</div>
                        {p.highlights?.length ? (
                          <ul style={{ margin: 0, paddingLeft: 15, fontSize: 11.5, color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
                            {p.highlights.map((h) => <li key={h}>{h}</li>)}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "rgba(251,191,36,.7)", marginBottom: 14 }}>
                    No plans were found on that page.
                  </div>
                )}

                <div style={{ display: "grid", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.7 }}>
                  {snap.positioning ? (
                    <div>
                      <span style={{ color: "rgba(255,255,255,.32)", fontWeight: 800, fontSize: 10.5 }}>POSITIONING </span>
                      {snap.positioning}
                    </div>
                  ) : null}
                  <div>
                    <span style={{ color: "rgba(255,255,255,.32)", fontWeight: 800, fontSize: 10.5 }}>GETS YOU STARTED WITH </span>
                    {snap.freeTrial}
                  </div>
                  {snap.notableClaims?.length ? (
                    <div>
                      <span style={{ color: "rgba(255,255,255,.32)", fontWeight: 800, fontSize: 10.5 }}>CLAIMS </span>
                      {snap.notableClaims.join(" · ")}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
        Prices are copied from the page character for character and never converted between
        currencies — a competitor showing PKR to a Pakistani visitor and USD to us is a difference
        worth seeing, not one to normalise away. Re-checking a competitor replaces its snapshot and
        writes the diff.
      </div>
    </div>
  );
}
