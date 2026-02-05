"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { exportToCSV } from "@/lib/export";

type Account = { id: string; name: string; };
type LedgerRow = {
    date: string;
    voucherNo: string;
    narration: string;
    debit?: number;
    credit?: number;
    balance: number;
};


export default function LedgerReportPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [accountId, setAccountId] = useState("");
    const [fromDate, setFromDate] = useState("2026-01-01");
    const [toDate, setToDate] = useState(today);
    const [rows, setRows] = useState<LedgerRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) return;
        fetch("/api/accounts", { headers: { "x-user-role": user.role } })
            .then(r => r.json())
            .then(d => setAccounts(d));
    }, []);

    async function loadLedger() {
        if (!accountId) return;
        setLoading(true);
        try {
            const user = getCurrentUser();

            const res = await fetch(
                `/api/reports/ledger?accountId=${accountId}&from=${fromDate}&to=${toDate}`,
                {
                    headers: {
                        "x-user-role": user?.role ?? ""
                    }
                }
            );

            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }

    const _totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
    const _totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
    const _finalBalance = rows.length ? rows[rows.length - 1].balance : 0;

    return (
        <div className="p-4 max-w-6xl mx-auto font-sans">
            <h1 className="text-2xl font-bold mb-6 print:hidden">Ledger Report</h1>

            {/* Filters */}
            <div className="flex gap-3 mb-6 items-end print:hidden bg-white p-4 border rounded shadow-sm">
                <div className="flex-1">
                    <label className="block text-xs font-bold mb-1 uppercase">Account</label>
                    <select className="w-full border p-2 rounded" value={accountId} onChange={e => setAccountId(e.target.value)}>
                        <option value="">Select Account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 uppercase">From</label>
                    <input type="date" className="border p-2 rounded" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 uppercase">To</label>
                    <input type="date" className="border p-2 rounded" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                <button onClick={loadLedger} className="bg-blue-600 text-white px-6 py-2 rounded font-bold">Search</button>
                {rows.length > 0 && (
                    <button
                        onClick={() => exportToCSV(rows.map(r => ({
                            date: r.date,
                            voucherNo: r.voucherNo,
                            narration: r.narration,
                            debit: r.debit || 0,
                            credit: r.credit || 0,
                            balance: r.balance
                        })), "ledger-report")}
                        className="bg-green-600 text-white px-6 py-2 rounded font-bold"
                    >
                        📥 Export CSV
                    </button>
                )}
            </div>

            {/* Ledger View */}
            <div className="invoice-print bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                {/* 📋 PROFESSIONAL HEADER */}
                <div className="p-8 border-b-2 border-black bg-gray-50">
                    <div className="flex justify-between items-start">
                        <div>
                            {/* کمپنی کا نام بڑے اور بولڈ فونٹ میں */}
                            <h1 className="text-4xl font-black tracking-tighter text-black uppercase">
                                US TRADERS
                            </h1>
                            <p className="text-xs font-bold text-gray-500 mt-1 tracking-widest uppercase italic">
                                Wholesale & Distribution Management
                            </p>
                        </div>
                        <div className="text-right border-l-4 border-black pl-4">
                            <h2 className="text-xl font-black uppercase text-blue-900">
                                Account Ledger
                            </h2>
                            <div className="mt-2 text-[10px] font-bold uppercase text-gray-500">
                                Reporting Period
                                <span className="block text-sm text-black font-black italic">
                                    {fromDate} <span className="text-gray-400 font-normal">TO</span> {toDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex justify-between items-end border-t-2 border-dashed border-black pt-6">
                        <div>
                            <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                                Statement For:
                            </span>
                            <h3 className="text-3xl font-black uppercase underline decoration-4 underline-offset-8 decoration-yellow-400">
                                {accounts.find(a => a.id === accountId)?.name || "N/A"}
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">System Date</p>
                            <p className="text-sm font-black italic">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* 💰 OPENING BALANCE SUMMARY - یہ ٹیبل کے اوپر الگ نظر آئے گا */}
                {!loading && rows.length > 0 && (
                    <div className="flex justify-between items-end mb-1 print:mt-4">
                        <div className="text-[10px] font-bold text-gray-500 uppercase italic">
                            * All amounts are in PKR
                        </div>
                        <div className="bg-white border-2 border-black p-2 px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                            <span className="text-[11px] font-black uppercase tracking-tighter text-gray-400">
                                Opening Balance B/F
                            </span>
                            <span className={`text-xl font-black ${rows[0].balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                                {rows[0].balance >= 0 ? "" : "-"}{Math.abs(rows[0].balance).toLocaleString()} {rows[0].balance >= 0 ? "Dr" : "Cr"}
                            </span>
                        </div>
                    </div>
                )}

                {/* 📊 MAIN LEDGER TABLE */}
                <div className="border-2 border-black overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-black text-white uppercase text-[11px] font-bold">
                            <tr>
                                <th className="p-3 border-r border-gray-700 text-left w-28">Date</th>
                                <th className="p-3 border-r border-gray-700 text-left w-32">Voucher #</th>
                                <th className="p-3 border-r border-gray-700 text-left">Narration / Particulars</th>
                                <th className="p-3 border-r border-gray-700 text-right w-32">Debit (In)</th>
                                <th className="p-3 border-r border-gray-700 text-right w-32">Credit (Out)</th>
                                <th className="p-3 text-right w-40 bg-gray-900">Running Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center font-black uppercase animate-pulse text-gray-400">
                                        Fetching Ledger Records...
                                    </td>
                                </tr>
                            ) : rows.length <= 1 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-gray-400 uppercase italic">
                                        No transactions found for this period.
                                    </td>
                                </tr>
                            ) : (
                                /* rows.slice(1) اس لیے تاکہ اوپننگ بیلنس ٹیبل کے اندر دوبارہ نہ آئے */
                                rows.slice(1).map((r, i) => (
                                    <tr key={i} className="hover:bg-yellow-50 transition-colors group">
                                        <td className="p-3 border-r border-black font-medium text-gray-600">
                                            {r.date}
                                        </td>
                                        <td className="p-3 border-r border-black font-black text-blue-900 group-hover:underline">
                                            {r.voucherNo}
                                        </td>
                                        <td className="p-3 border-r border-black uppercase text-[11px] leading-tight font-bold text-gray-700">
                                            {r.narration}
                                        </td>
                                        <td className="p-3 border-r border-black text-right font-bold text-black">
                                            {r.debit ? r.debit.toLocaleString() : "-"}
                                        </td>
                                        <td className="p-3 border-r border-black text-right font-bold text-black">
                                            {r.credit ? r.credit.toLocaleString() : "-"}
                                        </td>
                                        <td className={`p-3 text-right font-black text-base ${r.balance >= 0 ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
                                            {r.balance >= 0 ? "" : "-"}{Math.abs(r.balance).toLocaleString()}{r.balance >= 0 ? "Dr" : "Cr"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* 🏆 PERIOD TOTALS FOOTER */}
                        {!loading && rows.length > 1 && (
                            <tfoot className="bg-black text-white font-black uppercase border-t-4 border-black">
                                <tr>
                                    <td colSpan={3} className="p-4 text-right tracking-widest text-gray-400">Period Totals</td>
                                    <td className="p-4 text-right border-x border-gray-800">
                                        {rows.slice(1).reduce((s, r) => s + (r.debit || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right border-r border-gray-800">
                                        {rows.slice(1).reduce((s, r) => s + (r.credit || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right bg-blue-700 text-white text-lg italic">
                                        {rows[rows.length - 1].balance >= 0 ? "" : "-"}{Math.abs(rows[rows.length - 1].balance).toLocaleString()} {rows[rows.length - 1].balance >= 0 ? "Dr" : "Cr"}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <div className="mt-6 flex gap-4 print:hidden">
                <button onClick={() => window.print()} className="border-2 border-black px-8 py-2 font-bold hover:bg-black hover:text-white transition-all">
                    PRINT LEDGER
                </button>
            </div>
        </div>
    );
}