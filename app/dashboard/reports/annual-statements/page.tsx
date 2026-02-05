"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";
import { exportToPDF } from "@/lib/pdf-export";

export default function AnnualStatementsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [data, setData] = useState<Any>(null);
  const [loading, setLoading] = useState(false);

  const user = getCurrentUser();

  useEffect(() => {
    loadReport();
  }, [year]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/annual-statements?year=${year}`, {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const result = await res.json();
      if (result.year) {
        setData(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Annual Financial Statements</h1>
        <div className="mt-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Annual Financial Statements - {year}
        </h1>
        <div className="flex gap-2">
          <input
            type="number"
            className="border p-2 rounded"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min="2020"
            max="2100"
          />
          <button
            onClick={loadReport}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {loading ? "Loading..." : "Load"}
          </button>
          {data && (
            <>
              <button
                onClick={() => exportToCSV(data.accounts, `annual-statements-${year}`)}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Export CSV
              </button>
              <button
                onClick={() =>
                  exportToPDF(
                    data.accounts,
                    `Annual Statements ${year}`,
                    ["code", "name", "type", "openingBalance", "transactions", "closingBalance"]
                  )
                }
                className="bg-red-600 text-white px-6 py-2 rounded"
              >
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Balance Sheet</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Assets:</span>
              <span className="font-bold">
                {data.balanceSheet.assets.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Liabilities:</span>
              <span className="font-bold">
                {data.balanceSheet.liabilities.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Equity:</span>
              <span className="font-bold">
                {data.balanceSheet.equity.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>{data.balanceSheet.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Profit & Loss</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Income:</span>
              <span className="font-bold text-green-600">
                {data.profitLoss.income.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Expenses:</span>
              <span className="font-bold text-red-600">
                {data.profitLoss.expenses.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-bold">
                <span>Net Profit:</span>
                <span
                  className={
                    data.profitLoss.netProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {data.profitLoss.netProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white border rounded overflow-hidden">
        <h2 className="text-xl font-bold p-4 border-b">Account Details</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Account Name</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Opening</th>
              <th className="p-3 text-right">Transactions</th>
              <th className="p-3 text-right">Closing</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map((acc: Any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-3">{acc.code}</td>
                <td className="p-3">{acc.name}</td>
                <td className="p-3">{acc.type}</td>
                <td className="p-3 text-right">
                  {acc.openingBalance.toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  {acc.transactions.toLocaleString()}
                </td>
                <td className="p-3 text-right font-bold">
                  {acc.closingBalance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
