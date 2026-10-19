"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const BORDER = "var(--border, rgba(var(--ink),.1))";
const MUTED = "var(--text-muted, rgba(var(--ink),.5))";
const PANEL = "var(--panel-bg, rgba(var(--ink),.03))";

type Task = {
  id: string; side: "COLLECT" | "PAY"; party: string; invoiceNo: string;
  billDate: string; dueDate: string; amount: number; balance: number;
  daysOverdue: number; daysLeft: number; status: "overdue" | "today" | "soon" | "upcoming";
};

const STATUS: Record<Task["status"], { label: string; color: string; bg: string }> = {
  overdue:  { label: "Overdue",   color: "#dc2626", bg: "rgba(248,113,113,.12)" },
  today:    { label: "Due today", color: "#d97706", bg: "rgba(245,158,11,.14)" },
  soon:     { label: "Next 7 days", color: "#b45309", bg: "rgba(245,158,11,.08)" },
  upcoming: { label: "Upcoming",  color: "#0d9488", bg: "rgba(20,184,166,.10)" },
};

const dmy = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; };

export default function TasksPage() {
  const user = getCurrentUser() as { id?: string; role?: string; companyId?: string } | null;
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [currency, setCurrency] = useState("PKR");
  const [error, setError] = useState("");
  const [side, setSide] = useState<"ALL" | "COLLECT" | "PAY">("ALL");
  const [status, setStatus] = useState<"ALL" | Task["status"]>("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard/tasks", {
          cache: "no-store",
          headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" },
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load tasks");
        setTasks(d.tasks);
        setCurrency(d.currency);
      } catch (e: any) {
        setError(e.message || "Failed to load tasks");
        setTasks([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (v: number) => `${currency} ${Math.round(v).toLocaleString("en-US")}`;

  const totals = useMemo(() => {
    const t = tasks || [];
    const sum = (f: (x: Task) => boolean) => t.filter(f).reduce((s, x) => s + x.balance, 0);
    return {
      overdueCollect: sum((x) => x.side === "COLLECT" && x.status === "overdue"),
      totalCollect: sum((x) => x.side === "COLLECT"),
      overduePay: sum((x) => x.side === "PAY" && x.status === "overdue"),
      duePay7: sum((x) => x.side === "PAY" && (x.status === "today" || x.status === "soon")),
      totalPay: sum((x) => x.side === "PAY"),
    };
  }, [tasks]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (tasks || []).filter((t) =>
      (side === "ALL" || t.side === side) &&
      (status === "ALL" || t.status === status) &&
      (!needle || t.party.toLowerCase().includes(needle) || t.invoiceNo.toLowerCase().includes(needle)),
    );
  }, [tasks, side, status, q]);

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff,
    border: `1px solid ${active ? "#d97706" : BORDER}`, background: active ? "rgba(245,158,11,.14)" : "transparent",
    color: active ? "#b45309" : "inherit",
  });

  const stat = (label: string, value: number, sub: string, color: string) => (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, margin: "4px 0 2px" }}>{money(value)}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: ff, color: "var(--text-primary, inherit)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Upcoming Tasks</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: MUTED }}>
            Every unpaid bill you need to collect or pay, soonest due date first.
          </p>
        </div>
        <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "#b45309", textDecoration: "none" }}>← Back to dashboard</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginBottom: 18 }}>
        {stat("Overdue to collect", totals.overdueCollect, `of ${money(totals.totalCollect)} receivable`, "#dc2626")}
        {stat("Overdue to pay", totals.overduePay, `of ${money(totals.totalPay)} payable`, "#dc2626")}
        {stat("Due to pay (7 days)", totals.duePay7, "today and the next 7 days", "#b45309")}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {([["ALL", "All"], ["COLLECT", "To collect"], ["PAY", "To pay"]] as const).map(([k, l]) => (
          <button key={k} style={chip(side === k)} onClick={() => setSide(k)}>{l}</button>
        ))}
        <span style={{ width: 1, height: 22, background: BORDER, margin: "0 4px" }} />
        {([["ALL", "Any status"], ["overdue", "Overdue"], ["today", "Due today"], ["soon", "Next 7 days"], ["upcoming", "Upcoming"]] as const).map(([k, l]) => (
          <button key={k} style={chip(status === k)} onClick={() => setStatus(k)}>{l}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search party or invoice no."
          style={{ marginLeft: "auto", minWidth: 220, padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(var(--ink),.05)", color: "inherit", fontFamily: ff, fontSize: 13, outline: "none" }} />
      </div>

      {tasks === null ? (
        <div style={{ padding: 32, color: MUTED }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: 16, borderRadius: 10, background: "rgba(248,113,113,.1)", color: "#dc2626" }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: MUTED }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          {tasks.length === 0 ? "All caught up! No unpaid bills." : "No tasks match these filters."}
        </div>
      ) : (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: PANEL }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {["Type", "Party", "Invoice", "Bill date", "Due date", "Status", "Balance", ""].map((h, i) => (
                    <th key={i} style={{ padding: "11px 14px", borderBottom: `1px solid ${BORDER}`, textAlign: h === "Balance" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const s = STATUS[t.status];
                  const collect = t.side === "COLLECT";
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: collect ? "#0d9488" : "#b45309" }}>{collect ? "Collect" : "Pay"}</td>
                      <td style={{ padding: "11px 14px", fontWeight: 600 }}>{t.party}</td>
                      <td style={{ padding: "11px 14px", color: MUTED }}>{t.invoiceNo}</td>
                      <td style={{ padding: "11px 14px", color: MUTED }}>{dmy(t.billDate)}</td>
                      <td style={{ padding: "11px 14px" }}>{dmy(t.dueDate)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
                          {t.status === "overdue" ? `${t.daysOverdue}d overdue` : t.status === "today" ? s.label : `in ${t.daysLeft}d`}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800 }}>
                        {money(t.balance)}
                        {t.balance < t.amount - 0.5 && <div style={{ fontSize: 11, fontWeight: 500, color: MUTED }}>of {money(t.amount)}</div>}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link href={collect ? "/dashboard/crv" : "/dashboard/cpv"} style={{ fontSize: 12, fontWeight: 700, color: "#b45309", textDecoration: "none" }}>
                          {collect ? "Receive payment →" : "Make payment →"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 14px", fontSize: 12, color: MUTED }}>{rows.length} of {tasks.length} bills</div>
        </div>
      )}
    </div>
  );
}
