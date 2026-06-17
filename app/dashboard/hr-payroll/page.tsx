"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { getCurrentUser } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type AttRecord = {
  id: string; employeeId: string; date: string; status: string;
  checkIn?: string | null; checkOut?: string | null;
  employee?: { firstName: string; lastName: string; employeeId: string; department: string };
};
type PayRecord = {
  id: string; monthYear: string; netSalary: number; baseSalary: number;
  paymentStatus: string;
  employee?: { firstName: string; lastName: string; employeeId: string; department: string };
};
type Emp = {
  id: string; employeeId: string; firstName: string; lastName: string;
  department: string; designation: string; salary: number; isActive: boolean;
};

// ─── Semantic colours (theme-aware via CSS vars) ───────────────────────────────
const C = {
  present:  "#22c55e",
  absent:   "#ef4444",
  late:     "#8b5cf6",
  leave:    "#3b82f6",
  halfDay:  "#f97316",
  // these automatically flip in dark mode
  bg:       "var(--app-bg)",
  card:     "var(--card-bg)",
  border:   "var(--border)",
  text:     "var(--text-primary)",
  sub:      "var(--text-muted)",
  surface:  "var(--surface)",
};

const ff = "'Outfit','Inter',sans-serif";

function fmt(n: number) {
  return n.toLocaleString("en-PK");
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, sub, subColor,
}: {
  label: string; value: string | number; icon: string;
  color: string; sub?: string; subColor?: string;
}) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, padding: "20px 22px",
      border: `1px solid ${C.border}`,
      boxShadow: "0 1px 6px rgba(0,0,0,.06)",
      display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.sub, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.5px", lineHeight: 1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: subColor || C.sub, fontWeight: 600, marginTop: 5 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PRESENT:  { label: "Present",  color: "#16a34a", bg: "#dcfce7" },
    ABSENT:   { label: "Absent",   color: "#dc2626", bg: "#fee2e2" },
    LATE:     { label: "Late",     color: "#7c3aed", bg: "#ede9fe" },
    LEAVE:    { label: "On Leave", color: "#2563eb", bg: "#dbeafe" },
    HALF_DAY: { label: "Half Day", color: "#ea580c", bg: "#ffedd5" },
    PAID:     { label: "Paid",     color: "#16a34a", bg: "#dcfce7" },
    PENDING:  { label: "Pending",  color: "#b45309", bg: "#fef3c7" },
    PARTIAL:  { label: "Partial",  color: "#2563eb", bg: "#dbeafe" },
  };
  const m = map[status] || { label: status, color: C.sub, bg: C.bg };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      background: m.bg, color: m.color, fontSize: 11.5, fontWeight: 700,
    }}>
      {m.label}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--card-bg)", border: `1px solid var(--border)`, borderRadius: 8,
      padding: "8px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.15)", fontFamily: ff,
    }}>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6, fontSize: 12 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: p.color, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Today Status Panel ───────────────────────────────────────────────────────
