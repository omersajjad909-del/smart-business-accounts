"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type LowStockRow = {
  itemId: string;
  itemName: string;
  description: string;
  stockQty: number;
  minStock: number;
  unit: string;
};

export default function LowStockPage() {
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLowStock();
  }, []);

  async function loadLowStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch("/api/reports/stock/low", {
        headers: { "x-user-role": user?.role || "ADMIN" }
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-bold">
      {/* ALERT HEADER */}
      <div className="flex justify-between items-center bg-red-600 text-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Low Stock Alert</h1>
          <p className="text-red-100 uppercase text-xs">Items listed below are running out of stock.</p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black">{rows.length}</div>
          <div className="text-xs uppercase">Items at Risk</div>
        </div>
      </div>

      {/* TABLE */}
      <div className="border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-black text-white">
            <tr className="uppercase italic">
              <th className="p-4 text-left border-r border-gray-700">Item Description</th>
              <th className="p-4 text-center border-r border-gray-700">Current Stock</th>
              <th className="p-4 text-center border-r border-gray-700">Min. Level</th>
              <th className="p-4 text-center bg-red-900">Required</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-black">
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center animate-pulse">CHECKING WAREHOUSE...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-green-600 uppercase">All items are sufficiently stocked.</td></tr>
            ) : (
              rows.map((r, i) => {
                const required = r.minStock - r.stockQty;
                return (
                  <tr key={i} className="hover:bg-red-50 transition-colors">
                    <td className="p-4 border-r-4 border-black">
                      <div className="text-lg font-black text-black uppercase">{r.itemName}</div>
                      <div className="text-[10px] text-gray-500 italic">{r.description}</div>
                    </td>
                    <td className="p-4 text-center border-r-4 border-black font-black text-xl text-red-600 bg-red-50">
                      {r.stockQty} <span className="text-xs text-gray-400">{r.unit}</span>
                    </td>
                    <td className="p-4 text-center border-r-4 border-black font-bold text-gray-600 bg-gray-50">
                      {r.minStock}
                    </td>
                    <td className="p-4 text-center font-black text-2xl text-white bg-red-600 animate-pulse">
                      {required > 0 ? `+${required}` : "ALERT"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end print:hidden">
        <button 
          onClick={loadLowStock}
          className="bg-black text-white px-10 py-3 border-2 border-black hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all uppercase"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}