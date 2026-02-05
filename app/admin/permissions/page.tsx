"use client";

import { useEffect, useState } from "react";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";

type CurrentUser = {
  id: string;
  role: string;
  name?: string;
  email?: string;
};

type UserPermission = {
  permission: string;
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: UserPermission[];
}

interface Role {
  role: string;
  permissions: string[];
}

export default function AdminPermissionsPage() {
  const [user] = useState<CurrentUser | null>(() => getCurrentUser());
  const userId = user?.id ?? null;
  const ready = true;
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // Users Tab
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // Roles Tab
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  // 🔹 fetch users and roles
  useEffect(() => {
    if (!ready || !user || user.role !== "ADMIN" || !userId) return;

    // Fetch users
    fetch("/api/admin/user-permissions", {
      headers: {
        "x-user-role": user.role,
        "x-user-id": userId,
      },
    })
      .then(r => r.json())
      .then(setUsers)
      .catch(console.error);

    // Fetch roles
    fetch("/api/admin/roles", {
      headers: {
        "x-user-role": user.role,
        "x-user-id": userId,
      },
    })
      .then(r => r.json())
      .then(data => {
        const roleList = Array.isArray(data) ? data : [];
        setRoles(roleList);
        if (roleList.length > 0) {
          const firstRole = roleList[0];
          setSelectedRole(firstRole.role);
          setRolePermissions(firstRole.permissions || []);
        }
      })
      .catch(console.error);
  }, [ready, user, userId]);

  // 🔒 hard guards
  if (!ready) return null;

  if (!user || !userId || user.role !== "ADMIN") {
    return <div className="p-6">Access denied</div>;
  }

  // ================= USERS TAB ACTIONS =================

  const selectUser = (u: User) => {
    setSelectedUser(u);
    setUserPermissions(u.permissions.map((p) => p.permission));
  };

  const toggleUserPermission = (perm: string) => {
    setUserPermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) {
      alert("Please select a user first");
      return;
    }

    const response = await fetch("/api/admin/user-permissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": userId,
      },
      body: JSON.stringify({
        userId: selectedUser.id,
        permissions: userPermissions,
      }),
    });

    if (response.ok) {
      alert("User permissions saved successfully");
      // Refresh users list
      const updated = await fetch("/api/admin/user-permissions", {
        headers: {
          "x-user-role": user.role,
          "x-user-id": userId,
        },
      }).then(r => r.json());
      setUsers(updated);
    } else {
      alert("Failed to save permissions");
    }
  };

  // ================= ROLES TAB ACTIONS =================
  const toggleRolePermission = (perm: string) => {
    setRolePermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const saveRolePermissions = async () => {
    const response = await fetch("/api/admin/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": user.role,
        "x-user-id": userId,
      },
      body: JSON.stringify({
        role: selectedRole,
        permissions: rolePermissions,
      }),
    });

    if (response.ok) {
      alert("Role permissions saved successfully");
      // Refresh roles list
      const updated = await fetch("/api/admin/roles", {
        headers: {
          "x-user-role": user.role,
          "x-user-id": userId,
        },
      }).then(r => r.json());
      const roleList = Array.isArray(updated) ? updated : [];
      setRoles(roleList);
      const current = roleList.find(r => r.role === selectedRole);
      setRolePermissions(current?.permissions || []);
    } else {
      alert("Failed to save role permissions");
    }
  };

  // ================= UI =================

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Roles & Permissions</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "users"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600"
          }`}
        >
          👥 Users & Permissions
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "roles"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600"
          }`}
        >
          🎭 Roles
        </button>
      </div>

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h2 className="font-bold text-lg mb-4">Users</h2>
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={`cursor-pointer p-3 border rounded transition ${
                    selectedUser?.id === u.id
                      ? "bg-blue-100 border-blue-500"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold">{u.name || u.email}</div>
                  <div className="text-xs text-gray-600">Role: {u.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            {selectedUser ? (
              <div className="bg-white border rounded p-6">
                <h2 className="text-xl font-bold mb-4">
                  Permissions for {selectedUser.name || selectedUser.email}
                </h2>

                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <span className="font-semibold">Role:</span> {selectedUser.role}
                </div>

                <div className="space-y-2 mb-6">
                  {Object.values(PERMISSIONS).map(p => (
                    <label key={p} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={userPermissions.includes(p)}
                        onChange={() => toggleUserPermission(p)}
                        className="w-4 h-4"
                      />
                      <span className="ml-3 text-sm">{p}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={saveUserPermissions}
                  className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  💾 Save Permissions
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 border rounded p-6 text-center text-gray-600">
                Select a user to manage permissions
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROLES TAB */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-3 gap-6">
          <div>
            <h2 className="font-bold text-lg mb-4">Roles</h2>
            <div className="space-y-2">
              {["ADMIN", "ACCOUNTANT", "VIEWER"].map(roleName => (
                <div
                  key={roleName}
                  onClick={() => {
                    setSelectedRole(roleName);
                    const role = roles.find(r => r.role === roleName);
                    setRolePermissions(role?.permissions || []);
                  }}
                  className={`cursor-pointer p-3 border rounded transition ${
                    selectedRole === roleName
                      ? "bg-blue-100 border-blue-500"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold">{roleName}</div>
                  <div className="text-xs text-gray-600">
                    {rolePermissions.length} permissions
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="bg-white border rounded p-6">
              <h2 className="text-xl font-bold mb-4">
                Permissions for {selectedRole} Role
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
                <p className="text-sm text-blue-800">
                  Configure which permissions users with the <strong>{selectedRole}</strong> role will have.
                </p>
              </div>

              <div className="space-y-2 mb-6">
                {Object.values(PERMISSIONS).map(p => (
                  <label key={p} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rolePermissions.includes(p)}
                      onChange={() => toggleRolePermission(p)}
                      className="w-4 h-4"
                    />
                    <span className="ml-3 text-sm">{p}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={saveRolePermissions}
                className="px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                💾 Save Role Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
