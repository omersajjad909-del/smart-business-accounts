"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Slice = { label: string; count: number };
type Daily = { date: string; count: number };

type SignupData = {
  total: number;
  referralSources: Slice[];
  teamSizes: Slice[];
  plans: Slice[];
  businessTypes: Slice[];
  signupsByDay: Daily[];
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminSignupAnalyticsPage() {
  const [data, setData] = useState<SignupData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/signup-analytics", { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const maxDaily = data ? Math.max(...data.signupsByDay.map(d => d.count), 1) : 1;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Signup Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Recent signup activity, referral sources, team sizes, plans, and business type breakdown.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading…</div>
      ) : !data ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,.3)" }}>No data available</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Signups",       val: data.total,                        color: "#818cf8" },
              { label: "Last 30 Days",        val: data.signupsByDay.reduce((s, d) => s + d.count, 0), color: "#34d399" },
              { label: "Unique Referral Sources", val: data.referralSources.length,   color: "#f472b6" },
              { label: "Business Types Used", val: data.businessTypes.length,         color: "#fbbf24" },
            ].map(k => (
              <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 22, marginBottom: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Signups by Day (last 30)</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100, overflowX: "auto" }}>
              {data.signupsByDay.map(d => {
                const pct = (d.count / maxDaily) * 100;
                return (
                  <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 32 }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>{d.count}</span>
                    <div style={{ width: 22, height: `${Math.max(pct * 0.6, 4)}px`, background: "linear-gradient(180deg,#6366f1,#4f46e5)", borderRadius: "3px 3px 0 0", transition: "height .4s" }} />
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,.3)", whiteSpace: "nowrap" }}>{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16 }}>
            <BreakdownCard title="Referral Sources" items={data.referralSources} color="#818cf8" />
            <BreakdownCard title="Team Sizes"       items={data.teamSizes}       color="#f472b6" />
            <BreakdownCard title="Plans"            items={data.plans}           color="#34d399" />
            <BreakdownCard title="Top Business Types" items={data.businessTypes} color="#fbbf24" />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownCard({ title, items, color }: { title: string; items: Slice[]; color: string }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const max = Math.max(...items.map(i => i.count), 1);
  return (
    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ padding: 14, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 12 }}>No data</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.slice(0, 10).map(i => (
            <div key={i.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{i.label}</span>
                <span style={{ color: "rgba(255,255,255,.5)" }}>{i.count} ({total > 0 ? ((i.count / total) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${(i.count / max) * 100}%`, height: "100%", background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const css = ``;
