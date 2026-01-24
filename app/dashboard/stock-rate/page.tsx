"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Item = {
  id: string;
  name: string;
  description?: string;
};

type Rate = {
  id: string;
  rate: number;
  date: string;
  item: Item;
  itemId: string;
};

export default function StockRatePage() {
  const today = new Date().toISOString().slice(0, 10);

  const [items, setItems] = useState<Item[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [itemId, setItemId] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today);

  const headers = {
    "Content-Type": "application/json",
    "x-user-role": "ADMIN", // 🔴 REQUIRED
  };

  useEffect(() => {
    fetch("/api/items-new", { headers })
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));

    loadRates();
  }, []);

  function loadRates() {
    fetch("/api/stock-rate", { headers })
      .then(r => r.json())
      .then(d => setRates(Array.isArray(d) ? d : []));
  }

  async function saveRate() {
    if (!itemId || !rate) {
      toast.error("Item aur rate zaroori hai");
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const body = editingId 
      ? { id: editingId, itemId, rate, date }
      : { itemId, rate, date };

    const res = await fetch("/api/stock-rate", {
      method,
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Save failed");
      return;
    }

    toast.success(editingId ? "Rate updated" : "Rate saved");
    resetForm();
    loadRates();
  }

  function handleEdit(r: Rate) {
    setEditingId(r.id);
    setItemId(r.itemId);
    setRate(r.rate.toString());
    setDate(new Date(r.date).toISOString().slice(0, 10));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setItemId("");
    setRate("");
    setDate(today);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this rate?")) {
      return;
    }

    try {
      const res = await fetch(`/api/stock-rate?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-role": "ADMIN" },
      });

      if (res.ok) {
        toast.success("Rate deleted successfully");
        loadRates();
      } else {
        const err = await res.json();
        toast.error(err.error || "Delete failed");
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">

      <h1 className="text-xl md:text-2xl font-semibold">Stock Rate</h1>

      {/* FORM */}
      <div className="border p-4 bg-white space-y-3 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="border p-2 w-full"
            value={itemId}
            onChange={e => setItemId(e.target.value)}
          >
            <option value="">Select Item</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.description})
              </option>
            ))}
          </select>

          <input
            className="border p-2 w-full"
            placeholder="Rate"
            value={rate}
            onChange={e => setRate(e.target.value)}
          />

          <input
            type="date"
            className="border p-2 w-full"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveRate}
            className="bg-blue-600 text-white px-4 py-2 flex-1"
          >
            {editingId ? "Update Rate" : "Save Rate"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-600 text-white px-4 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Item</th>
              <th className="border p-2 text-right">Rate</th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  No rates found
                </td>
              </tr>
            ) : (
              rates.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="border p-2">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="border p-2">
                    {r.item.name} {r.item.description ? `(${r.item.description})` : ""}
                  </td>
                  <td className="border p-2 text-right font-bold">{r.rate.toLocaleString()}</td>
                  <td className="border p-2 text-center space-x-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
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

    </div>
  );
}
