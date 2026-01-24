"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Item = {
  id: string;
  name: string;
  description?: string | null;
};

type Row = {
  date: string;
  type: string;
  party: string;
  inQty: number;
  outQty: number;
  balanceQty: number;
};

export default function StockLedgerPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<Item[]>([]);
  const [itemId, setItemId] = useState("");
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/items-new")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));
  }, []);

  async function loadLedger() {
    if (!itemId) {
      alert("Please select an item first");
      return;
    }
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch(`/api/reports/stock-ledger?itemId=${itemId}&from=${from}&to=${to}`, {
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

  const totalIn = rows.filter(r => r.type !== "OPENING").reduce((sum, r) => sum + r.inQty, 0);
  const totalOut = rows.filter(r => r.type !== "OPENING").reduce((sum, r) => sum + r.outQty, 0);
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].balanceQty : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-bold">
      <h1 className="text-3xl font-black uppercase italic border-b-4 border-black pb-2 text-gray-800">Item Stock Ledger</h1>

      {/* FILTERS */}
      <div className="flex gap-4 flex-wrap items-end bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">Select Item</label>
          <select className="border-2 border-black px-3 py-2 w-64 outline-none focus:bg-yellow-50" value={itemId} onChange={e => setItemId(e.target.value)}>
            <option value="">-- Choose Item --</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}({i.description})</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">From Date</label>
          <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">To Date</label>
          <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={loadLedger} className="bg-black text-white px-8 py-2.5 font-black uppercase hover:bg-gray-800 transition">Show Ledger</button>
      </div>

      {/* TABLE */}
      <div className="border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-3 border-r border-gray-700 text-left">DATE</th>
              <th className="p-3 border-r border-gray-700 text-left">PARTY / DESCRIPTION</th>
              <th className="p-3 border-r border-gray-700 text-left">TYPE</th>
              <th className="p-3 border-r border-gray-700 text-right">IN (+)</th>
              <th className="p-3 border-r border-gray-700 text-right">OUT (-)</th>
              <th className="p-3 text-right bg-gray-900">BALANCE</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center animate-pulse uppercase">Fetching Ledger...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">SELECT AN ITEM AND CLICK SHOW</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={`hover:bg-yellow-50 ${r.type === 'OPENING' ? 'bg-blue-50' : ''}`}>
                  <td className="p-3 border-r-2 border-black">{r.date}</td>
                  <td className={`p-3 border-r-2 border-black uppercase ${r.type === 'OPENING' ? 'italic' : ''}`}>{r.party}</td>
                  <td className="p-3 border-r-2 border-black">
                    <span className={`px-2 py-0.5 text-[10px] border border-black ${r.type === 'SALE' ? 'bg-orange-400' : r.type === 'PURCHASE' ? 'bg-green-400' : 'bg-gray-200'}`}>
                      {r.type}
                    </span>
                  </td>
                  <td className="p-3 border-r-2 border-black text-right text-green-700">{r.inQty || "-"}</td>
                  <td className="p-3 border-r-2 border-black text-right text-red-700">{r.outQty || "-"}</td>
                  <td className="p-3 text-right font-black bg-gray-100">{r.balanceQty.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot className="bg-black text-white font-black">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase tracking-tighter">Current Period Totals:</td>
                <td className="p-3 text-right text-green-400 border-l border-gray-700">{totalIn.toLocaleString()}</td>
                <td className="p-3 text-right text-red-400 border-l border-gray-700">{totalOut.toLocaleString()}</td>
                <td className="p-3 text-right text-xl bg-blue-900 border-l-2 border-white">{finalBalance.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}