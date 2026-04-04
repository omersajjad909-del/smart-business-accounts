"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

const ALL_ROLES = [
  { value: "ADMIN",              label: "Admin" },
  { value: "MANAGER",            label: "Manager" },
  { value: "ACCOUNTANT",         label: "Accountant" },
  { value: "HR_MANAGER",         label: "HR Manager" },
  { value: "SALES",              label: "Sales Executive" },
  { value: "INVENTORY_MANAGER",  label: "Inventory Manager" },
  { value: "CASHIER",            label: "Cashier" },
  { value: "AUDITOR",            label: "Auditor" },
  { value: "SECURITY",           label: "Security / Gate" },
  { value: "VIEWER",             label: "Viewer (Read Only)" },
];

interface Role { role: string; permissions: string[]; }
type CurrentUser = { id: string; role: string; name?: string; email?: string; };

export default function RolePermissionManager() {
  const [user, setUser]                     = useState<CurrentUser | null>(null);
  const [roles, setRoles]                   = useState<Role[]>([]);
  const [selectedRole, setSelectedRole]     = useState<string>("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [msg, setMsg]                       = useState("");

  const availablePermissions = Object.values(PERMISSIONS);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    if (u?.role === "ADMIN") loadRoles(u);
  }, []);

  useEffect(() => {
    const found = roles.find(r => r.role === selectedRole);
    setRolePermissions(found?.permissions || []);
  }, [roles, selectedRole]);

  async function loadRoles(u: CurrentUser) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { "x-user-id": u.id, "x-user-role": u.role },
      });
      const data = await res.json();
      const list: Role[] = Array.isArray(data) ? data : (Array.isArray(data?.roles) ? data.roles : []);
      setRoles(list);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!user || user.role !== "ADMIN") return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id, "x-user-role": user.role },
        body: JSON.stringify({ role: selectedRole, permissions: rolePermissions }),
      });
      if (res.ok) {
        setMsg("Saved successfully!");
        loadRoles(user);
      } else {
        setMsg("Failed to save.");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  }

  /* ── styles ── */
  const s = {
    page:    { padding: "24px", maxWidth: 1100, margin: "0 auto", fontFamily: "inherit" },
    heading: { fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 },
    sub:     { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 },
    grid:    { display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 } as React.CSSProperties,
    panel:   { borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "16px" },
    roleBtn: (active: boolean): React.CSSProperties => ({
      display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
      borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4,
      background: active ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
      borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
      color: active ? "#a5b4fc" : "rgba(255,255,255,0.55)",
      fontFamily: "inherit",
    }),
    permBox: (checked: boolean): React.CSSProperties => ({
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      borderRadius: 8, cursor: "pointer",
      background: checked ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
      border: checked ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.07)",
    }),
  };

  if (!user) return <div style={{ color: "rgba(255,255,255,0.4)", padding: 32 }}>Loading…</div>;
  if (user.role !== "ADMIN") return (
    <div style={{ padding: 32, color: "#f87171" }}>Only ADMIN can manage roles.</div>
  );

  return (
    <div style={s.page}>
      <div style={s.heading}>🎭 Roles &amp; Permissions</div>
      <div style={s.sub}>Configure which permissions each role has</div>

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading roles…</div>
      ) : (
        <div style={s.grid}>
          {/* Role list */}
          <div style={s.panel}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10 }}>Roles</div>
            {ALL_ROLES.map(({ value, label }) => {
              const found = roles.find(r => r.role === value);
              const count = found?.permissions?.length || 0;
              return (
                <button key={value} style={s.roleBtn(selectedRole === value)} onClick={() => setSelectedRole(value)}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{count} permissions</div>
                </button>
              );
            })}
          </div>

          {/* Permissions */}
          <div style={s.panel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>
                  {ALL_ROLES.find(r => r.value === selectedRole)?.label || selectedRole}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Select which permissions this role should have</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setRolePermissions([...availablePermissions])}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Select All
                </button>
                <button onClick={() => setRolePermissions([])}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  ✗ Clear All
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {availablePermissions.map(p => {
                const checked = rolePermissions.includes(p);
                return (
                  <label key={p} style={s.permBox(checked)}>
                    <input type="checkbox" checked={checked} onChange={() =>
                      setRolePermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
                    } style={{ accentColor: "#6366f1", width: 15, height: 15 }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: checked ? "#c7d2fe" : "rgba(255,255,255,0.55)" }}>{p}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={save} disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: saving ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {saving ? "Saving…" : "💾 Save Permissions"}
              </button>
              {msg && <span style={{ fontSize: 13, color: msg.includes("success") ? "#34d399" : "#f87171" }}>{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
