"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

type RecurringTransaction = {
  id: string;
  accountId: string;
  account: { name: string };
  type: string;
  frequency: string;
  amount: number;
  description: string;
  narration?: string;
  nextDate: string;
  lastRun?: string;
  isActive: boolean;
};

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);

  const [formData, setFormData] = useState({
    accountId: "",
    type: "EXPENSE",
    frequency: "MONTHLY",
    amount: "",
    description: "",
    narration: "",
    nextDate: new Date().toISOString().slice(0, 10),
  });

  const [accounts, setAccounts] = useState<any[]>([]);

  const user = getCurrentUser();

  if (!hasPermission(user, PERMISSIONS.RECURRING_TRANSACTIONS)) {
    return <div>Access Denied</div>;
  }

  useEffect(() => {
    loadTransactions();
    loadAccounts();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const res = await fetch("/api/recurring-transactions", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetch("/api/accounts", {
        headers: { "x-user-role": user?.role || "" },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.accounts || [];
      setAccounts(list);
    } catch (e) {
      console.error("Accounts load error:", e);
    }
  }

  async function saveTransaction() {
    if (!formData.accountId || !formData.amount || !formData.description) {
      alert("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const url = editing
        ? "/api/recurring-transactions"
        : "/api/recurring-transactions";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify(editing ? { id: editing.id, ...formData } : formData),
      });

      if (res.ok) {
        await loadTransactions();
        setShowForm(false);
        setEditing(null);
        setFormData({
          accountId: "",
          type: "EXPENSE",
          frequency: "MONTHLY",
          amount: "",
          description: "",
          narration: "",
          nextDate: new Date().toISOString().slice(0, 10),
        });
      } else {
        const error = await res.json();
        alert(error.error || "Save failed");
      }
    } catch (e) {
      alert("Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    try {
      const res = await fetch("/api/recurring-transactions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });

      if (res.ok) {
        await loadTransactions();
      }
    } catch (e) {
      alert("Update failed");
    }
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Are you sure you want to delete this recurring transaction?")) {
      return;
    }

    try {
      const res = await fetch(`/api/recurring-transactions?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
      });

      if (res.ok) {
        await loadTransactions();
      }
    } catch (e) {
      alert("Delete failed");
    }
  }

  function startEdit(t: RecurringTransaction) {
    setEditing(t);
    setFormData({
      accountId: t.accountId,
      type: t.type,
      frequency: t.frequency,
      amount: t.amount.toString(),
      description: t.description,
      narration: t.narration || "",
      nextDate: new Date(t.nextDate).toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recurring Transactions</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditing(null);
            setFormData({
              accountId: "",
              type: "EXPENSE",
              frequency: "MONTHLY",
              amount: "",
              description: "",
              narration: "",
              nextDate: new Date().toISOString().slice(0, 10),
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Recurring Transaction
        </button>
      </div>

      {showForm && (
        <div className="bg-white border p-6 rounded space-y-4">
          <h2 className="text-xl font-bold">
            {editing ? "Edit" : "New"} Recurring Transaction
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Account *</label>
              <select
                className="w-full border p-2 rounded"
                value={formData.accountId}
                onChange={(e) =>
                  setFormData({ ...formData, accountId: e.target.value })
                }
              >
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Type *</label>
              <select
                className="w-full border p-2 rounded"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
              >
                <option value="CPV">Cash Payment (CPV)</option>
                <option value="CRV">Cash Receipt (CRV)</option>
                <option value="EXPENSE">Expense</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Frequency *
              </label>
              <select
                className="w-full border p-2 rounded"
                value={formData.frequency}
                onChange={(e) =>
                  setFormData({ ...formData, frequency: e.target.value })
                }
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Amount *</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">
                Description *
              </label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-1">Narration</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={formData.narration}
                onChange={(e) =>
                  setFormData({ ...formData, narration: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Next Date *</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={formData.nextDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveTransaction}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Account</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Frequency</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-left">Description</th>
              <th className="p-3 text-left">Next Date</th>
              <th className="p-3 text-left">Last Run</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-400">
                  No recurring transactions found
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">{t.account.name}</td>
                  <td className="p-3">{t.type}</td>
                  <td className="p-3">{t.frequency}</td>
                  <td className="p-3 text-right">
                    {t.amount.toLocaleString()}
                  </td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3">
                    {new Date(t.nextDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {t.lastRun
                      ? new Date(t.lastRun).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        t.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => startEdit(t)}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(t.id, t.isActive)}
                        className="text-yellow-600 hover:underline"
                      >
                        {t.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => deleteTransaction(t.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
