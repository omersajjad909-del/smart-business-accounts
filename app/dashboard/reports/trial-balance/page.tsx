"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function CategorizedTrialBalance() {
   const today = new Date().toISOString().slice(0, 10);
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [fromDate, setFromDate] = useState("2026-01-01");
    const [toDate, setToDate] = useState(today);
  const loadReport = async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch(
        `/api/reports/trial-balance?from=${fromDate}&to=${toDate}`,
        { headers: { "x-user-role": user?.role || "" } }
      );
      const data = await res.json();
      setRows(data.rows || []);
      setTotals(data.totals || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, []);

  const categories = Array.from(new Set(rows.map(r => r.category)));

  /* ================= GRAND TOTAL CALCULATION (All Columns) ================= */
  const grand = rows.reduce(
    (a, r) => ({
      opD: a.opD + (r.opDebit || 0),
      opC: a.opC + (r.opCredit || 0),
      trD: a.trD + (r.transDebit || 0),
      trC: a.trC + (r.transCredit || 0),
      clD: a.clD + (r.clDebit || 0),
      clC: a.clC + (r.clCredit || 0),
    }),
    { opD: 0, opC: 0, trD: 0, trC: 0, clD: 0, clC: 0 }
  );

  const difference = grand.clD - grand.clC;

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-[11px] bg-white">

      {/* SEARCH FILTERS */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 print:hidden border-b pb-4">
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border p-1.5" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border p-1.5" />
        <button onClick={loadReport} className="bg-black text-white px-6 py-1.5 font-bold uppercase">Generate</button>
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-1.5 font-bold uppercase text-xs">Print</button>
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
                  subject: `Trial Balance ${fromDate} to ${toDate}`,
                  message: "Trial Balance report attached from US TRADERS system.",
                }),
              });
              const data = await res.json();
              if (res.ok) {
                alert("Email bhej di gayi hai");
              } else {
                alert(data.error || "Email send nahi ho saki");
              }
            } catch (e) {
              alert("Email send karte waqt error aayi");
            } finally {
              setSendingEmail(false);
            }
          }}
          disabled={sendingEmail}
          className="bg-green-600 text-white px-4 py-1.5 font-bold uppercase text-xs disabled:bg-gray-400"
        >
          {sendingEmail ? "Sending..." : "Email"}
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center font-bold uppercase tracking-widest">Loading Report...</div>
      ) : (
        <div className="space-y-8">
          {/* HEADER */}
          <div className="text-center">
            <h1 className="text-2xl font-black">US TRADERS</h1>
            <h2 className="text-sm font-bold border-b-2 border-black inline-block px-10 pb-1 italic">TRIAL BALANCE</h2>
          </div>

          {categories.map(cat => {
            const list = rows.filter(r => r.category === cat);
            return (
              <div key={cat} className="border border-gray-300 overflow-x-auto">
                <div className="bg-gray-100 p-1.5 px-3 font-black text-blue-900 border-b border-gray-300 uppercase italic min-w-[800px]">
                  {cat}
                </div>
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase font-bold border-b border-gray-300">
                      <th className="p-1 text-left w-20">Code</th>
                      <th className="p-1 text-left">Description</th>
                      <th className="p-1 text-right w-24">Op Dr</th>
                      <th className="p-1 text-right w-24">Op Cr</th>
                      <th className="p-1 text-right w-24">Tr Dr</th>
                      <th className="p-1 text-right w-24">Tr Cr</th>
                      <th className="p-1 text-right w-24 bg-gray-50">Cl Dr</th>
                      <th className="p-1 text-right w-24 bg-gray-50">Cl Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-yellow-50">
                        <td className="p-1 text-gray-500">{r.code}</td>
                        <td className="p-1 font-bold uppercase">{r.name}</td>
                        <td className="p-1 text-right">{r.opDebit?.toLocaleString() || "0"}</td>
                        <td className="p-1 text-right">{r.opCredit?.toLocaleString() || "0"}</td>
                        <td className="p-1 text-right">{r.transDebit?.toLocaleString() || "0"}</td>
                        <td className="p-1 text-right">{r.transCredit?.toLocaleString() || "0"}</td>
                        <td className="p-1 text-right font-bold italic">{r.clDebit?.toLocaleString() || "0"}</td>
                        <td className="p-1 text-right font-bold italic">{r.clCredit?.toLocaleString() || "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* 🏁 FINAL TOTAL (ALL COLUMNS) */}
          <div className="mt-10 overflow-x-auto">
            <div className="bg-black text-white p-2 font-black uppercase tracking-tighter italic min-w-[800px]">
              Grand Report Summary (Consolidated)
            </div>
            <table className="w-full border-2 border-black min-w-[800px]">
              <thead className="bg-gray-200 font-black text-[10px] uppercase border-b-2 border-black">
                <tr>
                  <th className="p-2 text-left">Total Summary</th>
                  <th className="p-2 text-right w-24">Op Dr</th>
                  <th className="p-2 text-right w-24">Op Cr</th>
                  <th className="p-2 text-right w-24">Tr Dr</th>
                  <th className="p-2 text-right w-24">Tr Cr</th>
                  <th className="p-2 text-right w-24 bg-yellow-100 text-black">Cl Dr</th>
                  <th className="p-2 text-right w-24 bg-yellow-100 text-black">Cl Cr</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-black text-[13px] bg-white">
                  <td className="p-3 italic uppercase">Final Grand Totals:</td>
                  <td className="p-3 text-right">{grand.opD.toLocaleString()}</td>
                  <td className="p-3 text-right">{grand.opC.toLocaleString()}</td>
                  <td className="p-3 text-right text-blue-700">{grand.trD.toLocaleString()}</td>
                  <td className="p-3 text-right text-blue-700">{grand.trC.toLocaleString()}</td>
                  <td className="p-3 text-right bg-yellow-50">{grand.clD.toLocaleString()}</td>
                  <td className="p-3 text-right bg-yellow-50">{grand.clC.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Difference Section */}
            <div className="flex justify-between items-center mt-4 border-t-2 border-black pt-2">
              <div className="text-[10px] font-bold uppercase text-gray-400 italic">
                Verified by: US TRADERS Accounting System
              </div>
              <div className="text-right">
                <span className="text-sm font-bold uppercase mr-4">Final Difference:</span>
                <span className={`text-2xl font-black italic ${difference === 0 ? "text-green-600" : "text-red-600"}`}>
                  {Math.abs(difference).toLocaleString()} PKR
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
