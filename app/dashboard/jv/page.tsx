"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "react-hot-toast";

type Account = {
  id: string;
  name: string;
  code: string;
  type: string;
};

type Entry = {
  id: string;
  accountId: string;
  accountName: string;
  amount: string;
  type: "DEBIT" | "CREDIT";
};

type Voucher = {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  entries: Array<{
    accountId: string;
    accountName: string;
    amount: number;
  }>;
  totalDebit: number;
  totalCredit: number;
};

export default function JVPage() {
  const today = new Date().toISOString().split("T")[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<Voucher | null>(null);

  const [entries, setEntries] = useState<Entry[]>([
    { id: "1", accountId: "", accountName: "", amount: "", type: "DEBIT" },
    { id: "2", accountId: "", accountName: "", amount: "", type: "CREDIT" },
  ]);
  const [date, setDate] = useState(today);
  const [narration, setNarration] = useState("");
  const [voucher, setVoucher] = useState<Any>(null);
  const [saving, setSaving] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      toast.error("Session expired");
      return;
    }

    loadVouchers();
    loadAccounts();
  }, []);

  async function loadVouchers() {
    try {
      const res = await fetch("/api/jv", {
        headers: { "x-user-role": user?.role || "" },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVouchers(data);
      }
    } catch (e) {
      console.error("Load vouchers error:", e);
    }
  }

  async function loadAccounts() {
    fetch("/api/accounts", {
      method: "GET",
      headers: { "x-user-role": user?.role || "" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
        } else {
          setAccounts(data.accounts || []);
        }
      })
      .catch((err) => {
        console.error("Accounts load error:", err);
      });
  }

  function addEntry() {
    setEntries([
      ...entries,
      {
        id: Date.now().toString(),
        accountId: "",
        accountName: "",
        amount: "",
        type: "DEBIT",
      },
    ]);
  }

  function removeEntry(id: string) {
    if (entries.length <= 2) {
      toast.error("At least 2 entries required");
      return;
    }
    setEntries(entries.filter((e) => e.id !== id));
  }

  function updateEntry(id: string, field: keyof Entry, value: Any) {
    setEntries(
      entries.map((e) => {
        if (e.id === id) {
          if (field === "accountId") {
            const account = accounts.find((a) => a.id === value);
            return {
              ...e,
              accountId: value,
              accountName: account?.name || "",
            };
          }
          if (field === "type") {
            const currentAmount = Number(e.amount) || 0;
            return {
              ...e,
              type: value,
              amount:
                value === "DEBIT"
                  ? Math.abs(currentAmount).toString()
                  : (-Math.abs(currentAmount)).toString(),
            };
          }
          if (field === "amount") {
            const numValue = Number(value);
            if (isNaN(numValue)) {
              return { ...e, amount: "" };
            }
            const absValue = Math.abs(numValue);
            return {
              ...e,
              amount:
                e.type === "DEBIT" ? absValue.toString() : (-absValue).toString(),
            };
          }
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  }

  const totalDebit = entries.reduce((sum, e) => {
    const amount = Number(e.amount) || 0;
    return sum + (amount > 0 ? amount : 0);
  }, 0);

  const totalCredit = entries.reduce((sum, e) => {
    const amount = Number(e.amount) || 0;
    return sum + (amount < 0 ? Math.abs(amount) : 0);
  }, 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function saveJV() {
    if (!isBalanced) {
      alert(`Debit (${totalDebit}) and Credit (${totalCredit}) must be equal`);
      return;
    }

    for (const entry of entries) {
      if (!entry.accountId) {
        alert("All entries must have an account");
        return;
      }
      const amount = Number(entry.amount);
      if (isNaN(amount) || amount === 0) {
        alert("All entries must have non-zero amount");
        return;
      }
    }

    setSaving(true);

    try {
      const url = "/api/jv";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
        },
        body: JSON.stringify(editing ? {
          id: editing.id,
          entries: entries.map((e) => ({
            accountId: e.accountId,
            amount: Number(e.amount),
          })),
          date,
          narration,
        } : {
          entries: entries.map((e) => ({
            accountId: e.accountId,
            amount: Number(e.amount),
          })),
          date,
          narration,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Error: ${data?.error || "Save failed"}`);
        return;
      }

      setVoucher(data);
      alert(editing ? "JV updated successfully!" : "Journal Voucher saved successfully!");
      await loadVouchers();
      resetForm();
      setShowForm(false);
      setEditing(null);
    } catch (error: Any) {
      alert(`Error: ${error.message || "Failed to save JV"}`);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEntries([
      { id: "1", accountId: "", accountName: "", amount: "", type: "DEBIT" },
      { id: "2", accountId: "", accountName: "", amount: "", type: "CREDIT" },
    ]);
    setNarration("");
    setDate(today);
  }

  function startEdit(v: Voucher) {
    setEditing(v);
    setDate(v.date);
    setNarration(v.narration);
    setEntries(
      v.entries.map((e, idx) => ({
        id: (idx + 1).toString(),
        accountId: e.accountId,
        accountName: e.accountName,
        amount: e.amount.toString(),
        type: e.amount > 0 ? "DEBIT" : "CREDIT",
      }))
    );
    setShowForm(true);
    setShowList(false);
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Are you sure you want to delete this JV?")) {
      return;
    }

    try {
      const res = await fetch(`/api/jv?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-role": user?.role || "" },
      });

      if (res.ok) {
        toast.success("JV deleted successfully!");
        await loadVouchers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Delete failed");
      }
    } catch (_e) {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Journal Voucher (JV)</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowList(!showList);
              setShowForm(!showForm);
              setEditing(null);
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setShowList(false);
              setEditing(null);
              resetForm();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New JV
          </button>
        </div>
      </div>

      {/* VOUCHER LIST */}
      {showList && (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Voucher No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Narration</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">
                    No JVs found
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{v.voucherNo}</td>
                    <td className="p-3">{v.date}</td>
                    <td className="p-3">{v.narration}</td>
                    <td className="p-3 text-right">{v.totalDebit.toLocaleString()}</td>
                    <td className="p-3 text-right">{v.totalCredit.toLocaleString()}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(v)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteVoucher(v.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold">
            {editing ? "Edit JV" : "New JV"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Narration</label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Description of transaction"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold">Entries</h3>
              <button
                onClick={addEntry}
                className="bg-blue-600 text-white px-4 py-1 rounded text-sm"
              >
                + Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border min-w-[600px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Account</th>
                    <th className="border p-2 text-center w-24">Type</th>
                    <th className="border p-2 text-right">Amount</th>
                    <th className="border p-2 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="border p-2">
                        <select
                          value={entry.accountId}
                          onChange={(e) =>
                            updateEntry(entry.id, "accountId", e.target.value)
                          }
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="">Select Account</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border p-2">
                        <select
                          value={entry.type}
                          onChange={(e) =>
                            updateEntry(entry.id, "type", e.target.value as "DEBIT" | "CREDIT")
                          }
                          className="w-full border rounded px-2 py-1"
                        >
                          <option value="DEBIT">Debit</option>
                          <option value="CREDIT">Credit</option>
                        </select>
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.amount}
                          onChange={(e) =>
                            updateEntry(entry.id, "amount", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-full border rounded px-2 py-1 text-right"
                        />
                      </td>
                      <td className="border p-2 text-center">
                        {entries.length > 2 && (
                          <button
                            onClick={() => removeEntry(entry.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        )}
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
                      <div className="space-y-1">
                        <div>
                          Debit: <span className="text-green-600">{totalDebit.toFixed(2)}</span>
                        </div>
                        <div>
                          Credit: <span className="text-blue-600">{totalCredit.toFixed(2)}</span>
                        </div>
                        <div
                          className={
                            isBalanced ? "text-green-600" : "text-red-600"
                          }
                        >
                          {isBalanced ? "✓ Balanced" : "✗ Not Balanced"}
                        </div>
                      </div>
                    </td>
                    <td className="border p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                resetForm();
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded font-bold"
            >
              Cancel
            </button>
            <button
              onClick={saveJV}
              disabled={saving || !isBalanced}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-bold"
            >
              {saving ? "Saving..." : editing ? "Update JV" : "Save JV"}
            </button>
          </div>
        </div>
      )}

      {/* VOUCHER PREVIEW */}
      {voucher && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Journal Voucher Saved</h2>
          <div className="space-y-2">
            <p>
              <strong>Voucher No:</strong> {voucher.voucherNo}
            </p>
            <p>
              <strong>Date:</strong> {voucher.date}
            </p>
            <p>
              <strong>Narration:</strong> {voucher.narration}
            </p>
            <div className="mt-4">
              <h3 className="font-bold mb-2">Entries:</h3>
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Account</th>
                    <th className="border p-2 text-right">Debit</th>
                    <th className="border p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.entries?.map((entry: Any, idx: number) => (
                    <tr key={idx}>
                      <td className="border p-2">{entry.account?.name || entry.accountName || "N/A"}</td>
                      <td className="border p-2 text-right">
                        {entry.amount > 0 ? entry.amount.toFixed(2) : "-"}
                      </td>
                      <td className="border p-2 text-right">
                        {entry.amount < 0 ? Math.abs(entry.amount).toFixed(2) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td className="border p-2 text-right">Total:</td>
                    <td className="border p-2 text-right">{totalDebit.toFixed(2)}</td>
                    <td className="border p-2 text-right">{totalCredit.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
              >
                Print
              </button>
              <button
                onClick={() => {
                  setVoucher(null);
                  resetForm();
                }}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded"
              >
                New JV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
