"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function AdminUsagePage() {
  const [active, setActive] = useState<any[] | null>(null);
  const [risk, setRisk] = useState<any[] | null>(null);
  const [hi, setHi] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string,string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const a = await fetch("/api/admin/usage/top-active", { cache: "no-store", headers, credentials: "include" as any });
        setActive(a.ok ? (await a.json()).rows : []);
      } catch { setActive([]); }
      try {
        const u = getCurrentUser();
        const headers: Record<string,string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const r = await fetch("/api/admin/usage/at-risk?days=14", { cache: "no-store", headers, credentials: "include" as any });
        setRisk(r.ok ? (await r.json()).rows : []);
      } catch { setRisk([]); }
      try {
        const u = getCurrentUser();
        const headers: Record<string,string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const h = await fetch("/api/admin/usage/high-invoice", { cache: "no-store", headers, credentials: "include" as any });
        setHi(h.ok ? (await h.json()).rows : []);
      } catch { setHi([]); }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold">Usage Insights</h1>
        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="bg-white border border-indigo-100 rounded-2xl shadow p-4">
            <div className="font-bold mb-3">Top 10 Most Active (7d)</div>
            <Table rows={active} cols={[
              { k: "name", t: "Company" },
              { k: "country", t: "Country" },
              { k: "activity", t: "Sessions", r: true },
            ]} />
          </div>
          <div className="bg-white border border-indigo-100 rounded-2xl shadow p-4">
            <div className="font-bold mb-3">At‑Risk (no login ≥14d)</div>
            <Table rows={risk} cols={[
              { k: "name", t: "Company" },
              { k: "plan", t: "Plan" },
              { k: "lastLogin", t: "Last Login", fmt: (v: any) => v ? new Date(v).toLocaleDateString() : "-" },
            ]} />
          </div>
          <div className="bg-white border border-indigo-100 rounded-2xl shadow p-4">
            <div className="font-bold mb-3">High Invoice Volume (30d)</div>
            <Table rows={hi} cols={[
              { k: "name", t: "Company" },
              { k: "invoices", t: "Invoices", r: true },
              { k: "amount", t: "Amount", r: true, fmt: (v: any) => `$${Number(v).toFixed(0)}` },
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Table({ rows, cols }:{ rows: any[] | null, cols: Array<{k:string,t:string,r?:boolean,fmt?:(v:any)=>any}> }) {
  if (!rows) return <div className="text-sm text-slate-500">Loading…</div>;
  if (rows.length === 0) return <div className="text-sm text-slate-500">No data</div>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500">
            {cols.map(c => <th key={c.k} className={`py-2 ${c.r ? "text-right" : "text-left"}`}>{c.t}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {cols.map(c => (
                <td key={c.k} className={`py-2 ${c.r ? "text-right" : "text-left"}`}>
                  {c.fmt ? c.fmt(r[c.k]) : r[c.k] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
