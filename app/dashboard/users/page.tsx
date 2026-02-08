"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

// Helper: always check permission as string, case-insensitive, and handle both string/object arrays
function userHasPerm(
  user: {
    role?: string;
    permissions?: (string | { permission?: string })[];
    rolePermissions?: (string | { permission?: string })[];
  } | null,
  perm: string
) {
  if (!user) return false;
  const p = perm.toUpperCase();
  if (user.role === "ADMIN") return true;
  if (user.permissions?.some((x) => (typeof x === "string" ? x.toUpperCase() : (x.permission||"").toUpperCase()) === p)) return true;
  if (user.rolePermissions?.some((x) => (typeof x === "string" ? x.toUpperCase() : (x.permission||"").toUpperCase()) === p)) return true;
  return false;
}

interface Role {
  role: string;
  permissions: string[];
}

export default function UsersMasterPage() {
  const [me, setMe] = useState<any>(null);
  const [_authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // TAB STATE
  const [activeTab, setActiveTab] = useState("users"); // "users" یا "permissions"

  // USERS STATE
  const [users, setUsers] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [userForm, setUserForm] = useState({
    id: null,
    name: "",
    email: "",
    password: "",
    role: "ACCOUNTANT",
    active: true,
  });

  // PERMISSIONS STATE
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const availablePermissions = Object.values(PERMISSIONS);

  // ============ INITIAL LOAD ============
  useEffect(() => {
    const user = getCurrentUser();
    setMe(user);

    if (!user) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    // صرف ADMIN access کر سکتا ہے
    if (user.role === "ADMIN") {
      setAuthorized(true);
      loadUsers(user);
      loadRoles(user);
    } else {
      setAuthorized(false);
      setLoading(false);
    }
  }, []);

  // ============ USERS TAB FUNCTIONS ============
  const loadUsers = async (currentUser?: any) => {
    const u = currentUser || me;
    if (!u) return;

    try {
      const res = await fetch("/api/users", {
        headers: { 
          "x-user-role": "ADMIN",
          "x-user-id": u.id,
          "x-company-id": u.companyId || ""
        },
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!userForm.name || !userForm.email)
      return toast.error("Name and Email required!");

    try {
      const res = await fetch("/api/users", {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
          "x-user-id": me?.id,
          "x-company-id": me?.companyId || ""
        },
        body: JSON.stringify({
          id: userForm.id,
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          active: userForm.active,
        }),
      });

      if (res.ok) {
        toast.success(editing ? "✅ User updated!" : "✅ User created!");
        resetUserForm();
        loadUsers(me);
      } else {
        toast.error("Failed to save user");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Error saving user");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure ?")) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": "ADMIN",
          "x-user-id": me?.id,
          "x-company-id": me?.companyId || ""
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        toast.success("✅ User deleted!");
        loadUsers(me);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const editUser = (user: any) => {
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
    });
    setEditing(true);
  };

  const resetUserForm = () => {
    setUserForm({
      id: null,
      name: "",
      email: "",
      password: "",
      role: "ACCOUNTANT",
      active: true,
    });
    setEditing(false);
  };

  // ============ PERMISSIONS TAB FUNCTIONS ============
  const loadRoles = async (user: any) => {
    try {
      const res = await fetch("/api/admin/roles", {
        headers: {
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
      });
      const data = await res.json();
      console.log("📊 Loaded roles:", data);
      setRoles(data || []);

      // Set initial ADMIN permissions
      const adminRole = data?.find((r: any) => r.role === "ADMIN");
      if (adminRole) {
        setRolePermissions(adminRole.permissions || []);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const selectRole = (roleName: string) => {
    setSelectedRole(roleName);
    const role = roles.find((r) => r.role === roleName);
    if (role) {
      setRolePermissions(role.permissions || []);
    } else {
      setRolePermissions([]);
    }
  };

  const togglePermission = (perm: string) => {
    setRolePermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const selectAllPermissions = () => {
    setRolePermissions([...availablePermissions]);
  };

  const clearAllPermissions = () => {
    setRolePermissions([]);
  };

  const savePermissions = async () => {
    if (!me || me.role !== "ADMIN") {
      toast.error("Only ADMIN can save permissions");
      return;
    }

    setSavingPerms(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": me.id,
          "x-user-role": me.role,
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: rolePermissions,
        }),
      });

      if (res.ok) {
        toast.success(`✅ ${selectedRole} Permissions saved!`);
        loadRoles(me);
      } else {
        toast.error("Failed to save permissions");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Error saving permissions");
    } finally {
      setSavingPerms(false);
    }
  };

  // ============ AUTHORIZATION CHECK ============
  // Only show if user has MANAGE_USERS
  if (!userHasPerm(me, 'MANAGE_USERS')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            ❌ Access Denied
          </h2>
          <p className="text-red-700">You do not have permission to manage users or permissions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* TAB BUTTONS */}
      <div className="flex flex-wrap gap-2 md:gap-4 mb-6 border-b border-gray-300">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 sm:flex-none text-center px-4 py-2 font-semibold text-sm md:text-base ${
            activeTab === "users"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          👥 Users
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`flex-1 sm:flex-none text-center px-4 py-2 font-semibold text-sm md:text-base ${
            activeTab === "permissions"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🎭 Permissions
        </button>
      </div>

      {/* ============ USERS TAB ============ */}
      {activeTab === "users" && (
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-6">👥 Users Managment</h1>

          {/* USER FORM */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {editing ? "✏️ Edit User" : "➕ Add New User"}
            </h2>

            <form onSubmit={saveUser}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                  autoComplete="username"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                  autoComplete="new-password"
                />
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="border rounded px-3 py-2"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex gap-2 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userForm.active}
                    onChange={(e) =>
                      setUserForm({ ...userForm, active: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  {editing ? "✏️ Edit User" : "✅ Add User"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    منسوخ کریں
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* USERS TABLE */}
          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr
                    key={user.id}
                    className="border-t hover:bg-gray-50 text-xs"
                  >
                    <td className="p-3">{user.name}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {user.active ? (
                        <span className="text-green-600">✓ Active</span>
                      ) : (
                        <span className="text-red-600">✗ Inactive</span>
                      )}
                    </td>
                    <td className="p-3 space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => editUser(user)}
                        className="bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded text-xs transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded text-xs transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ PERMISSIONS TAB ============ */}
      {activeTab === "permissions" && (
        <div>
          <h1 className="text-3xl font-bold mb-6">🎭 Role Permissions</h1>

          {/* ROLE SELECTOR */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Select Role:</h2>
            <div className="flex gap-2 flex-wrap">
              {["ADMIN", "ACCOUNTANT", "VIEWER"].map((role) => (
                <button
                  key={role}
                  onClick={() => selectRole(role)}
                  className={`px-4 py-2 rounded font-semibold ${
                    selectedRole === role
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* PERMISSIONS GRID */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedRole} Permissions ({rolePermissions.length})
              </h2>
              <div className="space-x-2">
                <button
                  onClick={selectAllPermissions}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  ✓ Select All
                </button>
                <button
                  onClick={clearAllPermissions}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                   Clear All ✗
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {availablePermissions.map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{perm}</span>
                </label>
              ))}
            </div>

            <button
              onClick={savePermissions}
              disabled={savingPerms}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {savingPerms ? "Saving..." : "✅ Save Permissions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
