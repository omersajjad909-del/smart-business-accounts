"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function DetailedBalanceSheet() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/balance-sheet?date=${date}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [date]);

  return (
    <div className="p-4 max-w-4xl mx-auto bg-white border shadow-lg font-sans text-sm">
      <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-4">
        <div className="text-left">
          <h1 className="text-2xl font-black uppercase">US TRADERS</h1>
          <h2 className="text-md font-bold italic">Final Balance Sheet Statement</h2>
        </div>
        <div className="flex gap-1 print:hidden">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border-2 border-black p-1 text-xs font-bold"
          />
          <button
            onClick={load}
            className="bg-black text-white px-4 py-1 text-xs font-bold uppercase"
          >
            Search
          </button>
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-1 text-xs font-bold uppercase"
          >
            Print
          </button>
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
                    subject: `Balance Sheet as on ${date}`,
                    message: "Balance Sheet report from US TRADERS system.",
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

      {loading ? <p className="text-center font-bold">Syncing Records...</p> : (
        <div className="space-y-6">
          
          {/* TWO COLUMN FORMAT - Assets (DR) and Liabilities (CR) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* LEFT SIDE - ASSETS (DEBIT) */}
            <div className="border border-black">
              <h3 className="bg-blue-900 text-white px-2 py-1 font-bold uppercase italic text-center">Assets & Receivables (DR)</h3>
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-black text-[10px]">
                  <tr>
                    <th className="text-left p-2">Particulars</th>
                    <th className="text-right p-2 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.assets && data.assets.length > 0 ? data.assets.map((a: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-2 font-semibold uppercase text-[11px]">{a.name}</td>
                      <td className="p-2 text-right font-mono text-[11px]">{Math.abs(a.amount).toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="p-2 text-center text-gray-400">No Assets</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-black border-t-2 border-black">
                    <td className="p-2 uppercase text-[12px]">Total Assets</td>
                    <td className="p-2 text-right font-mono text-[12px] border-t-2 border-black">{data?.totalAssets ? data.totalAssets.toLocaleString() : '0'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* RIGHT SIDE - LIABILITIES & EQUITY (CREDIT) */}
            <div className="border border-black">
              <h3 className="bg-red-800 text-white px-2 py-1 font-bold uppercase italic text-center">Liabilities & Equity (CR)</h3>
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-black text-[10px]">
                  <tr>
                    <th className="text-left p-2">Particulars</th>
                    <th className="text-right p-2 w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.liabilities && data.liabilities.length > 0 && data.liabilities.map((l: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-2 font-semibold uppercase text-[11px]">{l.name}</td>
                      <td className="p-2 text-right font-mono text-[11px]">{Math.abs(l.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data?.equity && data.equity.length > 0 && data.equity.map((e: any, i: number) => (
                    <tr key={`eq-${i}`} className="border-b border-gray-100 bg-green-50">
                      <td className="p-2 font-semibold uppercase text-[11px]">{e.name}</td>
                      <td className="p-2 text-right font-mono text-[11px]">{Math.abs(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                  {data?.netProfit !== undefined && (
                    <tr className="border-b border-gray-100 bg-green-100">
                      <td className="p-2 font-semibold uppercase text-[11px]">Net Profit/Loss</td>
                      <td className="p-2 text-right font-mono text-[11px]">{Math.abs(data.netProfit).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 font-black border-t-2 border-black">
                    <td className="p-2 uppercase text-[12px]">Total Liabilities & Equity</td>
                    <td className="p-2 text-right font-mono text-[12px] border-t-2 border-black">
                      {(data?.totalLiabilities || 0) + (data?.totalEquity || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>

          <div className={`p-4 text-center border-2 border-black font-black uppercase text-xl rounded ${data?.isBalanced ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
            {data?.isBalanced
              ? `✔ BALANCED - Assets = Liabilities + Equity`
              : `❌ OUT OF BALANCE - Difference: ${Math.abs((data?.totalAssets || 0) - ((data?.totalLiabilities || 0) + (data?.totalEquity || 0))).toLocaleString()}`}
          </div>

        </div>
      )}
    </div>
  );
}
