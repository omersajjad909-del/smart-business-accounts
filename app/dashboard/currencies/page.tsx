"use client";

import { useState, useEffect } from "react";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1,
  });

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    }
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/currencies");
      if (!response.ok) {
        throw new Error("Failed to fetch currencies");
      }
      const data = await response.json();
      // Ensure data is an array
      setCurrencies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please login first");
      return;
    }
    setLoading(true);

    try {
      const url = editing
        ? `/api/currencies?id=${editing}`
        : "/api/currencies";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": user.role || "",
          "x-user-id": user.id || "",
        },
        body: JSON.stringify({
          ...formData,
          exchangeRate: parseFloat(formData.exchangeRate.toString()),
        }),
      });

      if (response.ok) {
        alert(editing ? "Currency updated!" : "Currency added!");
        fetchCurrencies();
        setFormData({ code: "", name: "", symbol: "", exchangeRate: 1 });
        setEditing(null);
      } else {
        const data = await response.json();
        alert("Error: " + (data.error || "Failed to save"));
      }
    } catch (error) {
      console.error("Error saving currency:", error);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this currency?")) return;
    if (!user) return alert("Please login first");

    try {
      const response = await fetch(`/api/currencies?id=${id}`, { 
        method: "DELETE",
        headers: {
          "x-user-role": user.role || "",
          "x-user-id": user.id || "",
        }
      });
      
      if (response.ok) {
        alert("Currency deleted");
        fetchCurrencies();
      } else {
        const data = await response.json();
        alert("Error: " + (data.error || "Failed to delete"));
      }
    } catch (error) {
      console.error("Error deleting currency:", error);
      alert("Network error");
    }
  };

  const handleEdit = (currency: Currency) => {
    setEditing(currency.id);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          💱 Currency Management
        </h1>

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Code (e.g., USD)"
                value={formData.code}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Name (e.g., US Dollar)"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Symbol ($)"
                value={formData.symbol}
                onChange={(e) =>
                  setFormData({ ...formData, symbol: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="number"
                placeholder="Exchange Rate"
                step="0.01"
                value={formData.exchangeRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exchangeRate: parseFloat(e.target.value),
                  })
                }
                className="px-3 py-2 border rounded"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
              >
                {loading
                  ? "Loading..."
                  : editing
                    ? "Update"
                    : "Add"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormData({
                      code: "",
                      name: "",
                      symbol: "",
                      exchangeRate: 1,
                    });
                  }}
                  className="px-6 bg-gray-400 text-white py-2 rounded font-semibold hover:bg-gray-500"
                >
                 Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Symbol</th>
                  <th className="px-6 py-3 text-left">Exchange Rate</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency) => (
                  <tr key={currency.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">
                      {currency.code}
                    </td>
                    <td className="px-6 py-3">{currency.name}</td>
                    <td className="px-6 py-3">{currency.symbol}</td>
                    <td className="px-6 py-3">
                      {currency.exchangeRate.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(currency)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Edit  
                      </button>
                      <button
                        onClick={() => handleDelete(currency.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                       Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
