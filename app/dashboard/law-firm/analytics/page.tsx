"use client";

import { useEffect, useMemo, useState } from "react";
import { LawControlCenter, fetchJson, lawBg, lawBorder, lawFont, lawMuted } from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: lawMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: lawMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

const emptyState: LawControlCenter = {
  summary: { cases: 0, activeCases: 0, hearingsThisWeek: 0, clients: 0, outstanding: 0, paidRevenue: 0, totalBilled: 0, billableHours: 0, unbilledTime: 0 },
  cases: [],
  clients: [],
  invoices: [],
  entries: [],
};

export default function LawAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/law-firm/control-center", emptyState).then(setData);
  }, []);

  const { summary, cases, invoices, entries } = data;
  const caseMix = useMemo(() => {
    const caseTypeMap = new Map<string, number>();
    cases.forEach((legalCase) => caseTypeMap.set(legalCase.type, (caseTypeMap.get(legalCase.type) || 0) + 1));
    return [...caseTypeMap.entries()].sort((a, b) => b[1] - a[1]);
  }, [cases]);
  const lawyerLoad = useMemo(() => {
    const lawyerMap = new Map<string, number>();
    entries.forEach((entry) => lawyerMap.set(entry.lawyer, (lawyerMap.get(entry.lawyer) || 0) + entry.hours));
    return [...lawyerMap.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: lawFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#fdba74", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Law Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Practice mix, fees, aur lawyer load</h1>
        <p style={{ margin: 0, fontSize: 14, color: lawMuted, maxWidth: 760 }}>
          Is board se legal practice ko pata chalta hai ke kis type ke matters zyada hain, fee realization kaisi hai, aur kaun se lawyers sabse zyada billable load carry kar rahe hain.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Total Billed" value={`Rs. ${summary.totalBilled.toLocaleString()}`} note="All legal invoices" color="#60a5fa" />
        <Metric title="Collected" value={`Rs. ${summary.paidRevenue.toLocaleString()}`} note="Paid invoices only" color="#34d399" />
        <Metric title="Outstanding" value={`Rs. ${summary.outstanding.toLocaleString()}`} note="Client receivables" color="#f87171" />
        <Metric title="Billable Hours" value={`${summary.billableHours}h`} note={`${entries.length} time entries logged`} color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Case Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {caseMix.length === 0 ? (
              <div style={{ color: lawMuted, fontSize: 13 }}>Case mix show karne ke liye matters add karein.</div>
            ) : caseMix.map(([type, count]) => {
              const pct = cases.length ? Math.max(10, Math.round((count / cases.length) * 100)) : 10;
              return (
                <div key={type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{type}</span>
                    <span style={{ fontSize: 12, color: lawMuted }}>{count} matters</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#92400e,#f59e0b)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: lawBg, border: `1px solid ${lawBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Lawyer Load</div>
          <div style={{ display: "grid", gap: 10 }}>
            {lawyerLoad.length === 0 ? (
              <div style={{ color: lawMuted, fontSize: 13 }}>Lawyer load show karne ke liye time entries log karein.</div>
            ) : lawyerLoad.map(([lawyer, hours]) => (
              <div key={lawyer} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{lawyer}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{hours}h</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
