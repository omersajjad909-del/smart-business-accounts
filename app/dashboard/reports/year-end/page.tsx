"use client";

import { useState } from "react";

export default function YearEndClosingPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runClosing() {
    if (!confirm("⚠️ Year end closing irreversible hai. Confirm?")) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/reports/year-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Closing failed");
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function format(val: number) {
    return val >= 0
      ? val.toLocaleString()
      : `(${Math.abs(val).toLocaleString()})`;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <h1 className="text-2xl font-extrabold text-red-700">
        Year End Closing
      </h1>

      {/* WARNING */}
      <div className="border border-red-400 bg-red-50 p-4 text-sm">
        ⚠️ <b>Warning:</b>  
        <br />
        Year end closing ek dafa hoti hai.  
        Income & Expense zero ho jayenge aur result Capital me transfer ho ga.
      </div>

      {/* FORM */}
      <div className="bg-white border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">
            Closing Date (As On)
          </label>
          <input
            type="date"
            className="border px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button
          onClick={runClosing}
          disabled={loading}
          className="bg-red-700 text-white px-6 py-2 disabled:opacity-60"
        >
          {loading ? "Closing Year..." : "Run Year End Closing"}
        </button>

        {error && (
          <div className="text-red-600 font-semibold">
            ❌ {error}
          </div>
        )}
      </div>

      {/* RESULT */}
      {result && (
        <div className="bg-green-50 border border-green-400 p-6 space-y-2">
          <h2 className="text-xl font-bold text-green-700">
            ✅ Year Closed Successfully
          </h2>

          <div className="flex justify-between">
            <span>Total Income:</span>
            <span>{format(result.incomeTotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Total Expense:</span>
            <span>{format(result.expenseTotal)}</span>
          </div>

          <div className="flex justify-between font-bold border-t pt-2">
            <span>
              {result.profit >= 0 ? "Net Profit:" : "Net Loss:"}
            </span>
            <span>{format(result.profit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
