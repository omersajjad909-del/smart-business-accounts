"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";

type User = {
  id: string;
  name: string;
  permissions: { permission: string }[];
};

export default function AdminPermissionsPage() {
  const me = getCurrentUser();
  const isAdmin = me?.role === "ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  // 🔐 load session ONCE
  // 🔐 fetch users AFTER auth
  useEffect(() => {
    if (!me || !isAdmin) return;

    fetch("/api/admin/user-permissions", {
      headers: {
        "x-user-role": me.role,
        "x-user-id": me.id,
      },
    })
      .then(r => r.json())
      .then(setUsers)
      .catch(console.error);
  }, [isAdmin, me?.id, me?.role]);

  // ⛔ nothing renders until ready
  if (!me || !isAdmin) {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  // ================= actions =================

  const selectUser = (u: User) => {
    setSelected(u);
    setChecked(u.permissions.map(p => p.permission));
  };

  const toggle = (p: string) => {
    setChecked(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const save = async () => {
    if (!selected) return alert("Select a user");

    await fetch("/api/admin/user-permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": me.role,
        "x-user-id": me.id,
      },
      body: JSON.stringify({
        userId: selected.id,
        permissions: checked,
      }),
    });

    alert("Permissions saved");
  };

  // ================= UI =================

  return (
    <div className="grid grid-cols-3 gap-6 p-6">

      {/* USERS */}
      <div className="border rounded p-4">
        <h2 className="font-bold mb-3">Users</h2>

        {users.map(u => (
          <div
            key={u.id}
            onClick={() => selectUser(u)}
            className={`p-2 mb-1 cursor-pointer rounded
              ${selected?.id === u.id ? "bg-gray-200" : "hover:bg-gray-100"}`}
          >
            {u.name}
          </div>
        ))}
      </div>

      {/* PERMISSIONS */}
      <div className="col-span-2 border rounded p-4">
        {!selected ? (
          <div className="text-gray-500">Select a user</div>
        ) : (
          <>
            <h2 className="font-bold mb-3">
              Permissions: {selected.name}
            </h2>

            {Object.values(PERMISSIONS).map(p => (
              <label key={p} className="block">
                <input
                  type="checkbox"
                  checked={checked.includes(p)}
                  onChange={() => toggle(p)}
                />
                <span className="ml-2">{p}</span>
              </label>
            ))}

            <button
              onClick={save}
              className="mt-4 px-4 py-2 bg-black text-white"
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}

