"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdInsight = { spend: number; impressions: number; reach: number; clicks: number; ctr: number; cpc: number };
type Ad = { id: string; name: string; status: string; insights: AdInsight | null };
type AdSet = { id: string; name: string; status: string; dailyBudget: number | null; insights: AdInsight | null; ads: Ad[] };
type Campaign = { id: string; name: string; status: string; objective: string; insights: AdInsight | null; adSets: AdSet[] };

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_30d", label: "Last 30 days" },
];

export default function AdsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("last_30d");
  const [openCampaign, setOpenCampaign] = useState<string | null>(null);
  const [openAdSet, setOpenAdSet] = useState<string | null>(null);

  const headers = () => ({ "Content-Type": "application/json", "x-user-role": "ADMIN" });

  function load() {
    setLoading(true);
    setError("");
    fetch(`/api/admin/ads?range=${range}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setCampaigns(d.campaigns || []);
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [range]);

  const totals = campaigns.reduce(
    (acc, c) => {
      if (c.insights) {
        acc.spend += c.insights.spend;
        acc.impressions += c.insights.impressions;
        acc.clicks += c.insights.clicks;
      }
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0 },
  );
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const money = (v: number) => `$${v.toFixed(2)}`;
  const num = (v: number) => v.toLocaleString("en-US");

  const s = {
    page: { minHeight: "100vh", background: "var(--dk-070b14, #070b14)", color: "var(--ink-solid, white)", fontFamily: "'Outfit','DM Sans',sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid rgba(var(--ink),.07)", background: "rgba(var(--ink),.02)", flexWrap: "wrap" as const, gap: 12 },
    content: { padding: "28px 28px", maxWidth: 1100, margin: "0 auto" },
    card: { borderRadius: 16, background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.07)", padding: "20px 24px", marginBottom: 16 },
    label: { fontSize: 11, fontWeight: 700, color: "rgba(var(--ink),var(--ta-40, .4))", textTransform: "uppercase" as const, letterSpacing: ".05em" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 16, marginBottom: 20 },
    statCard: { borderRadius: 14, background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.07)", padding: "16px 18px" },
    pill: (color: string) => ({ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `${color}22`, color }),
    rangeBtn: (active: boolean) => ({
      padding: "8px 14px", borderRadius: 9, border: "1px solid " + (active ? "#6366f1" : "rgba(var(--ink),.1)"), cursor: "pointer",
      fontFamily: "inherit", fontSize: 12, fontWeight: 700,
      background: active ? "rgba(99,102,241,.15)" : "transparent", color: active ? "var(--tx-a5b4fc, #a5b4fc)" : "rgba(var(--ink),var(--ta-50, .5))",
    }),
  };

  const statusColor = (status: string) => (status === "ACTIVE" ? "#22c55e" : status === "PAUSED" ? "#f59e0b" : "rgba(var(--ink),.4)");

  function InsightRow({ insights }: { insights: AdInsight | null }) {
    if (!insights) return <span style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-30, .3))" }}>No data yet</span>;
    return (
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" as const, fontSize: 12, color: "rgba(var(--ink),var(--ta-60, .6))" }}>
        <span><b style={{ color: "var(--ink-solid, white)" }}>{money(insights.spend)}</b> spend</span>
        <span><b style={{ color: "var(--ink-solid, white)" }}>{num(insights.impressions)}</b> impressions</span>
        <span><b style={{ color: "var(--ink-solid, white)" }}>{num(insights.clicks)}</b> clicks</span>
        <span><b style={{ color: "var(--ink-solid, white)" }}>{insights.ctr.toFixed(2)}%</b> CTR</span>
        <span><b style={{ color: "var(--ink-solid, white)" }}>{money(insights.cpc)}</b> CPC</span>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/admin")} style={{ background: "none", border: "1px solid rgba(var(--ink),.12)", color: "rgba(var(--ink),var(--ta-50, .5))", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
            ← Admin
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-solid, white)" }}>Meta Ads</div>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),var(--ta-40, .4))" }}>Live campaign performance — no need to open Ads Manager</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {RANGES.map(r => (
            <button key={r.id} style={s.rangeBtn(range === r.id)} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
          <button style={s.rangeBtn(false)} onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div style={s.content}>
        {error && (
          <div style={{ ...s.card, borderColor: "rgba(239,68,68,.3)", color: "var(--tx-fca5a5, #fca5a5)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: "rgba(var(--ink),var(--ta-40, .4))", fontSize: 13, padding: 40, textAlign: "center" as const }}>Loading…</div>
        ) : (
          <>
            <div style={s.statGrid}>
              <div style={s.statCard}>
                <div style={s.label}>Total spend</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{money(totals.spend)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.label}>Impressions</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{num(totals.impressions)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.label}>Clicks</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{num(totals.clicks)}</div>
              </div>
              <div style={s.statCard}>
                <div style={s.label}>Avg. CTR</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{avgCtr.toFixed(2)}%</div>
              </div>
            </div>

            {campaigns.length === 0 && !error && (
              <div style={{ ...s.card, textAlign: "center" as const, color: "rgba(var(--ink),var(--ta-40, .4))" }}>No campaigns found.</div>
            )}

            {campaigns.map(c => (
              <div key={c.id} style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpenCampaign(openCampaign === c.id ? null : c.id)}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                      {c.name}
                      <span style={s.pill(statusColor(c.status))}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(var(--ink),var(--ta-35, .35))", marginTop: 2 }}>{c.objective} · {c.adSets.length} ad set{c.adSets.length === 1 ? "" : "s"}</div>
                  </div>
                  <span style={{ fontSize: 18, color: "rgba(var(--ink),var(--ta-40, .4))" }}>{openCampaign === c.id ? "−" : "+"}</span>
                </div>
                <div style={{ marginTop: 10 }}><InsightRow insights={c.insights} /></div>

                {openCampaign === c.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(var(--ink),.07)" }}>
                    {c.adSets.map(as => (
                      <div key={as.id} style={{ marginBottom: 14, paddingLeft: 12, borderLeft: "2px solid rgba(99,102,241,.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpenAdSet(openAdSet === as.id ? null : as.id)}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                              {as.name}
                              <span style={s.pill(statusColor(as.status))}>{as.status}</span>
                              {as.dailyBudget != null && <span style={{ fontSize: 11, color: "rgba(var(--ink),var(--ta-40, .4))" }}>${as.dailyBudget.toFixed(2)}/day</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, color: "rgba(var(--ink),var(--ta-30, .3))" }}>{openAdSet === as.id ? "−" : "+"}</span>
                        </div>
                        <div style={{ marginTop: 6 }}><InsightRow insights={as.insights} /></div>

                        {openAdSet === as.id && (
                          <div style={{ marginTop: 10 }}>
                            {as.ads.map(a => (
                              <div key={a.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(var(--ink),.05)" }}>
                                <div style={{ fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  {a.name}
                                  <span style={s.pill(statusColor(a.status))}>{a.status}</span>
                                </div>
                                <InsightRow insights={a.insights} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
