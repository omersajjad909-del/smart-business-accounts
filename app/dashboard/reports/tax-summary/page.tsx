"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";
import { exportToPDF } from "@/lib/pdf-export";

type TaxSummary = {
  taxType: string;
  taxCode: string;
  taxRate: number;
  invoiceCount: number;
  totalSubtotal: number;
  totalTaxAmount: number;
  totalAmount: number;
  averageTaxRate: number;
};

export default function TaxSummaryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState<TaxSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/tax-summary?from=${from}&to=${to}`,
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

  const totalTax = data.reduce((sum, d) => sum + d.totalTaxAmount, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tax Summary Report</h1>

      <div className="flex gap-4 items-end bg-white p-4 border rounded">
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
              onClick={() => exportToCSV(data, "tax-summary")}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              Export CSV
            </button>
            <button
              onClick={() =>
                exportToPDF(
                  data,
                  "Tax Summary Report",
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
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Tax Amount</p>
              <p className="text-2xl font-bold">{totalTax.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">
                {totalAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <p className="text-sm text-gray-600">Tax Types</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Tax Type</th>
              <th className="p-3 text-left">Tax Code</th>
              <th className="p-3 text-right">Tax Rate (%)</th>
              <th className="p-3 text-right">Invoices</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Tax Amount</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  No tax data found
                </td>
              </tr>
            ) : (
              data.map((d, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 font-bold">{d.taxType}</td>
                  <td className="p-3">{d.taxCode}</td>
                  <td className="p-3 text-right">{d.taxRate}%</td>
                  <td className="p-3 text-right">{d.invoiceCount}</td>
                  <td className="p-3 text-right">
                    {d.totalSubtotal.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {d.totalTaxAmount.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    {d.totalAmount.toLocaleString()}
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
