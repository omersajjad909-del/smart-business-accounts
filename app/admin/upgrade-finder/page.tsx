"use client";

/**
 * Upgrade Finder — customers whose usage has outgrown their plan.
 *
 * The "parked" strip at the bottom is the part worth keeping. Those customers
 * qualify on usage but are too quiet to approach, and showing them as a
 * greyed-out footnote rather than hiding them is what stops the same name being
 * re-discovered and re-pitched every month.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Button, CopyButton, Empty, ErrorNote, KpiRow, Loading, PageHeader, Pill,
  Prose, ReviewNotice, ScoreBar, Section, aiKitCss, card, fmtDate, getJson,
  pageStyle, postJson,
} from "@/app/admin/components/AiKit";

type Candidate = {
  companyId: string;
  name: string;
  country: string | null;
  currentPlan: string;
  suggestedPlan: string | null;
  pricePerMonth: number;
  userCount: number;
  branchCount: number;
  employeeCount: number;
  invoicesLast30: number;
  accountCount: number;
  itemCount: number;
  ageDays: number;
  daysSinceLogin: number | null;
  fit: number;
  hardBlock: boolean;
  reasons: string[];
};

type Payload = {
  aiConfigured: boolean;
  generatedAt: string;
  candidates: Candidate[];
  parked: Array<{ companyId: string; name: string; daysSinceLogin: number | null }>;
  summary: { candidates: number; hardBlocked: number; parked: number };
};

type Pitch = { companyId: string; name: string; fit: number; reasons: string[]; pitch: string };

export default function UpgradeFinderPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pitches, setPitches] = useState<Record<string, Pitch>>({});

  const load = useCallback(() => {
    setLoading(true);
    getJson<Payload>("/api/admin/upgrade-finder")
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const pitch = useCallback(async (companyId: string) => {
    setBusy(companyId);
    setError(null);
    try {
      const p = await postJson<Pitch>("/api/admin/upgrade-finder", { companyId });
      setPitches((prev) => ({ ...prev, [companyId]: p }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <div style={pageStyle}>
      <style>{aiKitCss}</style>

      <PageHeader
        title="Upgrade Finder"
        subtitle="Customers already using more than their plan allows, or close to it. Seat and branch limits come from the same code the app enforces at signup, so this list cannot promise an upgrade the product does not deliver."
        right={<Button tone="ghost" onClick={load} busy={loading}>Refresh</Button>}
      />

      {error ? <ErrorNote onDismiss={() => setError(null)}>{error}</ErrorNote> : null}

      {loading && !data ? (
        <Loading label="Comparing usage against plan limits…" />
      ) : !data ? (
        <Empty>Could not load upgrade candidates.</Empty>
      ) : (
        <>
          <KpiRow items={[
            { label: "Ready to pitch", value: data.summary.candidates, color: "#34d399", sub: "Engaged and over-using" },
            { label: "At a hard limit", value: data.summary.hardBlocked, color: "#fbbf24", sub: "Plan blocks them today" },
            { label: "Too quiet to ask", value: data.summary.parked, color: "rgba(255,255,255,.45)", sub: "Qualify, but not now" },
          ]} />

          {data.candidates.length === 0 ? (
            <Section>
              <Empty>
                Nobody qualifies right now. That is a real answer, not an empty state — every
                customer either fits inside their plan or is too quiet to approach. This page
                will fill up on its own as usage grows.
              </Empty>
            </Section>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {data.candidates.map((c) => {
                const p = pitches[c.companyId];
                return (
                  <div key={c.companyId} style={card}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      gap: 14, flexWrap: "wrap", marginBottom: 14,
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{c.name}</span>
                          <Pill tone="grey">{c.currentPlan}</Pill>
                          <span style={{ color: "rgba(255,255,255,.25)", fontSize: 13 }}>→</span>
                          <Pill tone="violet">{c.suggestedPlan}</Pill>
                          {c.hardBlock ? <Pill tone="amber">At plan limit</Pill> : null}
                        </div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginTop: 5 }}>
                          {c.country || "—"} · {c.ageDays}d on platform · last seen{" "}
                          {c.daysSinceLogin === null ? "never" : `${c.daysSinceLogin}d ago`} ·
                          currently ${c.pricePerMonth}/mo
                        </div>
                      </div>
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", fontWeight: 700, marginBottom: 5 }}>
                          UPGRADE FIT
                        </div>
                        <ScoreBar value={c.fit} tone={c.fit >= 60 ? "green" : "blue"} />
                      </div>
                    </div>

                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))",
                      gap: 8, marginBottom: 14,
                    }}>
                      {[
                        { k: "Users", v: c.userCount },
                        { k: "Branches", v: c.branchCount },
                        { k: "Employees", v: c.employeeCount },
                        { k: "Invoices 30d", v: c.invoicesLast30 },
                        { k: "Accounts", v: c.accountCount },
                        { k: "Items", v: c.itemCount },
                      ].map((x) => (
                        <div key={x.k} style={{
                          background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)",
                          borderRadius: 10, padding: "8px 11px",
                        }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#e2e8f0" }}>{x.v}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", fontWeight: 600 }}>{x.k}</div>
                        </div>
                      ))}
                    </div>

                    <ul style={{ margin: "0 0 14px", paddingLeft: 18, fontSize: 12.5, color: "rgba(255,255,255,.7)", lineHeight: 1.8 }}>
                      {c.reasons.map((r) => <li key={r}>{r}</li>)}
                    </ul>

                    {p ? (
                      <div style={{
                        background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.22)",
                        borderRadius: 14, padding: "16px 18px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#c4b5fd" }}>PITCH</span>
                          <div style={{ display: "flex", gap: 6 }}>
                            <CopyButton text={p.pitch} />
                            <Button tone="ghost" onClick={() => pitch(c.companyId)} busy={busy === c.companyId}>Redraft</Button>
                          </div>
                        </div>
                        <Prose text={p.pitch} />
                        <ReviewNotice />
                      </div>
                    ) : data.aiConfigured ? (
                      <Button onClick={() => pitch(c.companyId)} busy={busy === c.companyId}>
                        Build the pitch
                      </Button>
                    ) : (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                        Set GROQ_API_KEY or OPENAI_API_KEY to draft pitches here.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data.parked.length > 0 ? (
            <Section title="Qualify on usage, too quiet to approach" style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.8, marginBottom: 12 }}>
                These customers hit the usage bar but have gone quiet. An upgrade ask to someone
                who is drifting is how a renewal becomes a cancellation — deal with the silence
                first, in Churn Radar, and they will reappear above on their own.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {data.parked.map((p) => (
                  <span key={p.companyId} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 999,
                    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)",
                    color: "rgba(255,255,255,.5)",
                  }}>
                    {p.name} · {p.daysSinceLogin === null ? "never logged in" : `${p.daysSinceLogin}d quiet`}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.3)", marginTop: 16, lineHeight: 1.7 }}>
            Computed {fmtDate(data.generatedAt)}. Seat limits read from lib/planLimits.ts; branch
            limits are the numbers on the pricing page (1 / 3 / 10) and are not yet enforced in the
            product, so treat a branch flag as a sales signal rather than a blocked customer.
          </div>
        </>
      )}
    </div>
  );
}
