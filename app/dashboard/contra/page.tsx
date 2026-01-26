"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ResponsiveContainer";
import { ResponsiveForm, FormField, Input, Select, Button, FormActions } from "@/components/ResponsiveForm";
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, StatusBadge } from "@/components/MobileTable";
import toast from "react-hot-toast";

type ContraEntry = {
  id: string;
  contraNo: string;
  date: string;
  amount: number;
  fromAccount: { id: string; name: string };
  toAccount: { id: string; name: string };
  narration?: string;
  createdAt: string;
};

type Account = {
  id: string;
  name: string;
  type: string;
};

export default function ContraPage() {
  const [entries, setEntries] = useState<ContraEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [contraNo, setContraNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [narration, setNarration] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        fetch("/api/contra"),
        fetch("/api/accounts"),
      ]);

      const entriesData = await entriesRes.json();
      const accountsData = await accountsRes.json();

      setEntries(entriesData);
      
      // Filter only CASH and BANK accounts
      const cashBankAccounts = accountsData.filter(
        (acc: Account) => acc.type === "CASH" || acc.type === "BANK"
      );
      setAccounts(cashBankAccounts);

      // Generate next contra number
      if (entriesData.length > 0) {
        const lastNo = Math.max(...entriesData.map((e: ContraEntry) => {
          const match = e.contraNo.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }));
        setContraNo(`CE-${String(lastNo + 1).padStart(3, "0")}`);
      } else {
        setContraNo("CE-001");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fromAccountId || !toAccountId || !amount) {
      toast.error("Please fill all required fields");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("From and To accounts cannot be the same");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/contra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contraNo,
          date,
          amount: parseFloat(amount),
          fromAccountId,
          toAccountId,
          narration,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Contra entry created successfully!");
        resetForm();
        fetchData();
        setShowForm(false);
      } else {
        toast.error(data.error || "Failed to create contra entry");
      }
    } catch (error) {
      console.error("Error creating contra entry:", error);
      toast.error("Failed to create contra entry");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setFromAccountId("");
    setToAccountId("");
    setNarration("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this contra entry?")) return;

    try {
      const res = await fetch(`/api/contra?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Contra entry deleted!");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  }

  if (loading && entries.length === 0) {
    return (
      <ResponsiveContainer>
        <div className="text-center py-10">Loading...</div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer maxWidth="xl">
      <PageHeader
        title="💱 Contra Entry"
        subtitle="Cash to Bank / Bank to Bank transfers"
        actions={
          <Button
            variant="primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ New Contra Entry"}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <ResponsiveForm onSubmit={handleSubmit} columns={2}>
            <FormField label="Contra No" required>
              <Input
                type="text"
                value={contraNo}
                onChange={(e) => setContraNo(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Date" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="From Account (Credit)" required>
              <Select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="To Account (Debit)" required>
              <Select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Amount" required>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </FormField>

            <FormField label="Narration" fullWidth>
              <Input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional description"
              />
            </FormField>

            <FormActions>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Contra Entry"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </FormActions>
          </ResponsiveForm>
        </Card>
      )}

      <Card>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <DesktopTable>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contra No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  From Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  To Account
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No contra entries found. Create your first one!
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {entry.contraNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.fromAccount.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {entry.toAccount.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      Rs. {entry.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DesktopTable>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <MobileTable
            data={entries}
            emptyMessage="No contra entries found. Create your first one!"
            renderCard={(entry) => (
              <MobileCard>
                <MobileCardRow label="Contra No" value={entry.contraNo} />
                <MobileCardRow
                  label="Date"
                  value={new Date(entry.date).toLocaleDateString()}
                />
                <MobileCardRow label="From" value={entry.fromAccount.name} />
                <MobileCardRow label="To" value={entry.toAccount.name} />
                <MobileCardRow
                  label="Amount"
                  value={`Rs. ${entry.amount.toLocaleString()}`}
                  valueClassName="font-bold text-green-600"
                />
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(entry.id)}
                    className="w-full"
                  >
                    Delete
                  </Button>
                </div>
              </MobileCard>
            )}
          />
        </div>
      </Card>
    </ResponsiveContainer>
  );
}
