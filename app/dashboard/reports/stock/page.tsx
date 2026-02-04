"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Row = {
  itemId: string;
  itemName: string;
  unit: string;
  description: string;
  stockQty: number;
  stockValue: number;
};

export default function StockReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // 👈 نیا فلٹر سٹیٹ: all, remaining, nill
  const [stockStatus, setStockStatus] = useState("all"); 
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadStock();
  }, []);

  async function loadStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch("/api/reports/stock", {
        headers: { "x-user-role": user?.role || "ADMIN" }
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 🔍 فائنل فلٹرنگ لاجک
  const filteredRows = rows.filter((r) => {
    const matchesSearch = r.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // اسٹاک اسٹیٹس فلٹر
    let matchesStatus = true;
    if (stockStatus === "remaining") {
      matchesStatus = r.stockQty > 0;
    } else if (stockStatus === "nill") {
      matchesStatus = r.stockQty <= 0;
    }

    return matchesSearch && matchesStatus;
  });

  const totalQty = filteredRows.reduce((s, r) => s + r.stockQty, 0);
  const totalValue = filteredRows.reduce((s, r) => s + r.stockValue, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-bold">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <h1 className="text-3xl font-black uppercase italic text-gray-800 tracking-tighter text-shadow">Inventory Stock Report</h1>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-2 hover:bg-gray-800 transition print:hidden uppercase text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Print PDF
        </button>
      </div>

      {/* FILTERS SECTION */}
      <div className="flex gap-4 items-end bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:hidden">
        
        {/* Search Item */}
        <div className="flex-1 relative">
          <label className="block text-xs font-black uppercase mb-1 text-gray-500">Search Item</label>
          <input
            type="text"
            placeholder="Type item name..."
            className="w-full border-2 border-black px-3 py-2 outline-none focus:bg-yellow-50"
            value={searchTerm}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 👈 اسٹاک اسٹیٹس ڈراپ ڈاؤن */}
        <div className="w-full md:w-48">
          <label className="block text-xs font-black uppercase mb-1 text-gray-500">Stock Status</label>
          <select 
            value={stockStatus} 
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full border-2 border-black px-3 py-2 outline-none bg-white cursor-pointer hover:bg-gray-50"
          >
            <option value="all">ALL STOCK</option>
            <option value="remaining">REMAINING (Available)</option>
            <option value="nill">NILL (Out of Stock)</option>
          </select>
        </div>

        <button onClick={() => {setSearchTerm(""); setStockStatus("all");}} className="bg-gray-200 border-2 border-black px-6 py-2 uppercase text-xs hover:bg-gray-300 w-full md:w-auto">
          Reset
        </button>
      </div>

      {/* TABLE */}
      <div className="border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead className="bg-black text-white">
            <tr className="uppercase italic">
              <th className="p-4 text-left border-r border-gray-700">Item Name & Description</th>
              <th className="p-4 text-right border-r border-gray-700">Stock Qty</th>
              <th className="p-4 text-left border-r border-gray-700">Unit</th>
              <th className="p-4 text-right">Inventory Value</th>
            </tr>
          </thead>

          <tbody className="divide-y-2 divide-black">
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center animate-pulse">FETCHING INVENTORY...</td></tr>
            ) : filteredRows.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic font-medium">No items found for &quot;{stockStatus}&quot; status.</td></tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.itemId} className={`hover:bg-yellow-50 transition-colors uppercase ${r.stockQty <= 0 ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 border-r-2 border-black">
                    <div className="font-black text-gray-800">{r.itemName}</div>
                    <div className="text-[10px] text-gray-500 italic">{r.description || "No Description"}</div>
                  </td>
                  <td className={`p-4 text-right border-r-2 border-black font-black text-lg ${r.stockQty <= 0 ? "text-red-600" : "text-green-700"}`}>
                    {r.stockQty.toLocaleString()}
                  </td>
                  <td className="p-4 border-r-2 border-black text-gray-600 italic">{r.unit}</td>
                  <td className="p-4 text-right font-black text-blue-900 bg-gray-50/50">
                    {r.stockValue.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {!loading && filteredRows.length > 0 && (
            <tfoot className="bg-black text-white">
              <tr>
                <td className="p-4 text-right font-black uppercase italic">Grand Totals:</td>
                <td className="p-4 text-right text-xl font-black bg-gray-900 border-r border-gray-700">
                  {totalQty.toLocaleString()}
                </td>
                <td className="p-4 bg-gray-900 border-r border-gray-700"></td>
                <td className="p-4 text-right text-2xl font-black bg-blue-900">
                  {totalValue.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
