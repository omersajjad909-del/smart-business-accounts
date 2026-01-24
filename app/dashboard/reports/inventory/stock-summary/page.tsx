"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type StockRow = {
  itemId: string;
  itemName: string;
  description: string;
  unit: string;
  stockQty: number;
};

export default function StockSummaryPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOnDate, setAsOnDate] = useState(today);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch(`/api/reports/inventory/stock-summary?date=${asOnDate}`, {
        headers: { "x-user-role": user?.role || "" }
      });
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStock(); }, [asOnDate]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-black uppercase italic">Current Stock Status</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Inventory Balance Report</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={asOnDate} onChange={e => setAsOnDate(e.target.value)} className="border-2 border-black px-4 py-2 font-bold outline-none" />
          <button onClick={loadStock} className="bg-black text-white px-6 py-2 font-bold uppercase hover:bg-gray-800 transition-all">Refresh</button>
        </div>
      </div>

      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-black text-white uppercase font-black">
            <tr>
              <th className="p-4 text-left border-r border-gray-700">Item Description</th>
              <th className="p-4 text-center border-r border-gray-700 w-32">Unit</th>
              <th className="p-4 text-right w-48">Available Qty</th>
            </tr>
          </thead>
          <tbody className="font-bold uppercase">
            {loading ? (
              <tr><td colSpan={3} className="p-10 text-center animate-pulse">Checking Warehouse...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">No Stock Found.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b-2 border-black hover:bg-yellow-50 transition-colors">
                  <td className="p-4 border-r-2 border-black">
                    <div>{r.itemName}</div>
                    <div className="text-[10px] text-gray-500 normal-case">
                      {r.description || ""}
                    </div>
                  </td>
                  <td className="p-4 text-center border-r-2 border-black text-gray-600">{r.unit}</td>
                  <td className={`p-4 text-right text-lg ${r.stockQty < 5 ? 'text-red-600 bg-red-50' : 'text-blue-700'}`}>
                    {r.stockQty.toLocaleString()}
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
