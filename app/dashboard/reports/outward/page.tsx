"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

export default function OutwardReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🛠️ کسٹمرز لوڈ کرنا (With Safety Fix)
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => {
        // چیک کریں کہ d ایرے ہے، اگر نہیں تو خالی ایرے سیٹ کریں
        const data = Array.isArray(d) ? d : (d.accounts || []);
        setCustomers(data.filter((a: any) => a.partyType === "CUSTOMER"));
      })
      .catch(err => console.error("Customer fetch error:", err));
  }, []);

  // 🛠️ رپورٹ ڈیٹا لوڈ کرنا (With Auth Headers)
  async function loadReport() {
    setLoading(true);
    const user = getCurrentUser(); // رول حاصل کریں
    try {
      const res = await fetch(`/api/reports/outward?from=${fromDate}&to=${toDate}&customerId=${customerId}`, {
        method: "GET",
        headers: {
          "x-user-role": user?.role || "ADMIN" // یہ ہیڈر لازمی ہے
        },
        cache: 'no-store'
      });
      const data = await res.json();
      // اگر ڈیٹا ایرے نہیں ہے تو خالی ایرے سیٹ کریں تاکہ کریش نہ ہو
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Report load error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(); }, []);

  const totalQty = rows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-white min-h-screen font-bold">
      
      {/* --- FILTERS --- */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
          <input type="date" className="border-2 border-black p-2 outline-none" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
          <input type="date" className="border-2 border-black p-2 outline-none" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">Customer</label>
          <select className="border-2 border-black p-2 outline-none" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={loadReport} className="bg-black text-white px-6 rounded-none font-black uppercase text-xs h-10 hover:bg-gray-800">
            {loading ? "Loading..." : "Filter"}
          </button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 rounded-none font-black uppercase text-xs h-10">Print</button>
          {rows.length > 0 && (
            <button 
              onClick={() => exportToCSV(rows, "outward-report")} 
              className="bg-green-600 text-white px-6 rounded-none font-black uppercase text-xs h-10"
            >
              📥 CSV
            </button>
          )}
        </div>
      </div>

      {/* --- REPORT VIEW --- */}
      <div className="invoice-print">
        <div className="mb-6 border-b-4 border-black pb-4 text-center">
          <h1 className="text-4xl font-black uppercase italic">US TRADERS</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Outward Dispatch Report</p>
          <p className="text-xs">{fromDate} TO {toDate}</p>
        </div>

        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-black text-white">
              <th className="p-2 border border-black text-xs uppercase">GP #</th>
              <th className="p-2 border border-black text-xs uppercase">Date</th>
              <th className="p-2 border border-black text-xs uppercase text-left">Customer</th>
              <th className="p-2 border border-black text-xs uppercase text-left">Vehicle / Driver</th>
              <th className="p-2 border border-black text-xs uppercase text-left">Item Name</th>
              <th className="p-2 border border-black text-xs uppercase">Qty</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.length === 0 && !loading ? (
              <tr><td colSpan={6} className="p-10 text-center font-bold italic text-gray-400 uppercase">No Dispatch Records Found</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b-2 border-black hover:bg-yellow-50">
                  <td className="p-2 border-r-2 border-black text-center font-black">#{r.outwardNo}</td>
                  <td className="p-2 border-r-2 border-black text-center">{r.date}</td>
                  <td className="p-2 border-r-2 border-black font-black uppercase text-blue-900">{r.customerName}</td>
                  <td className="p-2 border-r-2 border-black">
                    <div className="font-black uppercase">{r.vehicleNo}</div>
                    <div className="text-[9px] uppercase text-gray-500">Driver: {r.driverName}</div>
                  </td>
                  <td className="p-2 border-r-2 border-black uppercase">
                    <div>{r.itemName}</div>
                    <div className="text-[9px] text-gray-500 normal-case">
                      {r.description || ""}
                    </div>
                  </td>
                  <td className="p-2 text-center font-black text-lg">{r.qty}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-black text-white">
              <td colSpan={5} className="p-3 text-right font-black uppercase">Total Dispatched Quantity:</td>
              <td className="p-3 text-center font-black text-2xl">{totalQty}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="hidden print:flex justify-between mt-24 px-10">
          <div className="text-center border-t-4 border-black w-48 pt-2 text-xs font-black uppercase">Warehouse Manager</div>
          <div className="text-center border-t-4 border-black w-48 pt-2 text-xs font-black uppercase">Authorized Officer</div>
        </div>
      </div>
    </div>
  );
}