function TodayPanel({ att }: { att: AttRecord[] }) {
  const todayStr = today();
  const todayAtt = att.filter(r => r.date.startsWith(todayStr));
  const counts = {
    PRESENT:  todayAtt.filter(r => r.status === "PRESENT").length,
    ABSENT:   todayAtt.filter(r => r.status === "ABSENT").length,
    LATE:     todayAtt.filter(r => r.status === "LATE").length,
    LEAVE:    todayAtt.filter(r => r.status === "LEAVE").length,
  };
  const entries = [
    { label: "Present",  count: counts.PRESENT,  icon: "✅", color: C.present },
    { label: "Absent",   count: counts.ABSENT,   icon: "❌", color: C.absent },
    { label: "Late",     count: counts.LATE,     icon: "🕐", color: C.late },
    { label: "On Leave", count: counts.LEAVE,    icon: "🌴", color: C.leave },
  ];
  return (
    <div style={{
      background: C.card, borderRadius: 12, padding: 24,
      border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h3 style={{ fontFamily: ff, fontWeight: 700, color: C.text, fontSize: 16, margin: 0 }}>
          Today&apos;s Status
        </h3>
        <span style={{ fontSize: 11.5, color: C.sub }}>
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {entries.map(e => (
          <div key={e.label} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderRadius: 10,
            background: `${e.color}08`, border: `1px solid ${e.color}22`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{e.icon}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{e.label}</span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: e.color }}>{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HrPayrollDashboard() {
  const user = getCurrentUser();
  const [month, setMonth] = useState(currentMonth);
  const [att, setAtt]     = useState<AttRecord[]>([]);
  const [pay, setPay]     = useState<PayRecord[]>([]);
  const [emps, setEmps]   = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);

  const h: Record<string, string> = {
    "x-user-role": user?.role || "",
    "x-user-id":   user?.id   || "",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, pRes, eRes] = await Promise.all([
        fetch(`/api/attendance?month=${month}`, { headers: h }),
        fetch(`/api/payroll?monthYear=${month}`,{ headers: h }),
        fetch(`/api/employees`,                 { headers: h }),
      ]);
      const [aData, pData, eData] = await Promise.all([aRes.json(), pRes.json(), eRes.json()]);
      setAtt(Array.isArray(aData) ? aData : []);
      setPay(Array.isArray(pData) ? pData : []);
      setEmps(Array.isArray(eData) ? eData : []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeEmps    = emps.filter(e => e.isActive).length;
  const todayStr      = today();
  const todayAtt      = att.filter(r => r.date.startsWith(todayStr));
  const presentToday  = todayAtt.filter(r => r.status === "PRESENT").length;
  const absentToday   = todayAtt.filter(r => r.status === "ABSENT").length;
  const lateToday     = todayAtt.filter(r => r.status === "LATE").length;
  const leaveToday    = todayAtt.filter(r => r.status === "LEAVE").length;
  const totalPayroll  = pay.reduce((s, p) => s + p.netSalary, 0);
  const paidPayroll   = pay.filter(p => p.paymentStatus === "PAID").reduce((s, p) => s + p.netSalary, 0);

  // ── Line chart data (group by day) ────────────────────────────────────────
  const dayMap = new Map<string, { Present: number; Absent: number; Late: number; Leave: number }>();
  att.forEach(r => {
    const d = r.date.slice(8, 10); // DD
    const key = `${+d}`;
    if (!dayMap.has(key)) dayMap.set(key, { Present: 0, Absent: 0, Late: 0, Leave: 0 });
    const e = dayMap.get(key)!;
    if (r.status === "PRESENT")  e.Present++;
    if (r.status === "ABSENT")   e.Absent++;
    if (r.status === "LATE")     e.Late++;
    if (r.status === "LEAVE")    e.Leave++;
  });
  const lineData = Array.from(dayMap.entries())
    .sort((a, b) => +a[0] - +b[0])
    .map(([day, v]) => ({ day: `${month.slice(5)}-${day.padStart(2,"0")}`, ...v }));

  // ── Donut chart data ───────────────────────────────────────────────────────
  const total = presentToday + absentToday + lateToday + leaveToday || 1;
  const donutData = [
    { name: "Present",  value: presentToday, color: C.present },
    { name: "Absent",   value: absentToday,  color: C.absent  },
    { name: "Late",     value: lateToday,    color: C.late    },
    { name: "On Leave", value: leaveToday,   color: C.leave   },
  ].filter(d => d.value > 0);

  // ── Department breakdown ───────────────────────────────────────────────────
  const deptMap = new Map<string, number>();
  emps.filter(e => e.isActive).forEach(e => {
    deptMap.set(e.department, (deptMap.get(e.department) || 0) + 1);
  });
  const DEPT_COLORS = ["#6366f1","#22c55e","#f59e0b","#3b82f6","#ec4899","#8b5cf6","#10b981","#f97316"];
  const deptData = Array.from(deptMap.entries()).map(([name, value], i) => ({
    name, value, color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  // ── Recent payroll rows ────────────────────────────────────────────────────
  const recentPay = pay.slice(0, 8);

  // ── Quick links ───────────────────────────────────────────────────────────
  const links = [
    { href: "/dashboard/employees",  label: "Employees",  icon: "👥", color: "#6366f1" },
    { href: "/dashboard/payroll",    label: "Payroll",    icon: "💰", color: "#22c55e" },
    { href: "/dashboard/attendance", label: "Attendance", icon: "📅", color: "#3b82f6" },
    { href: "/dashboard/advance",    label: "Advances",   icon: "💳", color: "#f59e0b" },
  ];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: ff, color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .hr-table tr:hover td{background:#f8fafc!important;}
        .hr-table tr td{transition:background .15s;}
        .quick-link:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1)!important;}
        .quick-link{transition:all .2s!important;}
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: 0, letterSpacing: "-0.5px" }}>
              HR &amp; Payroll Dashboard
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13.5, color: C.sub }}>
              Welcome back, <strong style={{ color: C.text }}>{user?.name || "Admin"}</strong> · {monthLabel(month)}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{
                padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
                fontFamily: ff, fontSize: 13, color: C.text, background: "var(--card-bg)",
                cursor: "pointer",
              }}
            />
            <button
              onClick={load}
              style={{
                width: 38, height: 38, borderRadius: 8, border: `1px solid ${C.border}`,
                background: "var(--card-bg)", cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              }}
              title="Refresh"
            >
              {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> : "⟳"}
            </button>
          </div>
        </div>

        {/* ── Quick Links ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} className="quick-link" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 10,
              background: "var(--card-bg)", border: `1px solid ${C.border}`,
              textDecoration: "none", fontSize: 13, fontWeight: 600, color: C.text,
              boxShadow: "0 1px 4px rgba(0,0,0,.05)",
            }}>
              <span style={{
                width: 30, height: 30, borderRadius: 7,
                background: `${l.color}15`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 16,
              }}>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard
            label="Total Employees"  value={activeEmps}
            icon="👥" color="#6366f1"
            sub={`${emps.length} total on record`}
          />
          <StatCard
            label="Present Today"  value={presentToday}
            icon="✅" color={C.present}
            sub={activeEmps ? `${Math.round(presentToday / activeEmps * 100)}% attendance rate` : "—"}
            subColor={C.present}
          />
          <StatCard
            label="Absent Today"  value={absentToday}
            icon="❌" color={C.absent}
            sub={absentToday > 0 ? `${absentToday} unexcused absences` : "No absences today"}
            subColor={absentToday > 0 ? C.absent : C.sub}
          />
          <StatCard
            label="Late / On Leave"  value={`${lateToday} / ${leaveToday}`}
            icon="🕐" color={C.late}
            sub="Late · On Leave today"
          />
          <StatCard
            label="Net Payroll"  value={`Rs. ${fmt(totalPayroll)}`}
            icon="💰" color="#f59e0b"
            sub={`Paid: Rs. ${fmt(paidPayroll)} · Pending: ${pay.filter(p => p.paymentStatus !== "PAID").length}`}
          />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 24 }}>

          {/* Line Chart */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 24,
            border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15.5, color: C.text }}>Attendance Overview</h3>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.sub }}>{monthLabel(month)}</p>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Present", color: C.present },
                  { label: "Absent",  color: C.absent  },
                  { label: "Late",    color: C.late    },
                  { label: "Leave",   color: C.leave   },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.sub, fontWeight: 500 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: l.color, display: "inline-block" }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {lineData.length === 0 ? (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 13 }}>
                No attendance data for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.sub }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.sub }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="Present" stroke={C.present} strokeWidth={2.5} dot={{ r: 3, fill: C.present }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Absent"  stroke={C.absent}  strokeWidth={2.5} dot={{ r: 3, fill: C.absent  }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Late"    stroke={C.late}    strokeWidth={2.5} dot={{ r: 3, fill: C.late    }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Leave"   stroke={C.leave}   strokeWidth={2.5} dot={{ r: 3, fill: C.leave   }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Donut Chart */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 24,
            border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
          }}>
            <h3 style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15.5, color: C.text }}>Attendance Summary</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: C.sub }}>Today&apos;s breakdown</p>

            {donutData.length === 0 ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 13 }}>
                No attendance marked today
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3} dataKey="value"
                  >
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(val: any, name: any) => [`${val} (${Math.round(val / total * 100)}%)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {[
                { label: "Present",  count: presentToday, color: C.present },
                { label: "Absent",   count: absentToday,  color: C.absent  },
                { label: "Late",     count: lateToday,    color: C.late    },
                { label: "On Leave", count: leaveToday,   color: C.leave   },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>
                    {item.count > 0 ? `${Math.round(item.count / total * 100)}% (${item.count})` : `0 (0%)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Row ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>

          {/* Payroll Table */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 24,
            border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: 15.5, color: C.text }}>Recent Payroll</h3>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.sub }}>{monthLabel(month)} · {pay.length} records</p>
              </div>
              <Link href="/dashboard/payroll" style={{
                fontSize: 12.5, fontWeight: 600, color: "#2563eb", textDecoration: "none",
                padding: "5px 12px", borderRadius: 7, background: "#dbeafe",
              }}>
                View All →
              </Link>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ height: 44, background: "var(--surface)", borderRadius: 8, animation: "pulse 1.5s ease infinite" }} />
                ))}
              </div>
            ) : recentPay.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: C.sub, fontSize: 13 }}>
                No payroll records for {monthLabel(month)}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="hr-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface)" }}>
                      {["Emp ID", "Employee", "Department", "Basic", "Net Salary", "Status"].map(h => (
                        <th key={h} style={{
                          padding: "10px 14px", textAlign: "left", fontSize: 11,
                          fontWeight: 700, color: C.sub, textTransform: "uppercase",
                          letterSpacing: ".05em", whiteSpace: "nowrap",
                          borderBottom: `1px solid ${C.border}`,
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPay.map((p, i) => (
                      <tr key={p.id} style={{ borderBottom: i < recentPay.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <td style={{ padding: "12px 14px", color: C.sub, fontWeight: 600, fontSize: 12 }}>
                          {p.employee?.employeeId || "—"}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 600, color: C.text }}>
                            {p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : "—"}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.sub, fontSize: 12 }}>
                          {p.employee?.department || "—"}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                          Rs. {fmt(p.baseSalary)}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: C.text }}>
                          Rs. {fmt(p.netSalary)}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <StatusBadge status={p.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Today's Status */}
          <TodayPanel att={att} />
        </div>

        {/* ── Department Breakdown ──────────────────────────────────────────── */}
        {deptData.length > 0 && (
          <div style={{
            marginTop: 16, background: C.card, borderRadius: 12, padding: 24,
            border: `1px solid ${C.border}`, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
          }}>
            <h3 style={{ margin: "0 0 18px", fontWeight: 700, fontSize: 15.5, color: C.text }}>
              Employees by Department
            </h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {deptData.map(d => (
                <div key={d.name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 16px", borderRadius: 10,
                  background: `${d.color}10`, border: `1px solid ${d.color}30`,
                  flex: "1 1 140px", minWidth: 140,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: `${d.color}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, color: d.color,
                  }}>
                    {d.name.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
