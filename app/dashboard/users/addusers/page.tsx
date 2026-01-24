"use client";
import { useState } from "react";


export default function AddUserPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ACCOUNTANT",
  });

  async function save() {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    alert("User created");
  }

  return (
    <div className="p-6 max-w-md space-y-3">
      <h1 className="text-xl font-bold">Add User</h1>

      <input
        className="border p-2 w-full"
        placeholder="Name"
        onChange={e => setForm({ ...form, name: e.target.value })}
      />

      <input
        className="border p-2 w-full"
        placeholder="Email"
        onChange={e => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        className="border p-2 w-full"
        placeholder="Password"
        onChange={e => setForm({ ...form, password: e.target.value })}
      />

      <select
        className="border p-2 w-full"
        onChange={e => setForm({ ...form, role: e.target.value })}
      >
        <option value="ADMIN">Admin</option>
        <option value="ACCOUNTANT">Accountant</option>
        <option value="VIEWER">Viewer</option>
      </select>

      <button onClick={save} className="bg-black text-white px-4 py-2">
        Save User
      </button>
    </div>
  );
}
