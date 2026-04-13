"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#818cf8";

interface AttendanceRecord {
  id: string; employeeId: string; date: string; status: string;
  checkIn?: string; checkOut?: string; remarks?: string;
  employee: { firstName: string; lastName: string };
}
interface Employee { id: string; firstName: string; lastName: string; department: string; }

const SC: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PRESENT:  { bg: "rgba(52,211,153,.15)",  text: "#34d399", border: "rgba(52,211,153,.3)",  label: "Present"  },
  ABSENT:   { bg: "rgba(248,113,113,.15)", text: "#f87171", border: "rgba(248,113,113,.3)", label: "Absent"   },
  HOLIDAY:  { bg: "rgba(167,139,250,.15)", text: "#a78bfa", border: "rgba(167,139,250,.3)", label: "Holiday"  },
  LEAVE:    { bg: "rgba(251,191,36,.15)",  text: "#fbbf24", border: "rgba(251,191,36,.3)",  label: "Leave"    },
  HALF_DAY: { bg: "rgba(251,191,36,.15)",  text: "#fbbf24", border: "rgba(251,191,36,.3)",  label: "Half Day" },
  LATE:     { bg: "rgba(99,102,241,.15)",  text: "#818cf8", border: "rgba(99,102,241,.3)",  label: "Late"     },
};

const DEPT_COLORS: Record<string, string> = {
  ACCOUNTS:"#34d399", HR:"#818cf8", SALES:"#f97316", IT:"#38bdf8",
  OPERATIONS:"#fbbf24", SECURITY:"#f87171", GODOWN:"#a78bfa", GATE:"#6ee7b7",
};

function initials(e: Employee) {
  return `${e.firstName[0] ?? ""}${e.lastName[0] ?? ""}`.toUpperCase();
}

