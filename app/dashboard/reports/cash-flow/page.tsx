"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

export default function CashFlowPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Any>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch(
        `/api/reports/cash-flow?from=${from}&to=${to}`,
        {
          headers: { "x-user-role": user?.role || "ADMIN" },
        }
      );
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        alert(result.error || "Failed to load cash flow");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading cash flow report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  function exportReport() {
    if (!data) return;
    const exportData = [
      ...data.operating.items.map((item: Any) => ({
        category: "Operating",
        date: item.date,
        voucherNo: item.voucherNo,
        description: item.description,
        type: item.type,
        amount: item.amount,
      })),
      ...data.investing.items.map((item: Any) => ({
        category: "Investing",
        date: item.date,
        voucherNo: item.voucherNo,
        description: item.description,
        type: item.type,
        amount: item.amount,
      })),
      ...data.financing.items.map((item: Any) => ({
        category: "Financing",
        date: item.date,
        voucherNo: item.voucherNo,
        description: item.description,
        type: item.type,
        amount: item.amount,
      })),
    ];
    exportToCSV(exportData, "cash-flow-report");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Cash Flow Statement</h1>

      {/* FILTERS */}
      <div className="bg-white border rounded-lg p-4 flex gap-4 items-end print:hidden">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={loadReport}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold"
        >
          {loading ? "Loading..." : "Load Report"}
        </button>
        {data && (
          <button
            onClick={exportReport}
            className="bg-green-600 text-white px-6 py-2 rounded font-bold"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {/* REPORT */}
      {data && (
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">Cash Flow Statement</h2>
            <p className="text-gray-600">
              {data.period.from} to {data.period.to}
            </p>
          </div>

          {/* OPERATING ACTIVITIES */}
          <div>
            <h3 className="text-xl font-bold mb-3">Operating Activities</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Cash Inflow:</span>
                <span className="text-green-600 font-bold">
                  {data.operating.inflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cash Outflow:</span>
                <span className="text-red-600 font-bold">
                  {data.operating.outflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Net Cash from Operations:</span>
                <span
                  className={
                    data.operating.net >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {data.operating.net.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* INVESTING ACTIVITIES */}
          <div>
            <h3 className="text-xl font-bold mb-3">Investing Activities</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Cash Inflow:</span>
                <span className="text-green-600 font-bold">
                  {data.investing.inflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cash Outflow:</span>
                <span className="text-red-600 font-bold">
                  {data.investing.outflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Net Cash from Investing:</span>
                <span
                  className={
                    data.investing.net >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {data.investing.net.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* FINANCING ACTIVITIES */}
          <div>
            <h3 className="text-xl font-bold mb-3">Financing Activities</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Cash Inflow:</span>
                <span className="text-green-600 font-bold">
                  {data.financing.inflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cash Outflow:</span>
                <span className="text-red-600 font-bold">
                  {data.financing.outflow.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Net Cash from Financing:</span>
                <span
                  className={
                    data.financing.net >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {data.financing.net.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* NET CASH FLOW */}
          <div className="border-t-2 border-black pt-4">
            <div className="flex justify-between text-2xl font-bold">
              <span>Net Increase/Decrease in Cash:</span>
              <span
                className={data.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}
              >
                {data.netCashFlow.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
