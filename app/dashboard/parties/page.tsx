"use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  name: string;
  partyType: "CUSTOMER" | "SUPPLIER" | null;
};

export default function PartyAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partyType, setPartyType] =
    useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  async function saveParty() {
    if (!name.trim()) return;

    setLoading(true);

    const method = editingId ? "PUT" : "POST";
    const body: any = {
      name,
      type: partyType === "CUSTOMER" ? "ASSET" : "LIABILITY",
      partyType,
    };

    if (editingId) {
      body.id = editingId;
    } else {
      body.code = `${partyType[0]}-${Date.now()}`;
    }

    await fetch("/api/accounts", {
      method,
      headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
      body: JSON.stringify(body),
    });

    setName("");
    setPartyType("CUSTOMER");
    setEditingId(null);
    setLoading(false);
    loadAccounts();
  }

  function handleEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setPartyType(account.partyType === "CUSTOMER" ? "CUSTOMER" : "SUPPLIER");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setPartyType("CUSTOMER");
  }

  async function deleteParty(id: string) {
    if (!confirm("Delete this party? This cannot be undone.")) return;

    await fetch(`/api/accounts?id=${id}`, {
      method: "DELETE",
      headers: { "x-user-role": "ADMIN" },
    });

    loadAccounts();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-xl font-semibold">Party Accounts</h2>

      {/* Add Party */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Party Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Phone (Optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <select
          className="border rounded px-3 py-2 w-full"
          value={partyType}
          onChange={(e) =>
            setPartyType(e.target.value as "CUSTOMER" | "SUPPLIER")
          }
        >
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={saveParty}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded flex-1 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update Party" : "Add Party"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Party List */}
      <div className="bg-white border rounded-lg divide-y">
        {accounts.filter(a => a.partyType).length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            No parties added yet
          </div>
        )}

        {accounts
          .filter((a) => a.partyType)
          .map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-2"
            >
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-gray-500">
                  {a.partyType}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(a)}
                  className="text-blue-600 text-sm hover:underline font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteParty(a.id)}
                  className="text-red-600 text-sm hover:underline font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
