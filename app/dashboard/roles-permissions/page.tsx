"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface Role {
  role: string;
  permissions: string[];
}

type CurrentUser = {
  id: string;
  role: string;
  name?: string;
  email?: string;
};

export default function RolePermissionManager() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Available permissions from lib/permissions.ts
  const availablePermissions = Object.values(PERMISSIONS);

  // Load current user and roles
  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u && u.role === "ADMIN") {
      loadRoles(u);
    }
  }, []);

  // When roles load, update selected role permissions
  useEffect(() => {
    if (roles && roles.length > 0) {
      const selectedRoleData = roles.find(r => r.role === selectedRole);
      if (selectedRoleData) {
        console.log(`Setting permissions for ${selectedRole}:`, selectedRoleData.permissions);
        setRolePermissions(selectedRoleData.permissions || []);
      }
    }
  }, [roles, selectedRole]);

  const loadRoles = async (u: CurrentUser) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        headers: {
          "x-user-id": u.id,
          "x-user-role": u.role,
        },
      });
      const data = await res.json();
      console.log("Loaded roles:", data);
      
      setRoles(data || []);
      
      // Set initial role permissions
      if (data && data.length > 0) {
        const adminRole = data.find((r: Role) => r.role === "ADMIN");
        if (adminRole) {
          setRolePermissions(adminRole.permissions || []);
        }
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (roleName: string) => {
    setSelectedRole(roleName);
    console.log(`Selected role: ${roleName}, All roles:`, roles);
    
    const role = roles.find(r => r.role === roleName);
    console.log(`Found role:`, role);
    
    if (role) {
      setRolePermissions(role.permissions || []);
    } else {
      setRolePermissions([]);
    }
  };

  const toggle = (perm: string) => {
    setRolePermissions(prev =>
      prev.includes(perm)
        ? prev.filter(p => p !== perm)
        : [...prev, perm]
    );
  };

  const save = async () => {
    if (!user || user.role !== "ADMIN") {
      alert("Only ADMIN can save permissions");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          role: selectedRole,
          permissions: rolePermissions,
        }),
      });

      if (res.ok) {
        alert(`✅ ${selectedRole} role permissions saved successfully!`);
        loadRoles(user);
      } else {
        alert("Failed to save permissions");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      alert("Error saving permissions");
    } finally {
      setSaving(false);
    }
  };

  // Guard - Check authorization
  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700">Loading session...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">❌ رسائی مسترد</h2>
          <p className="text-red-700">صرف ADMIN صارفین رولز کو سنبھال سکتے ہیں</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🎭 Roles & Permissions</h1>
        <p className="text-gray-600">Configure which permissions each role has</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Role Selector */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-bold text-lg mb-4">Roles</h2>
            <div className="space-y-2">
              {["ADMIN", "ACCOUNTANT", "VIEWER"].map(roleName => {
                const roleData = roles.find(r => r.role === roleName);
                const permCount = roleData?.permissions?.length || 0;
                
                return (
                  <button
                    key={roleName}
                    onClick={() => selectRole(roleName)}
                    className={`w-full text-left px-4 py-3 rounded transition ${
                      selectedRole === roleName
                        ? "bg-blue-100 border-l-4 border-blue-600 font-semibold"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="font-semibold">{roleName}</div>
                    <div className="text-xs text-gray-600">
                      {permCount} permissions
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions Manager */}
          <div className="lg:col-span-3 bg-white border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-2">{selectedRole}</h2>
            <p className="text-gray-600 mb-6">
              Select which permissions this role should have
            </p>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setRolePermissions([...availablePermissions])}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                ✓ Select All
              </button>
              <button
                onClick={() => setRolePermissions([])}
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                ✗ Clear All
              </button>
            </div>

            {/* Permissions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {availablePermissions.map(p => (
                <label
                  key={p}
                  className="flex items-center cursor-pointer p-3 rounded border hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={rolePermissions.includes(p)}
                    onChange={() => toggle(p)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="ml-3 text-sm font-medium">{p}</span>
                </label>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "💾 Save Permissions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
