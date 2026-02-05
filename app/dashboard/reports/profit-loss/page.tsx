"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function ProfitLossFinal() {
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-01-08");
  const [report, setReport] = useState<Any>(null);
  const [_loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/profit-loss?from=${from}&to=${to}`);
      const d = await res.json();
      setReport(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4 max-w-[1200px] mx-auto font-sans bg-white min-h-screen">
      <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-4">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">Trading & P&L Statement</h1>
        <div className="flex gap-1 print:hidden">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border-2 border-black p-1 text-xs font-bold" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border-2 border-black p-1 text-xs font-bold" />
          <button onClick={load} className="bg-black text-white px-4 py-1 text-xs font-bold uppercase">Search</button>
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-1 text-xs font-bold uppercase">Print</button>
          <button
            onClick={async () => {
              const email = window.prompt("Report email kis address par bhejni hai?");
              if (!email || !email.includes("@")) return;
              setSendingEmail(true);
              try {
                const user = getCurrentUser();
                const res = await fetch("/api/email/send", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-user-role": user?.role || "",
                    "x-user-id": user?.id || "",
                  },
                  body: JSON.stringify({
                    type: "custom",
                    to: email,
                    subject: `Profit & Loss ${from} to ${to}`,
                    message: "Profit & Loss report from US TRADERS system.",
                  }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert("Email bhej di gayi hai");
                } else {
                  alert(data.error || "Email send nahi ho saki");
                }
              } catch (_e) {
                alert("Email send karte waqt error aayi");
              } finally {
                setSendingEmail(false);
              }
            }}
            disabled={sendingEmail}
            className="bg-green-600 text-white px-4 py-1 text-xs font-bold uppercase disabled:bg-gray-400"
          >
            {sendingEmail ? "Sending..." : "Email"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 border-2 border-black">
        <div className="border-r-2 border-black min-h-[450px]">
          <div className="bg-black text-white p-2 font-bold uppercase text-center italic text-[11px] tracking-widest">Expenses / Outwards</div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {report?.expense && report.expense.length > 0 ? report.expense.map((item: Any, i: number) => (
                <tr key={i} className="hover:bg-red-50 transition-colors">
                  <td className="p-2 uppercase font-bold text-gray-700 text-[11px]">{item.name}</td>
                  <td className="p-2 text-right font-black text-[12px]">{Math.abs(item.amount).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={2} className="p-2 text-center text-gray-400">No expenses</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="min-h-[450px]">
          <div className="bg-gray-800 text-white p-2 font-bold uppercase text-center italic text-[11px] tracking-widest">Income / Inwards</div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-100">
              {report?.income && report.income.length > 0 ? report.income.map((item: Any, i: number) => (
                <tr key={i} className="hover:bg-green-50 transition-colors">
                  <td className="p-2 uppercase font-bold text-gray-700 text-[11px]">{item.name}</td>
                  <td className="p-2 text-right font-black text-[12px]">{Math.abs(item.amount).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={2} className="p-2 text-center text-gray-400">No income</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="border-2 border-black p-3 bg-gray-50 flex justify-between items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className="text-[10px] font-black uppercase">Total Revenue</span>
           <span className="text-xl font-black">{report?.totalIncome.toLocaleString()}</span>
        </div>
        <div className="border-2 border-black p-3 bg-gray-50 flex justify-between items-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className="text-[10px] font-black uppercase">Total Expenses</span>
           <span className="text-xl font-black">{report?.totalExpense.toLocaleString()}</span>
        </div>
        <div className={`border-2 border-black p-3 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${report?.netProfit >= 0 ? "bg-green-400" : "bg-red-500 text-white"}`}>
           <span className="text-[10px] font-black uppercase italic">Net Profit/Loss</span>
           <span className="text-2xl font-black">{report?.netProfit.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
