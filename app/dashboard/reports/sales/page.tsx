"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type Account = { id: string; name: string };
type Row = {
  date: string;
  invoiceNo: string;
  customer: string;
  item: string;
  qty: number;
  rate: number;
  amount: number;
};

export default function SalesReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [customers, setCustomers] = useState<Account[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;
    fetch("/api/accounts", { headers: { "x-user-role": user.role } })
      .then(r => r.json())
      .then(d => setCustomers((Array.isArray(d) ? d : []).filter((a: Any) => a.partyType === "CUSTOMER")))
      .catch(err => console.error("Customer fetch error:", err));
  }, []);

  async function loadReport() {
    setLoading(true);
    const user = getCurrentUser();
    
    const qs = new URLSearchParams({
      from,
      to,
      ...(customerId && { customerId }),
    });

    try {
      const res = await fetch(`/api/reports/sales?${qs}`, {
        headers: { "x-user-role": user?.role || "ADMIN" }
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(); }, []);

  // 📊 CALCULATE TOTALS
  const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-bold">
      <h1 className="text-3xl font-black uppercase italic border-b-4 border-black pb-2">Sales Report</h1>

      {/* FILTER BAR */}
      <div className="flex gap-4 flex-wrap items-end bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">Customer</label>
          <select className="border-2 border-black px-3 py-2 outline-none w-48" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">From</label>
          <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase">To</label>
          <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={loadReport} className="bg-black text-white px-8 py-2.5 font-black uppercase hover:bg-gray-800 transition-all">
          {loading ? "Loading..." : "Show Report"}
        </button>
        {rows.length > 0 && (
          <button 
            onClick={() => exportToCSV(rows, "sales-report")} 
            className="bg-green-600 text-white px-6 py-2.5 font-black uppercase hover:bg-green-700 transition-all"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="border-2 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-3 text-left border-r border-gray-700">DATE</th>
              <th className="p-3 text-left border-r border-gray-700">INVOICE</th>
              <th className="p-3 text-left border-r border-gray-700">CUSTOMER</th>
              <th className="p-3 text-left border-r border-gray-700">ITEM</th>
              <th className="p-3 text-right border-r border-gray-700 w-24">QTY</th>
              <th className="p-3 text-right border-r border-gray-700 w-32">RATE</th>
              <th className="p-3 text-right w-40">AMOUNT</th>
            </tr>
          </thead>

          <tbody className="divide-y-2 divide-black uppercase">
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center animate-pulse">Fetching Data...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic">No Sales Data Found</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-yellow-50">
                  <td className="p-3 border-r-2 border-black">{r.date}</td>
                  <td className="p-3 border-r-2 border-black">#{r.invoiceNo}</td>
                  <td className="p-3 border-r-2 border-black text-blue-900">{r.customer}</td>
                  <td className="p-3 border-r-2 border-black">{r.item}</td>
                  <td className="p-3 border-r-2 border-black text-right">{(r.qty || 0).toLocaleString()}</td>
                  <td className="p-3 border-r-2 border-black text-right">{(r.rate || 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-black bg-gray-50">{(r.amount || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>

          {/* 📊 FOOTER WITH QTY AND AMOUNT TOTAL */}
          {rows.length > 0 && (
            <tfoot className="bg-black text-white font-black">
              <tr>
                <td colSpan={4} className="p-4 text-right uppercase tracking-widest border-r border-gray-800">Grand Total</td>
                <td className="p-4 text-right text-lg border-r border-gray-800 bg-gray-900">
                  {totalQty.toLocaleString()}
                </td>
                <td className="p-4 border-r border-gray-800 bg-gray-900"></td>
                <td className="p-4 text-right text-xl bg-gray-900">
                  {totalAmount.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}