"use client";

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

export default function AttendancePage() {
  const user = getCurrentUser();
  
  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Selection
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Form State (for Modal/Inline)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: "PRESENT",
    checkIn: "",
    checkOut: "",
    remarks: "",
  });

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchAttendance(selectedEmployeeId, month);
    } else {
      setRecords([]);
    }
  }, [selectedEmployeeId, month]);

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      setEmployees([]);
    }
  }

  async function fetchAttendance(empId: string, monthStr: string) {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch specific employee's attendance for the month
      const res = await fetch(`/api/attendance?month=${monthStr}&employeeId=${empId}`, {
        headers: {
          "x-user-role": user.role || "",
          "x-user-id": user.id || "",
        },
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  /* ================= HELPERS ================= */

  // Helper to get local date string YYYY-MM-DD
  function toLocalISOString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatPakTime(dateString?: string | Date | null) {
    if (!dateString) return "--";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString("en-PK", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Karachi",
    });
  }

  // Generate Calendar Days
  const getCalendarDays = () => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    const days = [];
    
    // Add empty slots for days before the 1st
    const firstDayIndex = date.getDay(); // 0 = Sun
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Add actual days
    while (date.getMonth() === m - 1) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    
    return days;
  };

  const getRecordForDate = (date: Date) => {
    const dateStr = toLocalISOString(date);
    // Backend returns date as ISO string (UTC), but usually we compare by YYYY-MM-DD
    // If backend stores time as 00:00:00 UTC, then toISOString().slice(0,10) matches.
    // However, we want to match based on the local day we are viewing.
    // The record.date from backend is typically "2024-01-02T00:00:00.000Z".
    // If we sent "2024-01-02" (local), backend saved "2024-01-02T00:00:00.000Z".
    // So checking startWith("2024-01-02") works.
    return records.find(r => r.date.startsWith(dateStr));
  };

  /* ================= ACTIONS ================= */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !selectedEmployeeId || !selectedDate) return;

    setLoading(true);
    try {
      const payload = {
        employeeId: selectedEmployeeId,
        date: selectedDate,
        ...formData
      };

      // Check if updating existing
      const existing = getRecordForDate(new Date(selectedDate));
      const url = existing 
        ? `/api/attendance?id=${existing.id}` 
        : "/api/attendance";
      
      const method = existing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role || "",
          "x-user-id": user.id || "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed");
      } else {
        fetchAttendance(selectedEmployeeId, month);
        setSelectedDate(null); // Close form
      }
    } catch (err) {
      console.error(err);
      alert("Error saving");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    if (!user) return;

    await fetch(`/api/attendance?id=${id}`, {
      method: "DELETE",
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || "",
      },
    });
    if (selectedEmployeeId) fetchAttendance(selectedEmployeeId, month);
  }

  /* ================= RENDER ================= */

  const calendarDays = getCalendarDays();
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate Sundays that are treated as holidays (either explicitly marked or default)
  const isSunday = (d: Date) => d.getDay() === 0;
  
  // Get all valid dates in the current month view
  const validDatesInMonth = calendarDays.filter((d): d is Date => d !== null);
  
  // Count explicit holidays
  const explicitHolidays = records.filter(r => r.status === "HOLIDAY").length;
  
  // Count Sundays that have NO record (default holidays)
  const defaultHolidaySundays = validDatesInMonth.filter(d => {
    if (!isSunday(d)) return false;
    const hasRecord = getRecordForDate(d);
    return !hasRecord;
  }).length;

  const stats = {
    present: records.filter(r => r.status === "PRESENT").length,
    absent: records.filter(r => r.status === "ABSENT").length,
    leave: records.filter(r => r.status === "LEAVE" || r.status === "HALF_DAY").length,
    holiday: explicitHolidays + defaultHolidaySundays,
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      
      {/* SIDEBAR: Employee List */}
      <div className="w-full md:w-80 h-60 md:h-full bg-white border-r flex flex-col shadow-lg z-10 shrink-0">
        <div className="p-4 border-b bg-gray-100">
          <h2 className="font-black text-xl mb-1">Employees</h2>
          <p className="text-xs text-gray-500">Select to view calendar</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployeeId(emp.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedEmployeeId === emp.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
              }`}
            >
              <p className="font-bold text-gray-800">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-gray-500">{emp.department}</p>
            </div>
          ))}
          {employees.length === 0 && (
            <div className="p-4 text-center text-gray-400 italic">No employees found</div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT: Calendar */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-white border-b flex justify-between items-center shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {selectedEmployee ? `${selectedEmployee.firstName}'s Attendance` : "Attendance Calendar"}
            </h1>
            <p className="text-sm text-gray-500">
              {selectedEmployee ? "Manage daily records" : "Select an employee from the list"}
            </p>
          </div>
          
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border px-4 py-2 rounded-lg font-bold shadow-sm"
          />
        </div>

        {/* STATS BOXES */}
        {selectedEmployeeId && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 pb-0">
            <div className="bg-green-100 p-4 rounded-xl border border-green-200">
              <p className="text-green-600 font-bold text-sm uppercase">Present</p>
              <p className="text-3xl font-black text-green-800">{stats.present}</p>
            </div>
            <div className="bg-red-100 p-4 rounded-xl border border-red-200">
              <p className="text-red-600 font-bold text-sm uppercase">Absent</p>
              <p className="text-3xl font-black text-red-800">{stats.absent}</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-xl border border-yellow-200">
              <p className="text-yellow-600 font-bold text-sm uppercase">Leaves</p>
              <p className="text-3xl font-black text-yellow-800">{stats.leave}</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-xl border border-purple-200">
              <p className="text-purple-600 font-bold text-sm uppercase">Holidays</p>
              <p className="text-3xl font-black text-purple-800">{stats.holiday}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-xl border border-blue-200">
              <p className="text-blue-600 font-bold text-sm uppercase">Attendance + Holidays</p>
              <p className="text-3xl font-black text-blue-800">
                {records.filter(r => r.status !== "HOLIDAY").length + stats.holiday}
              </p>
            </div>
          </div>
        )}

        {/* CALENDAR GRID */}
        {selectedEmployeeId ? (
          <div className="flex-1 overflow-auto p-6">
            
            <div className="grid grid-cols-7 gap-px bg-gray-200 border rounded-xl overflow-hidden shadow-sm min-w-[600px]">
              {/* Weekday Headers */}
              {weekDays.map(day => (
                <div key={day} className="bg-gray-100 p-2 text-center font-bold text-gray-500 text-sm">
                  {day}
                </div>
              ))}

              {/* Days */}
              {calendarDays.map((date, i) => {
                if (!date) return <div key={i} className="bg-white min-h-[100px]" />;
                
                const record = getRecordForDate(date);
                const dateStr = toLocalISOString(date);
                const isToday = dateStr === toLocalISOString(new Date());
                const isSelected = selectedDate === dateStr;
                const isDefaultHoliday = !record && isSunday(date);

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      // Pre-fill form if record exists
                      if (record) {
                        setFormData({
                          status: record.status,
                          checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : "",
                          checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : "",
                          remarks: record.remarks || "",
                        });
                      } else {
                         // Reset form for new entry
                         setFormData({
                          status: isSunday(date) ? "HOLIDAY" : "PRESENT",
                          checkIn: "",
                          checkOut: "",
                          remarks: "",
                        });
                      }
                    }}
                    className={`bg-white min-h-[120px] p-2 hover:bg-gray-50 cursor-pointer transition-colors relative flex flex-col justify-between ${
                      isToday ? "ring-2 ring-blue-500 inset-0 z-10" : ""
                    } ${isSelected ? "bg-blue-50" : ""} ${isDefaultHoliday ? "bg-purple-50/50" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-bold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                        {date.getDate()}
                      </span>
                      {record && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(record.id);
                          }}
                          className="text-gray-400 hover:text-red-600 text-xs font-bold px-1"
                          >
                          ✕
                        </button>
                      )}
                    </div>

                    {record ? (
                      <div className="mt-1 space-y-1">
                        <span className={`block text-center text-xs font-black py-1 rounded ${
                          record.status === "PRESENT" ? "bg-green-100 text-green-800" :
                          record.status === "ABSENT" ? "bg-red-100 text-red-800" :
                          record.status === "HOLIDAY" ? "bg-purple-100 text-purple-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {record.status}
                        </span>
                        {(record.checkIn || record.checkOut) && (
                          <div className="text-[10px] text-center text-gray-500 font-mono">
                            {formatPakTime(record.checkIn)} - {formatPakTime(record.checkOut)}
                          </div>
                        )}
                      </div>
                    ) : isDefaultHoliday ? (
                      <div className="mt-1 space-y-1 opacity-60">
                         <span className="block text-center text-xs font-black py-1 rounded bg-purple-50 text-purple-400 border border-purple-100">
                          HOLIDAY
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100">
                        <span className="text-2xl text-gray-200">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="text-6xl mb-4">👈</div>
            <p className="text-xl font-bold">Select an employee from the left</p>
            <p>to view and manage their attendance calendar</p>
          </div>
        )}
      </div>

      {/* EDIT MODAL / SIDEBAR */}
      {selectedDate && selectedEmployeeId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
              <h3 className="font-black text-lg">
                {new Date(selectedDate).toDateString()}
              </h3>
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-gray-500 hover:text-black font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 font-bold"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LEAVE">Leave</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="LATE">Late</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check In</label>
                  <input
                    type="time"
                    className="w-full border rounded-lg px-3 py-2"
                    value={formData.checkIn}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check Out</label>
                  <input
                    type="time"
                    className="w-full border rounded-lg px-3 py-2"
                    value={formData.checkOut}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional note..."
                  className="w-full border rounded-lg px-3 py-2"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 rounded-xl font-black hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
