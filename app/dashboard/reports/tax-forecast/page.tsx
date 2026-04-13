"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ff = "'Outfit','Inter',sans-serif";
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

interface MonthRow { month: string; taxableRevenue: number; estimatedTax: number; paidTax: number; outstanding: number; }
interface Summary { taxType: string; ytdLiability: number; ytdPaid: number; remaining: number; nextDueDate: string; }

export default function TaxForecastPage() {
  const user = getCurrentUser();
  const [months, setMonths]   = useState<MonthRow[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const cur = "Rs";

  const h = (): Record<string, string> => ({ "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "" });
  useEffect(() => { setLoading(true); fetch("/api/reports/tax-forecast", { headers: h() }).then(r => r.ok ? r.json() : {}).then(d => { setMonths(d.months || []); setSummary(d.summary || []); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const totalLiability = summary.reduce((s, r) => s + r.ytdLiability, 0);
  const totalPaid      = summary.reduce((s, r) => s + r.ytdPaid, 0);
  const totalRemaining = summary.reduce((s, r) => s + r.remaining, 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Tax Liability Forecast</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Estimated taxes owed — plan your cash flow for tax payments</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "YTD Tax Liability",  value: `${cur} ${fmt(totalLiability)}`, color: "#818cf8", bg: "rgba(129,140,248,.07)", border: "rgba(129,140,248,.2)" },
          { label: "Tax Paid",           value: `${cur} ${fmt(totalPaid)}`,       color: "#34d399", bg: "rgba(52,211,153,.07)",  border: "rgba(52,211,153,.2)" },
          { label: "Still Owed",         value: `${cur} ${fmt(totalRemaining)}`,  color: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.2)" },
        ].map((c, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: c.bg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {months.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px 8px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 14 }}>MONTHLY TAX TREND</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={months} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: ff }} axisLine={false} tickLine={false} tickFormatter={v => `${cur} ${fmt(v)}`} width={90} />
              <Tooltip formatter={(v: number, name: string) => [`${cur} ${fmt(v)}`, name === "estimatedTax" ? "Estimated" : "Paid"]} contentStyle={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: ff }} />
              <Legend formatter={v => v === "estimatedTax" ? "Estimated Tax" : "Paid Tax"} wrapperStyle={{ fontFamily: ff, fontSize: 12 }} />
              <Bar dataKey="estimatedTax" fill="#818cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="paidTax" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {summary.length > 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700 }}>Tax Type Breakdown</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Tax Type", "YTD Liability", "Paid", "Remaining", "Next Due"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: i > 0 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
              : summary.map((r, i) => (
                <tr key={i} style={{ borderBottom: i < summary.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600 }}>{r.taxType}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13 }}>{cur} {fmt(r.ytdLiability)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, color: "#34d399" }}>{cur} {fmt(r.ytdPaid)}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 13, fontWeight: 700, color: r.remaining > 0 ? "#f87171" : "#34d399" }}>{r.remaining > 0 ? `${cur} ${fmt(r.remaining)}` : "✓ Paid"}</td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>{r.nextDueDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && summary.length === 0 && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          No tax data — configure tax rates and apply them to invoices
        </div>
      )}
    </div>
  );
}
