"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";
import { exportToPDF } from "@/lib/pdf-export";

type ProfitabilityData = {
  customerId?: string;
  customerName?: string;
  itemId?: string;
  itemName?: string;
  invoiceCount?: number;
  quantitySold?: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averagePrice?: number;
  averageCost?: number;
};

export default function ProfitabilityPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState<"customer" | "product">("customer");
  const [data, setData] = useState<ProfitabilityData[]>([]);
  const [loading, setLoading] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    loadReport();
  }, [groupBy]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/profitability?from=${from}&to=${to}&groupBy=${groupBy}`,
        {
          headers: { "x-user-role": user?.role || "ADMIN" },
        }
      );
      const result = await res.json();
      if (Array.isArray(result)) {
        setData(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const totalSales = data.reduce((sum, d) => sum + d.totalSales, 0);
  const totalCost = data.reduce((sum, d) => sum + d.totalCost, 0);
  const totalProfit = totalSales - totalCost;
  const overallMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Profitability Report</h1>

      <div className="flex gap-4 items-end bg-white p-4 border rounded">
        <div>
          <label className="block text-sm font-bold mb-1">Group By</label>
          <select
            className="border p-2 rounded"
            value={groupBy}
            onChange={(e) =>
              setGroupBy(e.target.value as "customer" | "product")
            }
          >
            <option value="customer">By Customer</option>
            <option value="product">By Product</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">From</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">To</label>
          <input
            type="date"
            className="border p-2 rounded"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          onClick={loadReport}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          {loading ? "Loading..." : "Load Report"}
        </button>
        {data.length > 0 && (
          <>
            <button
              onClick={() => exportToCSV(data, "profitability")}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              Export CSV
            </button>
            <button
              onClick={() =>
                exportToPDF(
                  data,
                  "Profitability Report",
                  Object.keys(data[0] || {})
                )
              }
              className="bg-red-600 text-white px-6 py-2 rounded"
            >
              Export PDF
            </button>
          </>
        )}
      </div>

      {data.length > 0 && (
        <div className="bg-white border rounded p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold">{totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold">{totalCost.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold">{totalProfit.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold">
                {overallMargin.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {groupBy === "customer" ? (
                <>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-right">Invoices</th>
                </>
              ) : (
                <>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-right">Qty Sold</th>
                </>
              )}
              <th className="p-3 text-right">Sales</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-right">Profit</th>
              <th className="p-3 text-right">Margin %</th>
              {groupBy === "product" && (
                <>
                  <th className="p-3 text-right">Avg Price</th>
                  <th className="p-3 text-right">Avg Cost</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={groupBy === "customer" ? 6 : 8} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={groupBy === "customer" ? 6 : 8} className="p-4 text-center text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              data.map((d, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 font-bold">
                    {groupBy === "customer" ? d.customerName : d.itemName}
                  </td>
                  <td className="p-3 text-right">
                    {groupBy === "customer"
                      ? d.invoiceCount
                      : d.quantitySold}
                  </td>
                  <td className="p-3 text-right">
                    {d.totalSales.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">{d.totalCost.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">
                    {d.totalProfit.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={`px-2 py-1 rounded ${
                        d.profitMargin >= 20
                          ? "bg-green-100 text-green-800"
                          : d.profitMargin >= 10
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {d.profitMargin.toFixed(2)}%
                    </span>
                  </td>
                  {groupBy === "product" && (
                    <>
                      <td className="p-3 text-right">
                        {d.averagePrice?.toLocaleString() || "N/A"}
                      </td>
                      <td className="p-3 text-right">
                        {d.averageCost?.toLocaleString() || "N/A"}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
