"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

type StockRow = {
  itemId: string;
  itemName: string;
  description: string;
  unit: string;
  stockQty: number;
};

function stockQtyClass(qty: number) {
  if (qty < 0) return "bg-red-100 text-red-800";
  if (qty === 0) return "bg-slate-200 text-slate-900";
  if (qty < 5) return "bg-amber-100 text-amber-900";
  return "bg-blue-100 text-blue-800";
}

function stockStatusLabel(qty: number) {
  if (qty < 0) return "Oversold";
  if (qty === 0) return "Out of stock";
  if (qty < 5) return "Low stock";
  return "In stock";
}

export default function StockSummaryPage() {
  const { isMobile } = useResponsive();
  const today = new Date().toISOString().slice(0, 10);
  const [asOnDate, setAsOnDate] = useState(today);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch(`/api/reports/inventory/stock-summary?date=${asOnDate}`, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        },
      });
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStock();
  }, [asOnDate]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-end justify-between border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic text-white">Current Stock Status</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-slate-300">Inventory Balance Report</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={asOnDate}
            onChange={(e) => setAsOnDate(e.target.value)}
            className="border-2 border-slate-700 bg-slate-950 px-4 py-2 font-bold text-white outline-none"
          />
          <button
            onClick={loadStock}
            className="bg-black px-6 py-2 font-bold uppercase text-white transition-all hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-black font-black uppercase text-white">
            <tr>
              <th className="border-r border-gray-700 p-4 text-left">Item Description</th>
              <th className="w-32 border-r border-gray-700 p-4 text-center">Unit</th>
              <th className="w-48 p-4 text-right">Available Qty</th>
            </tr>
          </thead>
          <tbody className="font-bold uppercase text-slate-950">
            {loading ? (
              <tr>
                <td colSpan={3} className="p-10 text-center text-slate-700 animate-pulse">
                  Checking Warehouse...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-10 text-center italic text-gray-400">
                  No Stock Found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.itemId}
                  className="group border-b-2 border-black bg-white transition-colors hover:bg-amber-50"
                >
                  <td className="border-r-2 border-black p-4 text-slate-950">
                    <div className="font-extrabold text-slate-950">{r.itemName || "Unnamed Item"}</div>
                    <div className="text-[10px] normal-case text-slate-500 group-hover:text-slate-700">
                      {r.description || ""}
                    </div>
                  </td>
                  <td className="border-r-2 border-black p-4 text-center font-extrabold text-slate-700 group-hover:text-slate-900">
                    {r.unit || "-"}
                  </td>
                  <td className={`p-4 text-right text-lg ${stockQtyClass(r.stockQty)}`}>
                    <div>{r.stockQty.toLocaleString()}</div>
                    <div className="text-[10px] font-black uppercase tracking-wide opacity-80">
                      {stockStatusLabel(r.stockQty)}
                    </div>
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