function avatarColor(name: string) {
  const colors = ["#818cf8","#34d399","#f97316","#38bdf8","#fbbf24","#f87171","#a78bfa"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

function authH() {
  const u = getCurrentUser();
  return {
    ...(u?.role      ? { "x-user-role":  u.role }      : {}),
    ...(u?.id        ? { "x-user-id":    u.id }        : {}),
    ...(u?.companyId ? { "x-company-id": u.companyId } : {}),
  };
}

export default function AttendancePage() {
  const [employees,          setEmployees]          = useState<Employee[]>([]);
  const [records,            setRecords]            = useState<AttendanceRecord[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [month,              setMonth]              = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate,       setSelectedDate]       = useState<string | null>(null);
  const [formData,           setFormData]           = useState({ status: "PRESENT", checkIn: "", checkOut: "", remarks: "" });
  const [search,             setSearch]             = useState("");

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => {
    if (selectedEmployeeId) fetchAttendance(selectedEmployeeId, month);
    else setRecords([]);
  }, [selectedEmployeeId, month]);

  async function fetchEmployees() {
    try {
      const r = await fetch("/api/employees", { headers: authH() });
      const d = await r.json();
      setEmployees(Array.isArray(d) ? d : []);
    } catch { setEmployees([]); }
  }

  async function fetchAttendance(empId: string, m: string) {
    setLoading(true);
    try {
      const r = await fetch(`/api/attendance?month=${m}&employeeId=${empId}`, { headers: authH() });
      const d = await r.json();
      setRecords(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }

  function toISO(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }

  function fmtTime(s?: string | null) {
    if (!s) return "--";
    const d = new Date(s); if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function calDays() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const days: (Date | null)[] = [];
    for (let i = 0; i < date.getDay(); i++) days.push(null);
    while (date.getMonth() === m - 1) { days.push(new Date(date)); date.setDate(date.getDate() + 1); }
    return days;
  }

  function recFor(date: Date) { return records.find(r => r.date.startsWith(toISO(date))); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || !selectedEmployeeId || !selectedDate) return;
    setLoading(true);
    try {
      const existing = recFor(new Date(selectedDate));
      const r = await fetch(existing ? `/api/attendance?id=${existing.id}` : "/api/attendance", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-user-role": user.role||"", "x-user-id": user.id||"", ...(user.companyId?{"x-company-id":user.companyId}:{}) },
        body: JSON.stringify({ employeeId: selectedEmployeeId, date: selectedDate, ...formData }),
      });
      if (!r.ok) { const err = await r.json(); toast.error(err.error || "Failed"); }
      else { fetchAttendance(selectedEmployeeId, month); setSelectedDate(null); }
    } catch { toast.error("Error saving"); } finally { setLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this record?")) return;
    const user = getCurrentUser(); if (!user) return;
    await fetch(`/api/attendance?id=${id}`, { method: "DELETE", headers: authH() });
    if (selectedEmployeeId) fetchAttendance(selectedEmployeeId, month);
  }

  const days     = calDays();
  const sel      = employees.find(e => e.id === selectedEmployeeId);
  const weekDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const isSun    = (d: Date) => d.getDay() === 0;
  const validD   = days.filter((d): d is Date => d !== null);
  const sunHols  = validD.filter(d => isSun(d) && !recFor(d)).length;

  const stats = {
    present: records.filter(r => r.status==="PRESENT"||r.status==="LATE").length,
    absent:  records.filter(r => r.status==="ABSENT").length,
    leave:   records.filter(r => r.status==="LEAVE"||r.status==="HALF_DAY").length,
    holiday: records.filter(r => r.status==="HOLIDAY").length + sunHols,
  };

  const filtered = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  // month label
  const [my, mm] = month.split("-").map(Number);
  const monthLabel = new Date(my, mm - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1px solid var(--border)", background: "var(--app-bg)",
    color: "var(--text-primary)", fontSize: 13, fontFamily: ff,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, overflow: "hidden", background: "var(--app-bg)", fontFamily: ff }}>

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "var(--panel-bg)", borderRight: "1px solid var(--border)" }}>

        {/* Sidebar header */}
        <div style={{ padding: "20px 16px 14px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>
            Attendance
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "var(--text-muted)" }}>🔍</span>
            <input
              placeholder="Search employee…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inp, paddingLeft: 30, fontSize: 12, padding: "8px 8px 8px 30px" }}
            />
          </div>
        </div>

        {/* Employee list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                No employees found
              </div>
              <a href="/dashboard/employees" style={{ fontSize: 11, color: ACCENT, textDecoration: "none" }}>
                + Add employees →
              </a>
            </div>
          ) : filtered.map(emp => {
            const active = selectedEmployeeId === emp.id;
            const color  = avatarColor(emp.firstName + emp.lastName);
            const dColor = DEPT_COLORS[emp.department] || "#818cf8";
            return (
              <div key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)}
                style={{ padding: "11px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                  background: active ? `${ACCENT}14` : "transparent",
                  borderLeft: `3px solid ${active ? ACCENT : "transparent"}`,
                  borderBottom: "1px solid var(--border)", transition: "all .15s" }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: `${color}22`, border: `2px solid ${color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color }}>
                  {initials(emp)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {emp.firstName} {emp.lastName}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: dColor, marginTop: 2,
                    textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {emp.department}
                  </div>
                </div>
                {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>

        {/* Sidebar footer count */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)",
          fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          {employees.length} employee{employees.length !== 1 ? "s" : ""} total
        </div>
      </div>

      {/* ── MAIN ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

        {/* Top bar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--panel-bg)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {sel && (
              <div style={{ width: 40, height: 40, borderRadius: "50%",
                background: `${avatarColor(sel.firstName+sel.lastName)}22`,
                border: `2px solid ${avatarColor(sel.firstName+sel.lastName)}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: avatarColor(sel.firstName+sel.lastName) }}>
                {initials(sel)}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                {sel ? `${sel.firstName} ${sel.lastName}` : "Attendance Calendar"}
              </h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                {sel ? `${sel.department} • Click any date to mark attendance` : "Select an employee from the sidebar to begin"}
              </p>
            </div>
          </div>

          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => {
                const d = new Date(my, mm - 2, 1);
                setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
              }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--app-bg)", color: "var(--text-primary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              ‹
            </button>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
              minWidth: 130, textAlign: "center" }}>
              {monthLabel}
            </div>
            <button onClick={() => {
                const d = new Date(my, mm, 1);
                setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
              }}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--app-bg)", color: "var(--text-primary)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              ›
            </button>
          </div>
        </div>

        {!sel ? (
          /* Empty state */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 12, padding: 40 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%",
              background: `${ACCENT}12`, border: `2px solid ${ACCENT}25`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              📅
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px" }}>
                No employee selected
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Select an employee from the sidebar to view and manage their attendance
              </p>
            </div>
            {employees.length === 0 && (
              <a href="/dashboard/employees"
                style={{ padding: "10px 20px", borderRadius: 10, background: ACCENT, color: "white",
                  textDecoration: "none", fontSize: 13, fontWeight: 700, marginTop: 8 }}>
                + Add Employees First
              </a>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, padding: "16px 24px 0", flexShrink: 0 }}>
              {[
                { label: "Present",  val: stats.present, color: "#34d399", bg: "rgba(52,211,153,.08)",  bd: "rgba(52,211,153,.2)"  },
                { label: "Absent",   val: stats.absent,  color: "#f87171", bg: "rgba(248,113,113,.08)", bd: "rgba(248,113,113,.2)" },
                { label: "Leave",    val: stats.leave,   color: "#fbbf24", bg: "rgba(251,191,36,.08)",  bd: "rgba(251,191,36,.2)"  },
                { label: "Holiday",  val: stats.holiday, color: "#a78bfa", bg: "rgba(167,139,250,.08)", bd: "rgba(167,139,250,.2)" },
                { label: "Total",    val: stats.present+stats.absent+stats.leave+stats.holiday,
                  color: ACCENT, bg: `${ACCENT}10`, bd: `${ACCENT}30` },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 12, background: s.bg, border: `1px solid ${s.bd}`, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div style={{ padding: "16px 24px 24px" }}>
              {loading ? (
                <div style={{ paddingTop: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  Loading…
                </div>
              ) : (
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                  {/* Week headers */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "var(--panel-bg)" }}>
                    {weekDays.map(d => (
                      <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11,
                        fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
                        letterSpacing: ".05em", borderBottom: "1px solid var(--border)" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                    {days.map((date, i) => {
                      if (!date) return (
                        <div key={i} style={{ minHeight: 90, background: "var(--panel-bg)",
                          borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                          opacity: .4 }} />
                      );

                      const rec    = recFor(date);
                      const ds     = toISO(date);
                      const today  = ds === toISO(new Date());
                      const isSel  = selectedDate === ds;
                      const sunHol = !rec && isSun(date);
                      const sc     = rec ? (SC[rec.status] || SC.PRESENT) : null;

                      return (
                        <div key={i} onClick={() => {
                            setSelectedDate(ds);
                            setFormData(rec ? {
                              status:   rec.status,
                              checkIn:  rec.checkIn  ? new Date(rec.checkIn).toTimeString().slice(0,5)  : "",
                              checkOut: rec.checkOut ? new Date(rec.checkOut).toTimeString().slice(0,5) : "",
                              remarks:  rec.remarks || "",
                            } : { status: isSun(date) ? "HOLIDAY" : "PRESENT", checkIn: "", checkOut: "", remarks: "" });
                          }}
                          style={{ minHeight: 90, padding: 8, cursor: "pointer",
                            display: "flex", flexDirection: "column",
                            background: isSel ? `${ACCENT}14` : sunHol ? "rgba(167,139,250,.04)" : "var(--app-bg)",
                            borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                            outline: today ? `2px solid ${ACCENT}` : "none", outlineOffset: "-2px",
                            transition: "background .12s",
                            position: "relative" }}>

                          {/* Date number */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: today ? 800 : 600,
                              color: today ? ACCENT : "var(--text-primary)",
                              background: today ? `${ACCENT}18` : "transparent",
                              width: 24, height: 24, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {date.getDate()}
                            </span>
                            {rec && (
                              <button onClick={e => { e.stopPropagation(); handleDelete(rec.id); }}
                                style={{ width: 16, height: 16, borderRadius: 4, border: "none",
                                  background: "rgba(248,113,113,.15)", color: "#f87171",
                                  cursor: "pointer", fontSize: 9, display: "flex",
                                  alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Status badge */}
                          {rec && sc ? (
                            <div>
                              <span style={{ display: "block", textAlign: "center", fontSize: 9, fontWeight: 800,
                                padding: "3px 4px", borderRadius: 6, background: sc.bg, color: sc.text,
                                border: `1px solid ${sc.border}`, letterSpacing: ".04em" }}>
                                {sc.label.toUpperCase()}
                              </span>
                              {(rec.checkIn || rec.checkOut) && (
                                <div style={{ fontSize: 8, textAlign: "center", color: "var(--text-muted)",
                                  marginTop: 3, fontFamily: "monospace" }}>
                                  {fmtTime(rec.checkIn)} – {fmtTime(rec.checkOut)}
                                </div>
                              )}
                            </div>
                          ) : sunHol ? (
                            <span style={{ display: "block", textAlign: "center", fontSize: 9, fontWeight: 700,
                              padding: "3px 4px", borderRadius: 6,
                              background: "rgba(167,139,250,.08)", color: "rgba(167,139,250,.5)",
                              border: "1px solid rgba(167,139,250,.15)" }}>
                              HOLIDAY
                            </span>
                          ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 16, color: "var(--border)" }}>+</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ────────────────────────────────────── */}
      {selectedDate && selectedEmployeeId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.55)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)",
            borderRadius: 20, width: "100%", maxWidth: 400, overflow: "hidden", fontFamily: ff,
            boxShadow: "0 24px 60px rgba(0,0,0,.3)" }}>

            {/* Modal header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: `${ACCENT}0a` }}>
              <div>
                <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: 15 }}>
                  Mark Attendance
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {fmtDate(selectedDate + "T12:00:00")} · {sel?.firstName} {sel?.lastName}
                </div>
              </div>
              <button onClick={() => setSelectedDate(null)}
                style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--app-bg)", color: "var(--text-muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Status pills */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                  Status
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {(["PRESENT","ABSENT","LEAVE","HALF_DAY","LATE","HOLIDAY"] as const).map(s => {
                    const c = SC[s]; const active = formData.status === s;
                    return (
                      <button key={s} type="button" onClick={() => setFormData(p => ({ ...p, status: s }))}
                        style={{ padding: "8px 4px", borderRadius: 10, cursor: "pointer", fontFamily: ff,
                          border: `1.5px solid ${active ? c.text : "var(--border)"}`,
                          background: active ? c.bg : "transparent",
                          color: active ? c.text : "var(--text-muted)",
                          fontSize: 11, fontWeight: 700, transition: "all .15s" }}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Check in / out */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {([["Check In","checkIn"],["Check Out","checkOut"]] as const).map(([label, key]) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
                    <input type="time" value={formData[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--border)",
                        background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 13,
                        fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Remarks */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Remarks</div>
                <input type="text" placeholder="Optional note…" value={formData.remarks}
                  onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
                  style={{ width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 13,
                    fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
              </div>

              <button type="submit" disabled={loading}
                style={{ padding: "12px", borderRadius: 12, border: "none", fontFamily: ff,
                  background: loading ? `${ACCENT}55` : ACCENT, color: "white",
                  fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
                  transition: "all .2s" }}>
                {loading ? "Saving…" : "Save Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
