"use client";
import { useEffect, useState } from "react";
import { PageHeader, Section } from "@/components/AdminUI";
import { getCurrentUser } from "@/lib/auth";

export default function AdminLogsPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;
    const r = await fetch(`/api/admin/logs?${params.toString()}`, { cache: "no-store", headers });
    setRows(r.ok ? (await r.json()).rows : []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader title="Audit Log Viewer" />
        <Section title="Filters" actions={<button onClick={load} className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Apply</button>}>
          <div className="grid md:grid-cols-5 gap-3">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search text" className="px-3 py-2 border rounded-lg" />
            <input value={action} onChange={e=>setAction(e.target.value)} placeholder="Action" className="px-3 py-2 border rounded-lg" />
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="px-3 py-2 border rounded-lg" />
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
        </Section>
        <Section title="Entries">
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50">
                <tr className="text-slate-500">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Company</th>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {!rows ? (
                  <tr><td colSpan={5} className="p-6 text-slate-500">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-slate-500">No logs</td></tr>
                ) : rows.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="p-2">{l.companyId || "-"}</td>
                    <td className="p-2">{l.userId || "-"}</td>
                    <td className="p-2">{l.action}</td>
                    <td className="p-2"><pre className="whitespace-pre-wrap max-w-[60ch]">{truncate(JSON.stringify(l.details || ""))}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}

function truncate(s: string, n = 280) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}
