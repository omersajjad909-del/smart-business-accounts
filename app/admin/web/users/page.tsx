 "use client";
import { useEffect, useState } from "react";

type Row = { userId:string; name:string; email:string; role:string; lastLogin:string; ip?:string | null; companyId?:string | null };

export default function WebUsersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/web/sessions", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setRows(j.sessions || []);
        } else {
          setRows([]);
        }
      } catch {
        setRows([]);
      }
    })();
  }, []);
  const filtered = (rows || []).filter(r =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    r.email.toLowerCase().includes(q.toLowerCase()) ||
    r.role.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold">Website Users</h1>
        <p className="mt-2 text-slate-600">Latest login per user across the website.</p>
        <div className="mt-6 bg-white border border-indigo-100 rounded-2xl shadow p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email or role"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <div className="mt-4 overflow-auto">
            {!rows ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-slate-500">No users found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="text-left py-2">Name</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Last Login</th>
                    <th className="text-left py-2">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.userId} className="border-t">
                      <td className="py-2">{r.name}</td>
                      <td className="py-2">{r.email}</td>
                      <td className="py-2">{r.role}</td>
                      <td className="py-2">{new Date(r.lastLogin).toLocaleString()}</td>
                      <td className="py-2">{r.ip || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
