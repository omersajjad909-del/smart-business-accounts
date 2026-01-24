"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type Account = {
  id: string;
  name: string;
  code: string;
};

type Budget = {
  id: string;
  accountId: string;
  account: Account;
  year: number;
  amount: number;
  notes?: string | null;
};

export default function BudgetPage() {
  const currentYear = new Date().getFullYear();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [year, setYear] = useState(currentYear.toString());
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
    loadBudgets();
  }, [year]);

  async function loadAccounts() {
    const user = getCurrentUser();
    if (!user) return;

    try {
      const res = await fetch("/api/accounts", {
        headers: { "x-user-role": user.role },
      });
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : data.accounts || []);
    } catch (e) {
      console.error("Error loading accounts:", e);
    }
  }

  async function loadBudgets() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/budget?year=${year}`, {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      setBudgets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading budgets:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveBudget() {
    if (!selectedAccount || !amount) {
      alert("Account and amount required");
      return;
    }

    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "ADMIN",
        },
        body: JSON.stringify({
          accountId: selectedAccount,
          year: parseInt(year),
          amount: parseFloat(amount),
          description: notes || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Budget saved successfully!");
        setSelectedAccount("");
        setAmount("");
        setNotes("");
        loadBudgets();
      } else {
        alert(data.error || "Failed to save budget");
      }
    } catch (e) {
      console.error("Error saving budget:", e);
      alert("Error saving budget");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBudget(id: string) {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/budget?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-role": user?.role || "ADMIN" },
      });

      if (res.ok) {
        alert("Budget deleted successfully!");
        loadBudgets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete budget");
      }
    } catch (e) {
      console.error("Error deleting budget:", e);
      alert("Error deleting budget");
    }
  }

  function exportBudgets() {
    const exportData = budgets.map((b) => ({
      account: b.account.name,
      code: b.account.code,
      year: b.year,
      budget: b.amount,
      notes: b.notes || "",
    }));
    exportToCSV(exportData, `budget-${year}`);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Budget Planning</h1>

      {/* FILTERS */}
      <div className="bg-white border rounded-lg p-4 flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border rounded px-3 py-2"
            min="2020"
            max="2100"
          />
        </div>
        {budgets.length > 0 && (
          <button
            onClick={exportBudgets}
            className="bg-green-600 text-white px-6 py-2 rounded font-bold"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {/* ADD BUDGET FORM */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold">Add/Update Budget</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        <button
          onClick={saveBudget}
          disabled={loading || !selectedAccount || !amount}
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold disabled:bg-gray-400"
        >
          {loading ? "Saving..." : "Save Budget"}
        </button>
      </div>

      {/* BUDGETS LIST */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Budgets for {year}</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No budgets set for {year}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Account</th>
                  <th className="border p-2 text-left">Code</th>
                  <th className="border p-2 text-right">Budget Amount</th>
                  <th className="border p-2 text-left">Notes</th>
                  <th className="border p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.id}>
                    <td className="border p-2">{budget.account.name}</td>
                    <td className="border p-2">{budget.account.code}</td>
                    <td className="border p-2 text-right font-bold">
                      {budget.amount.toLocaleString()}
                    </td>
                    <td className="border p-2">{budget.notes || "-"}</td>
                    <td className="border p-2 text-center">
                      <button
                        onClick={() => deleteBudget(budget.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="border p-2 text-right">
                    Total:
                  </td>
                  <td className="border p-2 text-right">
                    {budgets.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
                  </td>
                  <td colSpan={2} className="border p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
