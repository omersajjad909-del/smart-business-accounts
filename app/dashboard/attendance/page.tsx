import { fmtDate } from "@/lib/dateUtils";
"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
  employee: { firstName: string; lastName: string };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PRESENT:  { bg: "rgba(52,211,153,.12)",  text: "#34d399", border: "rgba(52,211,153,.25)"  },
  ABSENT:   { bg: "rgba(248,113,113,.12)", text: "#f87171", border: "rgba(248,113,113,.25)" },
  HOLIDAY:  { bg: "rgba(167,139,250,.12)", text: "#a78bfa", border: "rgba(167,139,250,.25)" },
  LEAVE:    { bg: "rgba(251,191,36,.12)",  text: "#fbbf24", border: "rgba(251,191,36,.25)"  },
  HALF_DAY: { bg: "rgba(251,191,36,.12)",  text: "#fbbf24", border: "rgba(251,191,36,.25)"  },
  LATE:     { bg: "rgba(99,102,241,.12)",  text: "#818cf8", border: "rgba(99,102,241,.25)"  },
};

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: "PRESENT",
    checkIn: "",
    checkOut: "",
    remarks: "",
  });

  /* ================= FETCH DATA ================= */

  useEffect(() => { fetchEmployees(); }, []);

  useEffect(() => {
    if (selectedEmployeeId) fetchAttendance(selectedEmployeeId, month);
    else setRecords([]);
  }, [selectedEmployeeId, month]);

  async function fetchEmployees() {
    const user = getCurrentUser();
    try {
      const res = await fetch("/api/employees", {
        headers: {
          ...(user?.role ? { "x-user-role": user.role } : {}),
          ...(user?.id   ? { "x-user-id":   user.id }   : {}),
          ...(user?.companyId ? { "x-company-id": user.companyId } : {}),
        },
      });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    }
  }

  async function fetchAttendance(empId: string, monthStr: string) {
    const user = getCurrentUser();
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?month=${monthStr}&employeeId=${empId}`, {
        headers: {
          "x-user-role": user.role || "",
          "x-user-id":   user.id   || "",
          ...(user.companyId ? { "x-company-id": user.companyId } : {}),
        },
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  /* ================= HELPERS ================= */

  function toLocalISOString(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatTime(dateString?: string | Date | null) {
    if (!dateString) return "--";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function getCalendarDays() {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const days: (Date | null)[] = [];
    for (let i = 0; i < date.getDay(); i++) days.push(null);
    while (date.getMonth() === m - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  function getRecordForDate(date: Date) {
    const dateStr = toLocalISOString(date);
    return records.find(r => r.date.startsWith(dateStr));
  }

  /* ================= ACTIONS ================= */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || !selectedEmployeeId || !selectedDate) return;

    setLoading(true);
    try {
      const existing = getRecordForDate(new Date(selectedDate));
      const url    = existing ? `/api/attendance?id=${existing.id}` : "/api/attendance";
      const method = existing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type":  "application/json",
          "x-user-role":   user.role || "",
          "x-user-id":     user.id   || "",
          ...(user.companyId ? { "x-company-id": user.companyId } : {}),
        },
        body: JSON.stringify({ employeeId: selectedEmployeeId, date: selectedDate, ...formData }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
      } else {
        fetchAttendance(selectedEmployeeId, month);
        setSelectedDate(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this record?")) return;
    const user = getCurrentUser();
    if (!user) return;

    await fetch(`/api/attendance?id=${id}`, {
      method: "DELETE",
      headers: {
        "x-user-role": user.role || "",
        "x-user-id":   user.id   || "",
        ...(user.companyId ? { "x-company-id": user.companyId } : {}),
      },
    });
    if (selectedEmployeeId) fetchAttendance(selectedEmployeeId, month);
  }

  /* ================= RENDER ================= */

  const calendarDays    = getCalendarDays();
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const weekDays        = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const isSunday        = (d: Date) => d.getDay() === 0;
  const validDates      = calendarDays.filter((d): d is Date => d !== null);

  const explicitHolidays    = records.filter(r => r.status === "HOLIDAY").length;
  const defaultHolidaySundays = validDates.filter(d => isSunday(d) && !getRecordForDate(d)).length;

  const stats = {
    present: records.filter(r => r.status === "PRESENT" || r.status === "LATE").length,
    absent:  records.filter(r => r.status === "ABSENT").length,
    leave:   records.filter(r => r.status === "LEAVE"  || r.status === "HALF_DAY").length,
    holiday: explicitHolidays + defaultHolidaySundays,
  };

  const STAT_CARDS = [
    { label: "Present",  value: stats.present, color: "#34d399", bg: "rgba(52,211,153,.08)",  border: "rgba(52,211,153,.18)"  },
    { label: "Absent",   value: stats.absent,  color: "#f87171", bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.18)" },
    { label: "Leaves",   value: stats.leave,   color: "#fbbf24", bg: "rgba(251,191,36,.08)",  border: "rgba(251,191,36,.18)"  },
    { label: "Holidays", value: stats.holiday, color: "#a78bfa", bg: "rgba(167,139,250,.08)", border: "rgba(167,139,250,.18)" },
    {
      label: "Total Days",
      value: stats.present + stats.absent + stats.leave + stats.holiday,
      color: "#818cf8",
      bg:    "rgba(99,102,241,.08)",
      border: "rgba(99,102,241,.18)",
    },
  ];

  return (
    <div
      className="flex flex-col md:flex-row overflow-hidden"
      style={{ height: "100%", minHeight: 0, background: "#060918" }}
    >
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ SIDEBAR: Employee List Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div
        className="w-full md:w-72 shrink-0 flex flex-col z-10"
        style={{
          background: "rgba(255,255,255,.02)",
          borderRight: "1px solid rgba(255,255,255,.06)",
          height: "100%",
          minHeight: 0,
        }}
      >
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white", marginBottom: 3 }}>Employees</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>Select to view calendar</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {employees.map(emp => {
            const active = selectedEmployeeId === emp.id;
            return (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id)}
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid rgba(255,255,255,.04)",
                  cursor: "pointer",
                  background: active ? "rgba(99,102,241,.12)" : "transparent",
                  borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                  transition: "all .15s",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>
                  {emp.firstName} {emp.lastName}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                  {emp.department}
                </div>
              </div>
            );
          })}
          {employees.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.25)" }}>
              No employees found
            </div>
          )}
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ MAIN CONTENT Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,.015)",
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "white", margin: 0 }}>
              {selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : "Attendance Calendar"}
            </h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", margin: "3px 0 0" }}>
              {selectedEmployee ? "Click any day to mark or update attendance" : "Select an employee from the sidebar"}
            </p>
          </div>

          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.12)",
              background: "rgba(255,255,255,.05)",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
            }}
          />
        </div>

        {/* Stat cards */}
        {selectedEmployeeId && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, padding: "16px 24px 0" }}>
            {STAT_CARDS.map(s => (
              <div
                key={s.label}
                style={{
                  borderRadius: 12,
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "white" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Calendar or empty state */}
        {selectedEmployeeId ? (
          <div className="flex-1 overflow-auto" style={{ padding: "16px 24px 24px" }}>
            {loading ? (
              <div style={{ paddingTop: 60, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
                LoadingÃ¢â‚¬Â¦
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 1,
                  background: "rgba(255,255,255,.04)",
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,.06)",
                  minWidth: 600,
                }}
              >
                {/* Weekday headers */}
                {weekDays.map(day => (
                  <div
                    key={day}
                    style={{
                      padding: "10px 0",
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "rgba(255,255,255,.3)",
                      textTransform: "uppercase",
                      letterSpacing: ".05em",
                      background: "rgba(255,255,255,.03)",
                    }}
                  >
                    {day}
                  </div>
                ))}

                {/* Days */}
                {calendarDays.map((date, i) => {
                  if (!date) {
                    return (
                      <div
                        key={i}
                        style={{ minHeight: 110, background: "rgba(0,0,0,.15)" }}
                      />
                    );
                  }

                  const record           = getRecordForDate(date);
                  const dateStr          = toLocalISOString(date);
                  const isToday          = dateStr === toLocalISOString(new Date());
                  const isSelected       = selectedDate === dateStr;
                  const isDefaultHoliday = !record && isSunday(date);
                  const sc               = record ? (STATUS_COLORS[record.status] || STATUS_COLORS.PRESENT) : null;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        if (record) {
                          setFormData({
                            status:   record.status,
                            checkIn:  record.checkIn  ? new Date(record.checkIn).toTimeString().slice(0, 5)  : "",
                            checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : "",
                            remarks:  record.remarks  || "",
                          });
                        } else {
                          setFormData({ status: isSunday(date) ? "HOLIDAY" : "PRESENT", checkIn: "", checkOut: "", remarks: "" });
                        }
                      }}
                      style={{
                        minHeight: 110,
                        padding: 8,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        background: isSelected
                          ? "rgba(99,102,241,.12)"
                          : isDefaultHoliday
                            ? "rgba(167,139,250,.04)"
                            : "rgba(255,255,255,.015)",
                        outline: isToday ? "2px solid #6366f1" : "none",
                        outlineOffset: "-2px",
                        transition: "background .15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isToday ? "#818cf8" : "rgba(255,255,255,.7)",
                          }}
                        >
                          {date.getDate()}
                        </span>
                        {record && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(record.id); }}
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,.2)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 2px",
                              lineHeight: 1,
                            }}
                          >
                            Ã¢Å“â€¢
                          </button>
                        )}
                      </div>

                      {record && sc ? (
                        <div style={{ marginTop: 4 }}>
                          <span
                            style={{
                              display: "block",
                              textAlign: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 0",
                              borderRadius: 6,
                              background: sc.bg,
                              color: sc.text,
                              border: `1px solid ${sc.border}`,
                              letterSpacing: ".03em",
                            }}
                          >
                            {record.status}
                          </span>
                          {(record.checkIn || record.checkOut) && (
                            <div style={{ fontSize: 9, textAlign: "center", color: "rgba(255,255,255,.3)", marginTop: 4, fontFamily: "monospace" }}>
                              {formatTime(record.checkIn)} Ã¢â‚¬â€œ {formatTime(record.checkOut)}
                            </div>
                          )}
                        </div>
                      ) : isDefaultHoliday ? (
                        <span
                          style={{
                            display: "block",
                            textAlign: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "3px 0",
                            borderRadius: 6,
                            background: "rgba(167,139,250,.08)",
                            color: "rgba(167,139,250,.4)",
                            border: "1px solid rgba(167,139,250,.12)",
                          }}
                        >
                          HOLIDAY
                        </span>
                      ) : (
                        <span style={{ fontSize: 18, color: "rgba(255,255,255,.06)", textAlign: "center" }}>+</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center"
            style={{ color: "rgba(255,255,255,.2)" }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>Ã°Å¸â€˜Ë†</div>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Select an employee from the sidebar</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>to view and manage their attendance calendar</p>
          </div>
        )}
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ MODAL Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {selectedDate && selectedEmployeeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,.7)" }}
        >
          <div
            style={{
              background: "#0e1120",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 420,
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 800, color: "white", fontSize: 14 }}>
                {fmtDate(selectedDate + "T12:00:00")}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 16 }}
              >
                Ã¢Å“â€¢
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Status */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.1)",
                    background: "rgba(255,255,255,.05)",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LATE">Late</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>

              {/* Check In / Out */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Check In",  key: "checkIn"  as const },
                  { label: "Check Out", key: "checkOut" as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                      {label}
                    </label>
                    <input
                      type="time"
                      value={formData[key]}
                      onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,.1)",
                        background: "rgba(255,255,255,.05)",
                        color: "white",
                        fontSize: 13,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 6 }}>
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="Optional noteÃ¢â‚¬Â¦"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.1)",
                    background: "rgba(255,255,255,.05)",
                    color: "white",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: "none",
                  background: loading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all .2s",
                }}
              >
                {loading ? "SavingÃ¢â‚¬Â¦" : "Save Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
