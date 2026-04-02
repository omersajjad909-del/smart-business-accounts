"use client";
import { useState } from "react";

export default function TeamPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Invitation sent!");
        setEmail("");
        setRole("USER");
      } else {
        setMessage(data.error || "Failed to send invite");
      }
    } catch (err: any) {
      setMessage(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-black mb-6">Invite Team Member</h1>
        <form onSubmit={inviteUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="USER">User</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>
        {message && <div className="mt-4 text-center text-sm text-indigo-700">{message}</div>}
      </div>
    </div>
  );
}
