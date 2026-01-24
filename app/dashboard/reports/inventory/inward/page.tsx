"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type InwardRow = {
    date: string;
    type: string;
    supplierName: string;
    itemName: string;
    description?: string;
    qty: number;
    rate: number;
    amount: number;
};

export default function InwardReportPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [fromDate, setFromDate] = useState("2025-01-01");
    const [toDate, setToDate] = useState(today);
    const [rows, setRows] = useState<InwardRow[]>([]);
    const [loading, setLoading] = useState(false);

    async function loadReport() {
        setLoading(true);
        const user = getCurrentUser();
        try {
            const res = await fetch(`/api/reports/inventory/inward?from=${fromDate}&to=${toDate}`, {
                headers: { "x-user-role": user?.role || "ADMIN" }
            });
            const json = await res.json();
            setRows(Array.isArray(json) ? json : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadReport(); }, []);

    // 🛡️ Safe Calculation to avoid null errors
    const totalQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-bold">
            <h1 className="text-3xl font-black uppercase italic border-b-4 border-black pb-2">Inward Inventory Report</h1>

            {/* FILTER BAR */}
            <div className="flex gap-4 items-end flex-wrap bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase">From Date</label>
                    <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold uppercase">To Date</label>
                    <input type="date" className="border-2 border-black px-3 py-2 outline-none" value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                <button onClick={loadReport} className="bg-black text-white px-8 py-2.5 font-bold uppercase hover:bg-gray-800">
                    Show Report
                </button>
            </div>

            <div className="border-2 border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-sm">
                    <thead className="bg-black text-white">
                        <tr>
                            <th className="p-3 text-left">DATE</th>
                            <th className="p-3 text-left">SUPPLIER</th>
                            <th className="p-3 text-left">ITEM</th>
                            <th className="p-3 text-right">QTY</th>
                            <th className="p-3 text-right">RATE</th>
                            <th className="p-3 text-right">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black">
                        {loading ? (
                            <tr><td colSpan={6} className="p-10 text-center animate-pulse">LOADING...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-gray-400">NO DATA FOUND</td></tr>
                        ) : (
                            rows.map((r, i) => (
                                <tr key={i} className="hover:bg-yellow-50">
                                    <td className="p-3 border-r-2 border-black uppercase">{r.date}</td>
                                    <td className="p-3 border-r-2 border-black text-blue-800 uppercase">{r.supplierName}</td>
                                    <td className="p-3 border-r-2 border-black uppercase">{r.itemName} {r.description ? `(${r.description})` : ""}</td>
                                    {/* 🛡️ Added Fallback || 0 to prevent crash */}
                                    <td className="p-3 border-r-2 border-black text-right">{(r.qty || 0).toLocaleString()}</td>
                                    <td className="p-3 border-r-2 border-black text-right">{(r.rate || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right bg-gray-50">{(r.amount || 0).toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {!loading && rows.length > 0 && (
                        <tfoot className="bg-black text-white font-black">
                            <tr>
                                <td colSpan={3} className="p-3 text-right">TOTAL INWARD</td>
                                <td className="p-3 text-right">{totalQty.toLocaleString()}</td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right">{totalAmount.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}