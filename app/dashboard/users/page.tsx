"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

const ff = "'Outfit','Inter',sans-serif";

function userHasPerm(user: any, perm: string) {
  if (!user) return false;
  const p = perm.toUpperCase();
  if (user.role === "ADMIN") return true;
  if (user.permissions?.some((x: any) => (typeof x === "string" ? x : x.permission || "").toUpperCase() === p)) return true;
  if (user.rolePermissions?.some((x: any) => (typeof x === "string" ? x : x.permission || "").toUpperCase() === p)) return true;
  return false;
}

interface Branch { id: string; code: string; name: string; }
interface Role { role: string; permissions: string[]; }

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN:      { bg: "rgba(248,113,113,.12)",  color: "#f87171",  border: "rgba(248,113,113,.3)"  },
  ACCOUNTANT: { bg: "rgba(99,102,241,.12)",   color: "#818cf8",  border: "rgba(99,102,241,.3)"   },
  VIEWER:     { bg: "rgba(148,163,184,.12)",  color: "#94a3b8",  border: "rgba(148,163,184,.3)"  },
  MANAGER:    { bg: "rgba(52,211,153,.12)",   color: "#34d399",  border: "rgba(52,211,153,.3)"   },
};

const inp: React.CSSProperties = {
  background: "var(--app-bg)", border: "1.5px solid var(--border)", borderRadius: 9,
  padding: "9px 13px", color: "var(--text-primary)", fontFamily: ff, fontSize: 13,
  outline: "none", width: "100%", boxSizing: "border-box",
};

