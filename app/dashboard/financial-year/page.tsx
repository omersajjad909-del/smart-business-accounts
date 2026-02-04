"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

type FinancialYear = {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  closedAt?: string;
};

export default function FinancialYearPage() {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  });

  const user = getCurrentUser();
  const canAccess = hasPermission(user, PERMISSIONS.FINANCIAL_YEAR);

  useEffect(() => {
    loadYears();
  }, []);

  if (!canAccess) {
    return <div>Access Denied</div>;
  }

  async function loadYears() {
    setLoading(true);
    try {
      const res = await fetch("/api/financial-year", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setYears(data);
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveYear() {
    if (!formData.year || !formData.startDate || !formData.endDate) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/financial-year", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await loadYears();
        setShowForm(false);
        setFormData({
          year: new Date().getFullYear().toString(),
          startDate: `${new Date().getFullYear()}-01-01`,
          endDate: `${new Date().getFullYear()}-12-31`,
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

  async function closeYear(id: string) {
    if (!confirm("Are you sure you want to close this financial year? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch("/api/financial-year", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ id, isClosed: true, closedBy: user?.id }),
      });

      if (res.ok) {
        await loadYears();
      }
    } catch (e) {
      alert("Close failed");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financial Year Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add Financial Year
        </button>
      </div>

      {showForm && (
        <div className="bg-white border p-6 rounded space-y-4">
          <h2 className="text-xl font-bold">New Financial Year</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Year *</label>
              <input
                type="number"
                className="w-full border p-2 rounded"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Start Date *
              </label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">End Date *</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveYear}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowForm(false)}
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
              <th className="p-3 text-left">Year</th>
              <th className="p-3 text-left">Start Date</th>
              <th className="p-3 text-left">End Date</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Closed</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : years.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No financial years found
                </td>
              </tr>
            ) : (
              years.map((y) => (
                <tr key={y.id} className="border-t">
                  <td className="p-3 font-bold">{y.year}</td>
                  <td className="p-3">
                    {new Date(y.startDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {new Date(y.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        y.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {y.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        y.isClosed
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {y.isClosed ? "Closed" : "Open"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {!y.isClosed && (
                      <button
                        onClick={() => closeYear(y.id)}
                        className="text-red-600 hover:underline"
                      >
                        Close Year
                      </button>
                    )}
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
