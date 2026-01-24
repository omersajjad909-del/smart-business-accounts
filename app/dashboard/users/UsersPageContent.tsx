"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "ACCOUNTANT",
    active: true,
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setCurrentUser(u);

    if (u?.role === "ADMIN") {
      reload();
    } else {
      setLoading(false);
    }
  }, []);

  function reload() {
    setLoading(true);
    fetch("/api/users", {
      headers: { "x-user-role": "ADMIN" },
    })
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  async function save() {
    if (!form.name || !form.email) return alert("Please fill required fields");
    
    await fetch("/api/users", {
      method: editing ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": "ADMIN",
      },
      body: JSON.stringify(form),
    });

    reset();
    reload();
  }

  async function remove(id: string) {
    if (!confirm("Are you sure?")) return;
    await fetch(`/api/users?id=${id}`, {
      method: "DELETE",
      headers: { "x-user-role": "ADMIN" },
    });
    reload();
  }

  function edit(u: any) {
    setForm({ ...u, password: "" });
    setEditing(true);
  }

  function reset() {
    setForm({
      id: null,
      name: "",
      email: "",
      password: "",
      role: "ACCOUNTANT",
      active: true,
    });
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4 text-center justify-center flex">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-500 mt-2">صرف ADMIN اس پیج تک رسائی حاصل کر سکتا ہے۔</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-gray-900">User Management</h1>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          Admin Portal
        </span>
      </div>

      {/* Form Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">
          {editing ? "Edit User Details" : "Create New User"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Full Name"
            className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Email Address"
            className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">Admin</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {editing ? "Update User" : "Add User"}
          </button>
          {editing && (
            <button
              onClick={reset}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Role</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-800 font-medium">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-sm text-gray-600">{u.active ? "Active" : "Disabled"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button
                      onClick={() => edit(u)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(u.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}