export default function UsersMasterPage() {
  const [me, setMe]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState<"users" | "permissions">("users");

  // Users
  const [users, setUsers]   = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchAssignments, setBranchAssignments] = useState<Record<string, string[]>>({});
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm] = useState({ id: "", name: "", email: "", password: "", role: "ACCOUNTANT", active: true });
  const [selBranches, setSelBranches] = useState<string[]>([]);

  // Permissions
  const [roles, setRoles]   = useState<Role[]>([]);
  const [selRole, setSelRole] = useState("ADMIN");
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState("");

  const allPerms = Object.values(PERMISSIONS);
  const h = (u?: any) => { const usr = u || me; return { "x-user-role": "ADMIN", "x-user-id": usr?.id || "", "x-company-id": usr?.companyId || "" }; };

  useEffect(() => {
    const user = getCurrentUser();
    setMe(user);
    if (user?.role === "ADMIN") {
      Promise.all([loadUsers(user), loadBranches(user), loadBranchAssignments(user), loadRoles(user)]).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  async function loadUsers(u?: any) {
    const res = await fetch("/api/users", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => []);
    setUsers(Array.isArray(d) ? d : []);
  }
  async function loadBranches(u?: any) {
    const res = await fetch("/api/branches", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => []);
    setBranches(Array.isArray(d) ? d : []);
  }
  async function loadBranchAssignments(u?: any) {
    const res = await fetch("/api/company/admin-control", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBranchAssignments(d?.branchAssignments || {});
  }
  async function loadRoles(u?: any) {
    const res = await fetch("/api/admin/roles", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => []);
    const list: Role[] = Array.isArray(d) ? d : (Array.isArray(d?.roles) ? d.roles : []);
    setRoles(list);
    const adminRole = list.find(r => r.role === "ADMIN");
    if (adminRole) setRolePerms(adminRole.permissions || []);
  }

  function openAdd() {
    setForm({ id: "", name: "", email: "", password: "", role: "ACCOUNTANT", active: true });
    setSelBranches([]); setEditing(false); setShowModal(true);
  }
  function openEdit(user: any) {
    setForm({ id: user.id, name: user.name, email: user.email, password: "", role: user.role, active: user.active ?? true });
    setSelBranches(branchAssignments[user.id] || []); setEditing(true); setShowModal(true);
  }
  function closeModal() { setShowModal(false); }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error("Name and email required");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...h() },
        body: JSON.stringify({ id: form.id || undefined, name: form.name, email: form.email, password: form.password, role: form.role, active: form.active }),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      const saved = await res.json();
      const uid = saved?.id || form.id;
      if (uid) {
        await fetch("/api/company/admin-control", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...h() },
          body: JSON.stringify({ branchAssignments: { ...branchAssignments, [uid]: selBranches } }),
        });
      }
      toast.success(editing ? "User updated!" : "User created!");
      closeModal(); loadUsers(); loadBranchAssignments();
    } catch { toast.error("Error saving user"); }
    finally { setSaving(false); }
  }

  async function deleteUser(id: string) {
    if (!await confirmToast("Delete this user?")) return;
    const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json", ...h() }, body: JSON.stringify({ id }) });
    if (res.ok) {
      const next = { ...branchAssignments }; delete next[id];
      await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json", ...h() }, body: JSON.stringify({ branchAssignments: next }) });
      toast.success("User deleted!"); loadUsers(); loadBranchAssignments();
    }
  }

  function pickRole(r: string) {
    setSelRole(r);
    setRolePerms(roles.find(x => x.role === r)?.permissions || []);
  }

  async function savePermissions() {
    setSavingPerms(true);
    const res = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json", ...h() }, body: JSON.stringify({ role: selRole, permissions: rolePerms }) });
    if (res.ok) { toast.success(`${selRole} permissions saved!`); loadRoles(); }
    else toast.error("Failed to save permissions");
    setSavingPerms(false);
  }

  // ── ACCESS DENIED ─────────────────────────────────────────────────────────
  if (!loading && !userHasPerm(me, "MANAGE_USERS")) {
    return (
      <div style={{ padding: "40px 28px", fontFamily: ff }}>
        <div style={{ padding: 32, borderRadius: 16, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.25)", textAlign: "center", color: "#f87171" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Access Denied</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>You do not have permission to manage users.</div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontFamily: ff }}>Loading…</div>;

  const filteredPerms = permSearch ? allPerms.filter(p => p.toLowerCase().includes(permSearch.toLowerCase())) : allPerms;

  // Group permissions by category
  const permGroups: Record<string, string[]> = {};
  filteredPerms.forEach(p => {
    const cat = p.startsWith("AI_") ? "AI Features" : p.startsWith("VIEW_") ? "View Access" : p.startsWith("CREATE_") ? "Create Access" : p.startsWith("BANK_") || p.startsWith("PAYMENT_") || p.startsWith("EXPENSE_") || p.startsWith("TAX_") ? "Banking & Tax" : p.startsWith("MANAGE_") ? "Management" : "Other";
    if (!permGroups[cat]) permGroups[cat] = [];
    permGroups[cat].push(p);
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: ff, color: "var(--text-primary)", maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Users Management</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{users.length} user{users.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,.35)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New User
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 11, padding: 4, width: "fit-content" }}>
        {(["users", "permissions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 20px", borderRadius: 8, background: tab === t ? "#6366f1" : "transparent", border: "none", color: tab === t ? "white" : "var(--text-muted)", fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {t === "users" ? "👥 Users" : "🎭 Permissions"}
          </button>
        ))}
      </div>

      {/* ══════════════ USERS TAB ══════════════ */}
      {tab === "users" && (
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Name", "Email", "Role", "Branches", "Status", "Actions"].map((h, i) => (
                  <th key={h} style={{ padding: "11px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0
                ? <tr><td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}><div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>No users yet — add your first team member</td></tr>
                : users.map((u, i) => {
                  const rc = ROLE_COLORS[u.role] || ROLE_COLORS.VIEWER;
                  const assignedBranches = (branchAssignments[u.id] || []).map(bid => branches.find(b => b.id === bid)?.name).filter(Boolean);
                  return (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--app-bg)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#818cf8", flexShrink: 0 }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>{u.email}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                        {assignedBranches.length > 0 ? assignedBranches.join(", ") : <span style={{ color: "var(--text-muted)" }}>All / Not set</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: u.active ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", color: u.active ? "#34d399" : "#f87171", border: `1px solid ${u.active ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}` }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEdit(u)} style={{ padding: "5px 13px", borderRadius: 7, border: "1px solid rgba(99,102,241,.35)", background: "rgba(99,102,241,.1)", color: "#818cf8", fontFamily: ff, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => deleteUser(u.id)} style={{ padding: "5px 13px", borderRadius: 7, border: "1px solid rgba(248,113,113,.35)", background: "rgba(248,113,113,.07)", color: "#f87171", fontFamily: ff, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════ PERMISSIONS TAB ══════════════ */}
      {tab === "permissions" && (
        <div>
          {/* Role pills */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {["ADMIN", "ACCOUNTANT", "VIEWER"].map(r => {
              const rc = ROLE_COLORS[r] || ROLE_COLORS.VIEWER;
              const active = selRole === r;
              return (
                <button key={r} onClick={() => pickRole(r)} style={{ padding: "9px 22px", borderRadius: 10, border: `1.5px solid ${active ? rc.border : "var(--border)"}`, background: active ? rc.bg : "var(--panel-bg)", color: active ? rc.color : "var(--text-muted)", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {r} {active && `(${rolePerms.length})`}
                </button>
              );
            })}
          </div>

          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 22px" }}>
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selRole} — {rolePerms.length} permissions enabled</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input placeholder="Search permissions…" value={permSearch} onChange={e => setPermSearch(e.target.value)} style={{ ...inp, width: 200, padding: "7px 12px" }} />
                <button onClick={() => setRolePerms([...allPerms])} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.08)", color: "#34d399", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>All</button>
                <button onClick={() => setRolePerms([])} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.07)", color: "#f87171", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>None</button>
                <button onClick={savePermissions} disabled={savingPerms} style={{ padding: "7px 18px", borderRadius: 8, background: savingPerms ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {savingPerms ? "Saving…" : "💾 Save"}
                </button>
              </div>
            </div>

            {/* Permission groups */}
            {Object.entries(permGroups).map(([cat, perms]) => (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>{cat}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 6 }}>
                  {perms.map(perm => {
                    const on = rolePerms.includes(perm);
                    return (
                      <label key={perm} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${on ? "rgba(99,102,241,.3)" : "var(--border)"}`, background: on ? "rgba(99,102,241,.07)" : "var(--app-bg)", cursor: "pointer" }}>
                        <div onClick={() => setRolePerms(p => p.includes(perm) ? p.filter(x => x !== perm) : [...p, perm])}
                          style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? "#6366f1" : "var(--border)"}`, background: on ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                          {on && <svg width="9" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: on ? "var(--text-primary)" : "var(--text-muted)" }}>{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ ADD / EDIT MODAL ══════════════ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.4)" }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{editing ? "✏️ Edit User" : "➕ Add New User"}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{editing ? "Update user details and branch access" : "Create a new team member account"}</div>
              </div>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <form onSubmit={saveUser} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Full Name</div>
                  <input style={inp} placeholder="Muhammad Ali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Email</div>
                  <input style={inp} type="email" placeholder="ali@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="username" required />
                </div>
              </div>

              {/* Password + Role */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{editing ? "New Password (optional)" : "Password"}</div>
                  <input style={inp} type="password" placeholder={editing ? "Leave blank to keep" : "Enter password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Role</div>
                  <select style={inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>

              {/* Allowed Branches */}
              {branches.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Allowed Branches</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {branches.map(b => {
                      const checked = selBranches.includes(b.id);
                      return (
                        <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: `1px solid ${checked ? "rgba(99,102,241,.35)" : "var(--border)"}`, background: checked ? "rgba(99,102,241,.07)" : "var(--app-bg)", cursor: "pointer" }}>
                          <div onClick={() => setSelBranches(p => p.includes(b.id) ? p.filter(x => x !== b.id) : [...p, b.id])}
                            style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? "#6366f1" : "var(--border)"}`, background: checked ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {checked && <svg width="9" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{b.code} — {b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>For Admin users, select all branches to grant full access.</div>
                </div>
              )}

              {/* Active toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  style={{ width: 38, height: 22, borderRadius: 11, background: form.active ? "#6366f1" : "var(--border)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: form.active ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.2)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Active account</span>
              </label>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: saving ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Saving…" : editing ? "Update User" : "Create User"}
                </button>
                <button type="button" onClick={closeModal} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-muted)", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
