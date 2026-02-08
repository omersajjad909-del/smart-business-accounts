"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  monthYear?: string;
  status: string;
  remarks?: string;
  employee: { firstName: string; lastName: string };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export default function AdvancePage() {
  const user = getCurrentUser();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    monthYear: "", // Optional target month
    remarks: "",
  });

  useEffect(() => {
    fetchEmployees();
    fetchAdvances();
  }, []);

  async function fetchEmployees() {
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
  }

  async function fetchAdvances() {
    setLoading(true);
    try {
      const res = await fetch("/api/advance");
      const data = await res.json();
      setAdvances(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Submitting advance form...", formData);
    
    if (!user) {
      alert("Please login");
      return;
    }

    setLoading(true);
    try {
      console.log("Sending request to /api/advance");
      const res = await fetch("/api/advance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role || "",
          "x-user-id": user.id || "",
        },
        body: JSON.stringify(formData),
      });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        alert("Error: " + (data.error || "Failed to save"));
      } else {
        alert("Advance Recorded Successfully!");
        setFormData({
          employeeId: "",
          amount: "",
          date: new Date().toISOString().slice(0, 10),
          monthYear: "",
          remarks: "",
        });
        fetchAdvances();
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      alert("Network Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this record?")) return;
    if (!user) return;

    await fetch(`/api/advance?id=${id}`, {
      method: "DELETE",
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || "",
      },
    });
    fetchAdvances();
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-gray-900">💸 Advance Salary Manager</h1>

        {/* FORM */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Give Advance</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <select
              required
              className="border p-2 rounded-lg"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            >
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>

            <input
              required
              type="number"
              placeholder="Amount"
              className="border p-2 rounded-lg"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />

            <input
              required
              type="date"
              className="border p-2 rounded-lg"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />

            <input
              type="month"
              placeholder="Deduction Month (Optional)"
              className="border p-2 rounded-lg"
              value={formData.monthYear}
              onChange={(e) => setFormData({ ...formData, monthYear: e.target.value })}
            />
            <div className="text-xs text-gray-500 col-span-1 md:col-span-2 lg:col-span-5 -mt-3 mb-2">
                * Select month if you want to auto-deduct in specific payroll
            </div>

            <input
              type="text"
              placeholder="Remarks / Reason"
              className="border p-2 rounded-lg col-span-1 md:col-span-1 lg:col-span-4"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-black text-white font-bold py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Record"}
            </button>
          </form>
        </div>

        {/* LIST */}
        <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-100">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 font-bold text-gray-600">Date</th>
                <th className="p-4 font-bold text-gray-600">Employee</th>
                <th className="p-4 font-bold text-gray-600">Amount</th>
                <th className="p-4 font-bold text-gray-600">Deduction Month</th>
                <th className="p-4 font-bold text-gray-600">Status</th>
                <th className="p-4 font-bold text-gray-600">Remarks</th>
                <th className="p-4 font-bold text-gray-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {advances.map((adv) => (
                <tr key={adv.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">{new Date(adv.date).toLocaleDateString()}</td>
                  <td className="p-4 font-bold">{adv.employee.firstName} {adv.employee.lastName}</td>
                  <td className="p-4 font-mono font-bold text-red-600">-{adv.amount.toLocaleString()}</td>
                  <td className="p-4 text-sm">{adv.monthYear || "Any"}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-black uppercase ${
                      adv.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}>
                      {adv.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{adv.remarks}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(adv.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {advances.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">No advance records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
