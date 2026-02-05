"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function UsersPage() {
  const userSession = getCurrentUser();
  const isAdmin = userSession?.role === "ADMIN";

  const [users, setUsers] = useState<Any[]>([]);
  const [roles, setRoles] = useState<Any[]>([]); // رولز کے لیے اسٹیٹ
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    id: null, name: "", email: "", password: "", role: "ACCOUNTANT", roleId: "", active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // دونوں APIs کو ایک ساتھ کال کرنا
      const [uRes, rRes] = await Promise.all([
        fetch("/api/users", { headers: { "x-user-role": "ADMIN" } }),
        fetch("/api/admin/roles", { headers: { "x-user-role": "ADMIN" } })
      ]);

      const uData = await uRes.json();
      const rData = await rRes.json();

      // 🔥 اہم چیک: اگر ڈیٹا ایریے نہیں ہے تو خالی ایریے سیٹ کریں
      setUsers(Array.isArray(uData) ? uData : []);
      setRoles(Array.isArray(rData) ? rData : []);

    } catch (err) {
      console.error("Fetch Error:", err);
      setUsers([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userSession?.role === "ADMIN") {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  async function save() {
    if (!form.name || !form.email) return alert("Fields missing!");
    const method = editing ? "PUT" : "POST";
    await fetch("/api/users", {
      method,
      headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
      body: JSON.stringify(form),
    });
    reset();
    fetchData();
  }

  const reset = () => {
    setForm({ id: null, name: "", email: "", password: "", role: "ACCOUNTANT", roleId: "", active: true });
    setEditing(false);
  };


  // Guard - صرف ADMIN رسائی کر سکتے ہیں
  if (!userSession) return null;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">❌ رسائی مسترد</h2>
          <p className="text-red-700">صرف ADMIN صارفین رولز کو سنبھال سکتے ہیں</p>
        </div>
      </div>
    );
  }
  if (loading) return <div className="p-10 text-center">Loading Data...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      {/* یوزر فارم */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="border p-2 rounded" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input className="border p-2 rounded" type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          
          <select className="border p-2 rounded" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="ADMIN">ADMIN</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
          </select>

          {/* رولز ڈراپ ڈاؤن */}
          <select className="border p-2 rounded" value={form.roleId} onChange={e => setForm({...form, roleId: e.target.value})}>
            <option value="">-- Dynamic Role --</option>
            {/* یہاں چیک لگایا گیا ہے تاکہ کریش نہ ہو */}
            {Array.isArray(roles) && roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <button onClick={save} className="mt-4 bg-black text-white px-6 py-2 rounded">
          {editing ? "Update User" : "Add User"}
        </button>
      </div>

      {/* یوزر ٹیبل */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(users) && users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.roleObject?.name || u.role}</td>
                <td className="p-3">
                  <button onClick={() => { setForm({...u, password: ""}); setEditing(true); }} className="text-blue-600 mr-2">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


