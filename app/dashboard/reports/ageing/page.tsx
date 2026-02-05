"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";


type Party = {
  id: string;
  name: string;
};

type AgeingRow = {
  numType: string;
  date: string;
  narration: string;
  billAmount: number;
  billBalance: number;
  days: number;
  totalBalance: number;
};

export default function AgeingReportPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [type, setType] = useState<"customer" | "supplier">("customer");
  const [asOnDate, setAsOnDate] = useState(today);
  const [partyId, setPartyId] = useState("");
  const [parties, setParties] = useState<Party[]>([]);
  const [data, setData] = useState<AgeingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔄 Load customers / suppliers
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !user.role) {
      console.log("Waiting for user session...");
      return;
    }

    setPartyId("");
    setData([]);

    fetch("/api/accounts", {
      headers: {
        "x-user-role": user.role, // یہ ہیڈر لازمی ہے
      },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.accounts || []);
        console.log("📊 All Accounts:", list);

        // کیس سینسیٹیو فلٹرنگ (Case Sensitive Fix)
        const filtered = list.filter((a: Any) => {
          const pType = a.partyType?.toUpperCase();
          return type === "customer"
            ? pType === "CUSTOMER"
            : pType === "SUPPLIER";
        });

        console.log(`🔍 Filtered ${type}s:`, filtered);
        setParties(filtered);
      });
  }, [type]);

  async function loadData() {
    if (!partyId) return;

    setLoading(true);
    setData([]);

    const url =
      type === "customer"
        ? `/api/reports/ageing/customer?date=${asOnDate}&customerId=${partyId}`
        : `/api/reports/ageing/supplier?date=${asOnDate}&supplierId=${partyId}`;

    try {
      const res = await fetch(url, {
        headers: {
          "x-user-role": "ADMIN", // 🔥 THIS WAS MISSING
        },
      });

      const json = await res.json();
      console.log(`📋 Ageing Data for ${type}:`, json);
      setData(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      <h1 className="text-2xl font-bold">Bill Wise Ageing Report</h1>

      {/* 🔹 FILTER BAR */}
      <div className="flex gap-4 flex-wrap items-end">

        {/* DATE */}
        <div>
          <label className="block text-sm">As On Date</label>
          <input
            type="date"
            className="border px-3 py-2"
            value={asOnDate}
            onChange={e => setAsOnDate(e.target.value)}
          />
        </div>

        {/* TYPE */}
        <div>
          <label className="block text-sm">Type</label>
          <select
            className="border px-3 py-2"
            value={type}
            onChange={e => setType(e.target.value as Any)}
          >
            <option value="customer">Customer</option>
            <option value="supplier">Supplier</option>
          </select>
        </div>

        {/* PARTY */}
        <div>
          <label className="block text-sm">
            Select {type === "customer" ? "Customer" : "Supplier"}
          </label>
          <select
            className="border px-3 py-2 min-w-[240px]"
            value={partyId}
            onChange={e => setPartyId(e.target.value)}
          >
            <option value="">Select</option>
            {/* سلیکٹ مینو کے اندر میپنگ کو اس طرح محفوظ بنائیں */}
            {Array.isArray(parties) && parties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={loadData}
          className="bg-black text-white px-6 py-2"
        >
          Show
        </button>
      </div>

      {/* 🔹 TABLE */}
      <div className="border bg-white overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Num & Typ</th>
              <th className="border p-2">Date</th>
              <th className="border p-2">Narration</th>
              <th className="border p-2 text-right">Bill Amount</th>
              <th className="border p-2 text-right">Bill Balance</th>
              <th className="border p-2 text-right">Days</th>
              <th className="border p-2 text-right">Total Balance</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-center">Loading…</td>
              </tr>
            )}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No data found
                </td>
              </tr>
            )}

            {data.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.numType}</td>
                <td className="border p-2">{r.date}</td>
                <td className="border p-2">{r.narration}</td>
                <td className="border p-2 text-right">
                  {r.billAmount.toLocaleString()}
                </td>
                <td className="border p-2 text-right text-red-600">
                  {r.billBalance >= 0 ? "" : "-"}{Math.abs(r.billBalance).toLocaleString()}
                </td>
                <td className="border p-2 text-right font-semibold">
                  {r.days}
                </td>
                <td className="border p-2 text-right font-bold">
                  {r.totalBalance >= 0 ? "" : "-"}{Math.abs(r.totalBalance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Balance Summary */}
        {data.length > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="border-2 border-black p-4 bg-gray-100 w-80">
              <div className="flex justify-between items-center gap-4">
                <span className="font-bold uppercase text-sm">Total Balance:</span>
                <span className="text-2xl font-black">
                  {data[data.length - 1].totalBalance >= 0 ? "" : "-"}{Math.abs(data[data.length - 1].totalBalance).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
