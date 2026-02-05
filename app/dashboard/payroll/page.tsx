"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

interface Payroll {
  id: string;
  employeeId: string;
  monthYear: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  deductionReason?: string;
  additionalCash: number;
  netSalary: number;
  paymentStatus: string;
  employee: { firstName: string; lastName: string; employeeId: string };
}

export default function PayrollPage() {
  const user = getCurrentUser();
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [detectedAdvance, setDetectedAdvance] = useState(0);

  // Preview State
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    monthYear: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })(),
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    deductionReason: "",
    additionalCash: 0,
  });

  useEffect(() => {
    fetchEmployees();
    fetchPayroll();
    // Sync form date with view date for convenience
    setFormData((prev) => ({ ...prev, monthYear }));
  }, [monthYear]);

  useEffect(() => {
    if (formData.employeeId && formData.monthYear) {
      calculateAutoDeductions();
    } else {
      setDetectedAdvance(0);
    }
  }, [formData.employeeId, formData.monthYear, formData.baseSalary]);

  async function calculateAutoDeductions() {
    try {
      // 1. Fetch Advances
      const resAdvance = await fetch(
        `/api/advance?employeeId=${formData.employeeId}&status=PENDING&monthYear=${formData.monthYear}`,
      );
      const dataAdvance = await resAdvance.json();
      const advanceTotal = Array.isArray(dataAdvance)
        ? dataAdvance.reduce((sum: number, a: Any) => sum + a.amount, 0)
        : 0;

      setDetectedAdvance(advanceTotal);

      // 2. Fetch Attendance (Absents)
      const resAttendance = await fetch(
        `/api/attendance?employeeId=${formData.employeeId}&month=${formData.monthYear}`,
      );
      const dataAttendance = await resAttendance.json();
      const absents = Array.isArray(dataAttendance)
        ? dataAttendance.filter((r: Any) => r.status === "ABSENT").length
        : 0;

      // 3. Check Previous Month Balance (Carry Forward)
      let prevBalanceDeduction = 0;
      try {
        const [year, month] = formData.monthYear.split("-").map(Number);
        
        // Robust previous month calculation avoiding timezone issues
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        const prevMonthStr = `${prevYear}-${prevMonth.toString().padStart(2, "0")}`;

        const resPrev = await fetch(
          `/api/payroll?employeeId=${formData.employeeId}&monthYear=${prevMonthStr}`,
          { cache: "no-store" },
        );
        const dataPrev = await resPrev.json();

        if (Array.isArray(dataPrev) && dataPrev.length > 0) {
          const prevRecord = dataPrev[0];

          // Recalculate Net Salary strictly as (Earnings - Deductions) to ignore any DB inconsistencies
          const prevNetSalary =
            prevRecord.baseSalary +
            (prevRecord.allowances || 0) -
            (prevRecord.deductions || 0);

          // Actual Balance = Net Salary - Additional Cash
          const prevActualBalance =
            prevNetSalary - (prevRecord.additionalCash || 0);

          // If Actual Balance is negative, it means they owe us money (Carry Forward)
          if (prevActualBalance < 0) {
            prevBalanceDeduction = Math.abs(prevActualBalance);
          }
        }
      } catch (e) {
        console.error("Error checking previous balance", e);
      }

      // 4. Calculate Total Deduction
      // Assumption: 30 days per month
      const perDaySalary =
        formData.baseSalary > 0 ? formData.baseSalary / 30 : 0;
      const absentDeduction = Math.round(absents * perDaySalary);

      const totalDeduction =
        advanceTotal + absentDeduction + prevBalanceDeduction;

      // 5. Generate Reason
      const parts = [];
      if (prevBalanceDeduction > 0)
        parts.push(`Prev Bal: ${prevBalanceDeduction}`);
      if (absents > 0) parts.push(`${absents} Absent`);
      if (advanceTotal > 0) parts.push("Advance");

      const reason = parts.join(", ");

      // 6. Update Form
      if (totalDeduction > 0) {
        setFormData((prev) => ({
          ...prev,
          deductions: totalDeduction,
          deductionReason: reason,
        }));
      }
    } catch (error) {
      console.error("Error calculating deductions", error);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees", error);
      setEmployees([]);
    }
  }

  async function fetchPayroll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?monthYear=${monthYear}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setPayroll(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching payroll", error);
      setPayroll([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return alert("Login required");
    setLoading(true);
    await fetch(editingId ? `/api/payroll?id=${editingId}` : "/api/payroll", {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": user.id,
      },
      body: JSON.stringify(formData),
    });
    setEditingId(null);
    setFormData({
      employeeId: "",
      monthYear,
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      deductionReason: "",
      additionalCash: 0,
    });
    await fetchPayroll();
    setLoading(false);
  }

  function handleEdit(p: Payroll) {
    setEditingId(p.id);
    setFormData({
      employeeId: p.employeeId,
      monthYear: p.monthYear,
      baseSalary: p.baseSalary,
      allowances: p.allowances,
      deductions: p.deductions,
      deductionReason: p.deductionReason || "",
      additionalCash: p.additionalCash || 0,
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payroll record?") || !user) return;
    await fetch(`/api/payroll?id=${id}`, {
      method: "DELETE",
      headers: { "x-user-role": user.role, "x-user-id": user.id },
    });
    await fetchPayroll();
  }

  /* ================= PAYSLIP PRINT ================= */

  function handlePrintPayslip(p: Payroll) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Please allow popups");

    const html = `
      <html>
        <head>
          <title>Payslip - ${p.employee.firstName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #ccc; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
            .label { font-weight: bold; color: #555; }
            .amount { font-family: monospace; font-size: 1.1em; }
            .net-pay { margin-top: 20px; border-top: 2px solid #333; padding-top: 10px; font-size: 1.3em; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 0.8em; color: #888; }
            @media print { body { border: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payslip</h1>
            <p>Period: ${p.monthYear}</p>
          </div>
          <div class="row">
            <span class="label">Employee ID:</span>
            <span>${p.employee.employeeId}</span>
          </div>
          <div class="row">
            <span class="label">Employee Name:</span>
            <span>${p.employee.firstName} ${p.employee.lastName}</span>
          </div>
          <div class="row">
            <span class="label">Basic Salary:</span>
            <span class="amount">${p.baseSalary.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Allowances:</span>
            <span class="amount">${p.allowances.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Deductions:</span>
            <span class="amount">-${p.deductions.toLocaleString()}</span>
          </div>
          <div className="row net-pay">
            <span class="label">Pay:</span>
            <span class="amount">${(p.baseSalary + p.allowances - p.deductions).toLocaleString()}</span>
          </div>
          ${
            p.additionalCash > 0
              ? `
            <div class="row">
                <span class="label">Additional Cash (Manual):</span>
                <span class="amount">-${p.additionalCash.toLocaleString()}</span>
            </div>
          `
              : ""
          }
          <div class="row" style="font-weight: bold; border-top: 1px solid #eee; padding-top: 5px;">
              <span class="label">Next Month:</span>
              <span class="amount">${(p.baseSalary + p.allowances - p.deductions - (p.additionalCash || 0)).toLocaleString()}</span>
          </div>
          ${
            p.baseSalary +
              p.allowances -
              p.deductions -
              (p.additionalCash || 0) <
            0
              ? `
            <div class="row" style="color: red; margin-top: 5px;">
                <span class="label">Carry Forward to Next Month:</span>
                <span class="amount">${(p.baseSalary + p.allowances - p.deductions - (p.additionalCash || 0)).toLocaleString()}</span>
            </div>
          `
              : ""
          }
          <div class="row">
            <span class="label">Reason/Remarks:</span>
            <span>${p.deductionReason || "-"}</span>
          </div>
          <div class="footer">
            <p>System Generated Payslip</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-6 print:hidden">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-gray-800">💰 Payroll</h1>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="border-2 border-blue-500 text-blue-800 font-bold px-3 py-1 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-black transition-all"
            >
              👁️ Show Preview
            </button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all"
            >
              🖨️ Print Now
            </button>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <select
              required
              value={formData.employeeId}
              onChange={(e) => {
                const emp = employees.find((x) => x.id === e.target.value);
                setFormData({
                  ...formData,
                  employeeId: e.target.value,
                  baseSalary: emp?.salary || 0,
                });
              }}
              className="border p-2 rounded-lg outline-none"
            >
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeId} - {e.firstName} {e.lastName}
                </option>
              ))}
            </select>

            <input
              type="month"
              value={formData.monthYear}
              onChange={(e) =>
                setFormData({ ...formData, monthYear: e.target.value })
              }
              className="border p-2 rounded-lg"
            />
            <input
              type="number"
              placeholder="Basic Salary"
              value={formData.baseSalary}
              onChange={(e) =>
                setFormData({ ...formData, baseSalary: +e.target.value || 0 })
              }
              className="border p-2 rounded-lg"
            />
            <button
              disabled={loading}
              className="bg-black text-white rounded-lg font-bold py-2 px-4 transition-colors"
            >
              {editingId ? "Update Record" : "Save Record"}
            </button>

            <div className="col-span-1 md:col-span-4 grid grid-cols-2 gap-4 mt-2">
              <input
                type="number"
                placeholder="Allowances"
                value={formData.allowances}
                onChange={(e) =>
                  setFormData({ ...formData, allowances: +e.target.value || 0 })
                }
                className="border p-2 rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Deductions"
                    value={formData.deductions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deductions: +e.target.value || 0,
                      })
                    }
                    className="border p-2 rounded-lg w-full"
                  />
                  {detectedAdvance > 0 && (
                    <span className="text-xs text-red-500 absolute -bottom-5 left-0">
                      Advance: {detectedAdvance}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Reason (e.g. Advance)"
                  value={formData.deductionReason}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductionReason: e.target.value,
                    })
                  }
                  className="border p-2 rounded-lg w-full"
                />
              </div>

              {/* NEW FIELD: Additional Cash */}
              <div className="col-span-2 mt-2">
                <label className="text-sm font-bold text-gray-700">
                  Additional Cash (Manual Add):
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={formData.additionalCash}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      additionalCash: +e.target.value || 0,
                    })
                  }
                  className="border p-2 rounded-lg w-full border-green-500"
                />
                <p className="text-xs text-gray-500">
                  This amount is subtracted from Net Salary (increasing
                  deduction/debt). Final Balance carries forward.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* MAIN TABLE (Non-Print View) */}
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 text-left">Emp ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Basic Salary</th>
                <th className="p-3 text-center">Deductions</th>
                <th className="p-3 text-center">Deduction Reason</th>
                <th className="p-3 text-center">Pay</th>
                <th className="p-3 text-center">Paid</th>
                <th className="p-3 text-center bg-red-50 text-red-800">
                  Next Month
                </th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3 font-medium">{p.employee.employeeId}</td>
                  <td className="p-3">
                    {p.employee.firstName} {p.employee.lastName}
                  </td>
                  <td className="p-3">{p.baseSalary.toLocaleString()}</td>
                  <td className="p-3 text-center font-bold text-red-700">
                    {p.deductions > 0
                      ? `-${p.deductions.toLocaleString()}`
                      : p.deductions}
                  </td>
                  <td className="p-3 text-center font-bold text-red-700">
                    {p.deductionReason}
                  </td>
                  <td className="p-3 text-center font-bold text-gray-700">
                    {(
                      p.baseSalary +
                      p.allowances -
                      p.deductions
                    ).toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-700">
                    {p.additionalCash > 0
                      ? `${p.additionalCash.toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="p-3 text-center font-bold text-green-700 bg-red-50">
                    {p.baseSalary +
                      p.allowances -
                      p.deductions -
                      (p.additionalCash || 0) <
                    0 ? (
                      <div className="bg-red-100 text-red-700 px-2 py-1 rounded-md border border-red-200">
                        <p className="text-[10px] uppercase">
                          {(
                            p.baseSalary +
                            p.allowances -
                            p.deductions -
                            (p.additionalCash || 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      (
                        p.baseSalary +
                        p.allowances -
                        p.deductions -
                        (p.additionalCash || 0)
                      ).toLocaleString()
                    )}
                  </td>
                  <td className="p-3 text-center space-x-2 flex justify-center items-center">
                    <button
                      onClick={() => handlePrintPayslip(p)}
                      className="text-gray-600 font-bold bg-gray-200 px-2 py-1 rounded text-xs hover:bg-gray-300"
                    >
                      Slip
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 font-bold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 font-bold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td
                  colSpan={2}
                  className="border border-gray-400 p-2 text-right"
                >
                  TOTALS:
                </td>
                <td className="border border-gray-400 p-2 text-center">
                  {payroll
                    .reduce((sum, p) => sum + p.baseSalary, 0)
                    .toLocaleString()}
                </td>
                <td className="border border-gray-400 p-2 text-center text-red-600">
                  -
                  {payroll
                    .reduce((sum, p) => sum + p.deductions, 0)
                    .toLocaleString()}
                </td>

                <td className="border border-gray-400 p-2"></td>
                <td className="border border-gray-400 p-2"></td>
                <td className="border border-gray-400 p-2 text-center text-blue-600">
                  {payroll
                    .reduce((sum, p) => sum + (p.additionalCash || 0), 0)
                    .toLocaleString()}
                </td>
                <td className="border border-gray-400 p-2 text-center text-red-800 bg-gray-50">
                  {payroll
                    .reduce((sum, p) => {
                      const pay = p.baseSalary + p.allowances - p.deductions;
                      const balance = pay - (p.additionalCash || 0);
                      return balance < 0 ? sum + balance : sum;
                    }, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* --- ACTUAL PRINTING CONTENT (Hidden on screen, shown on print) --- */}
      <div className="invoice-print hidden print:block font-serif text-black p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold uppercase tracking-widest">
            Payroll Report
          </h1>
          <p className="text-lg">
            For the Month of:{" "}
            <span className="font-bold underline">{monthYear}</span>
          </p>
        </div>
        <table className="w-full border-2 border-black">
          <thead>
            <tr className="bg-gray-200">
              <th className="border-2 border-black p-2">ID</th>
              <th className="border-2 border-black p-2">Employee Name</th>
              <th className="border-2 border-black p-2">Basic</th>
              <th className="border-2 border-black p-2">Deductions</th>
              <th className="border-2 border-black p-2">Deduction reason</th>

              <th className="border-2 border-black p-2">Pay</th>
              <th className="border-2 border-black p-2">Paid</th>
              <th className="border-2 border-black p-2 bg-red-100">
                Next Month
              </th>
            </tr>
          </thead>
          <tbody>
            {payroll.map((p) => (
              <tr key={p.id}>
                <td className="border-2 border-black p-2 text-center">
                  {p.employee.employeeId}
                </td>
                <td className="border-2 border-black p-2">
                  {p.employee.firstName} {p.employee.lastName}
                </td>
                <td className="border-2 border-black p-2 text-center">
                  {p.baseSalary.toLocaleString()}
                </td>
                <td className="border-2 border-black p-2 text-center text-red-600 font-bold">
                  {p.deductions > 0
                    ? `-${p.deductions.toLocaleString()}`
                    : p.deductions}
                </td>
                {/* {p.deductions > 0 ? p.deductions.toLocaleString() : "-"} */}
                <td className="border-2 border-black p-2 text-center">
                  {p.deductionReason || "-"}
                </td>
                <td className="border-2 border-black p-2 text-center font-bold">
                  {(
                    p.baseSalary +
                    p.allowances -
                    p.deductions
                  ).toLocaleString()}
                </td>
                <td className="border-2 border-black p-2 text-center text-blue-600 font-bold">
                  {p.additionalCash > 0
                    ? p.additionalCash.toLocaleString()
                    : "-"}
                </td>
                <td className="border-2 border-black p-2 text-center text-red-800 font-bold bg-red-50">
                  {p.baseSalary +
                    p.allowances -
                    p.deductions -
                    (p.additionalCash || 0) <
                  0 ? (
                    <div className="flex flex-col items-center">
                      {/* <span className="text-black">0</span> */}
                      <span className="text-red-600 text-[10px] whitespace-nowrap">
                        {(
                          p.baseSalary +
                          p.allowances -
                          p.deductions -
                          (p.additionalCash || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    (
                      p.baseSalary +
                      p.allowances -
                      p.deductions -
                      (p.additionalCash || 0)
                    ).toLocaleString()
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-gray-400 p-2 text-right">
                TOTALS:
              </td>
              <td className="border border-gray-400 p-2 text-center">
                {payroll
                  .reduce((sum, p) => sum + p.baseSalary, 0)
                  .toLocaleString()}
              </td>
              <td className="border border-gray-400 p-2 text-center text-red-600">
                -
                {payroll
                  .reduce((sum, p) => sum + p.deductions, 0)
                  .toLocaleString()}
              </td>

              <td className="border border-gray-400 p-2"></td>
              <td className="border border-gray-400 p-2"></td>
              <td className="border border-gray-400 p-2 text-center text-blue-600">
                {payroll
                  .reduce((sum, p) => sum + (p.additionalCash || 0), 0)
                  .toLocaleString()}
              </td>

              <td className="border border-gray-400 p-2 text-center text-red-800 bg-gray-50">
                {payroll
                  .reduce((sum, p) => {
                    const pay = p.baseSalary + p.allowances - p.deductions;
                    const balance = pay - (p.additionalCash || 0);
                    return balance < 0 ? sum + balance : sum;
                  }, 0)
                  .toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
        <div className="flex justify-between mt-20 px-10">
          <div className="border-t-2 border-black w-40 text-center pt-2 font-bold">
            Prepared By
          </div>
          <div className="border-t-2 border-black w-40 text-center pt-2 font-bold">
            Approved By
          </div>
        </div>
      </div>

      {/* --- PREVIEW MODAL --- */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col items-center overflow-auto p-4 md:p-10 print:hidden">
          <div className="flex w-full max-w-[210mm] justify-between mb-4">
            <h2 className="text-white text-xl font-bold italic">
              Print Preview (A4 View)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="bg-blue-500 text-white px-4 py-1 rounded shadow font-bold"
              >
                Print Now
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="bg-red-500 text-white px-4 py-1 rounded shadow font-bold"
              >
                Close
              </button>
            </div>
          </div>

          {/* This mimics the paper */}
          <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl rounded-sm text-black">
            <div className="text-center mb-8 border-b-2 border-gray-100 pb-4">
              <h1 className="text-2xl font-bold uppercase tracking-widest text-gray-800">
                Payroll Report
              </h1>
              <p className="text-gray-600 mt-1">
                Month Year: <span className="font-bold">{monthYear}</span>
              </p>
            </div>

            <table className="w-full border-collapse border border-gray-400">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-400 p-2 text-sm">ID</th>
                  <th className="border border-gray-400 p-2 text-sm text-left">
                    Employee
                  </th>
                  <th className="border border-gray-400 p-2 text-sm">Basic</th>
                  <th className="border border-gray-400 p-2 text-sm text-red-600">
                    Deduction
                  </th>
                  <th className="border border-gray-400 p-2 text-sm text-red-600">
                    Deduction Reason
                  </th>

                  <th className="border border-gray-400 p-2 text-sm">Net</th>
                  <th className="border border-gray-400 p-2 text-sm text-blue-600">
                    Paid
                  </th>
                  <th className="border border-gray-400 p-2 text-sm text-red-800">
                    Next Month
                  </th>
                </tr>
              </thead>
              <tbody>
                {payroll.map((p) => (
                  <tr key={p.id}>
                    <td className="border border-gray-400 p-2 text-center text-sm">
                      {p.employee.employeeId}
                    </td>
                    <td className="border border-gray-400 p-2 text-sm">
                      {p.employee.firstName} {p.employee.lastName}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-sm">
                      {p.baseSalary.toLocaleString()}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-sm text-red-600">
                      {p.deductions > 0
                        ? `-${p.deductions.toLocaleString()}`
                        : p.deductions}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-sm text-red-600">
                      {p.deductionReason}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-sm font-bold">
                      {(
                        p.baseSalary +
                        p.allowances -
                        p.deductions
                      ).toLocaleString()}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-sm text-blue-600 font-bold">
                      {p.additionalCash > 0
                        ? `${p.additionalCash.toLocaleString()}`
                        : "-"}
                    </td>

                    <td className="border border-gray-400 p-2 text-center text-sm text-red-800 font-bold bg-gray-50">
                      {p.baseSalary +
                        p.allowances -
                        p.deductions -
                        (p.additionalCash || 0) <
                      0 ? (
                        <div className="flex flex-col items-center">
                          {/* <span className="text-black">0</span> */}
                          <span className="text-red-600 text-sm font-bold whitespace-nowrap">
                            {(
                              p.baseSalary +
                              p.allowances -
                              p.deductions -
                              (p.additionalCash || 0)
                            ).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        (
                          p.baseSalary +
                          p.allowances -
                          p.deductions -
                          (p.additionalCash || 0)
                        ).toLocaleString()
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td
                    colSpan={2}
                    className="border border-gray-400 p-2 text-right"
                  >
                    TOTALS:
                  </td>
                  <td className="border border-gray-400 p-2 text-center">
                    {payroll
                      .reduce((sum, p) => sum + p.baseSalary, 0)
                      .toLocaleString()}
                  </td>
                  <td className="border border-gray-400 p-2 text-center text-red-600">
                    -
                    {payroll
                      .reduce((sum, p) => sum + p.deductions, 0)
                      .toLocaleString()}
                  </td>

                  <td className="border border-gray-400 p-2"></td>
                  <td className="border border-gray-400 p-2"></td>
                  <td className="border border-gray-400 p-2 text-center text-blue-600">
                    {payroll
                      .reduce((sum, p) => sum + (p.additionalCash || 0), 0)
                      .toLocaleString()}
                  </td>

                  <td className="border border-gray-400 p-2 text-center text-red-800 bg-gray-50">
                    {payroll
                      .reduce((sum, p) => {
                        const pay = p.baseSalary + p.allowances - p.deductions;
                        const balance = pay - (p.additionalCash || 0);
                        return balance < 0 ? sum + balance : sum;
                      }, 0)
                      .toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="flex justify-between mt-32 px-5">
              <div className="border-t border-black w-32 text-center pt-1 text-xs font-bold uppercase">
                Prepared By
              </div>
              <div className="border-t border-black w-32 text-center pt-1 text-xs font-bold uppercase">
                Approved By
              </div>
            </div>

            <div className="mt-20 text-[10px] text-gray-400 text-center">
              System Generated Report - {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
