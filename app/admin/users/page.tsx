"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("USER");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/user-permissions", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (Array.isArray(data?.users)) {
          setUsers(data.users);
        } else {
          setUsers([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function sendInvite() {
    setMsg("");
    const u = getCurrentUser();
    const headers: Record<string,string> = { "Content-Type": "application/json" };
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;
    const r = await fetch("/api/invitations", {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail, inviteRole }),
    });
    if (r.ok) setMsg("Invite sent");
    else {
      const j = await r.json().catch(()=>({}));
      setMsg(j?.error || "Failed");
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-100 mb-6">Users</h1>
        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
          <div className="text-sm font-semibold mb-3 text-slate-200">Invite user</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@example.com" className="px-3 py-2 border rounded bg-slate-900 border-slate-700 text-slate-200" />
            <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} className="px-3 py-2 border rounded bg-slate-900 border-slate-700 text-slate-200">
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="USER">USER</option>
            </select>
            <button onClick={sendInvite} className="px-4 py-2 rounded bg-indigo-600 text-white">Send</button>
            {msg ? <div className="text-sm text-slate-400">{msg}</div> : null}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10 text-slate-400">Loading users…</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
            <table className="min-w-full text-sm text-slate-200">
              <thead>
                <tr className="bg-slate-700/60">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={3} className="py-10 text-center text-slate-400">No users found</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-t border-slate-700">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.role}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
