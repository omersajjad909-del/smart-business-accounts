"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

const ff = "'Outfit','Inter',sans-serif";

/* ── constants ── */
const ROLE_META: Record<string, { color: string; bg: string; border: string; desc: string }> = {
  ADMIN:             { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.3)",  desc: "Full access to all features, settings, and user management." },
  MANAGER:           { color: "#34d399", bg: "rgba(52,211,153,.12)",  border: "rgba(52,211,153,.3)",   desc: "Manage operations, approve transactions, and view reports." },
  ACCOUNTANT:        { color: "#818cf8", bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.3)",   desc: "Access to accounting, invoices, expenses, and financial reports." },
  HR_MANAGER:        { color: "#fbbf24", bg: "rgba(251,191,36,.12)",  border: "rgba(251,191,36,.3)",   desc: "Manage employees, payroll, and HR-related data." },
  SALES:             { color: "#38bdf8", bg: "rgba(56,189,248,.12)",  border: "rgba(56,189,248,.3)",   desc: "Create sales orders, manage customers, and view sales reports." },
  INVENTORY_MANAGER: { color: "#4ade80", bg: "rgba(74,222,128,.12)",  border: "rgba(74,222,128,.3)",   desc: "Manage inventory, stock, items, and purchase orders." },
  CASHIER:           { color: "#c084fc", bg: "rgba(192,132,252,.12)", border: "rgba(192,132,252,.3)",  desc: "Process payments, receipts, and basic transactions." },
  AUDITOR:           { color: "#fb923c", bg: "rgba(251,146,60,.12)",  border: "rgba(251,146,60,.3)",   desc: "Read-only access to financial data and audit logs." },
  SECURITY:          { color: "#94a3b8", bg: "rgba(148,163,184,.12)", border: "rgba(148,163,184,.3)",  desc: "Gate and visitor management access only." },
  VIEWER:            { color: "#64748b", bg: "rgba(100,116,139,.12)", border: "rgba(100,116,139,.3)",  desc: "Read-only access to dashboards and basic reports." },
};
const ALL_ROLES = Object.keys(ROLE_META);

function roleMeta(r: string) { return ROLE_META[r] || { color: "#94a3b8", bg: "rgba(148,163,184,.1)", border: "rgba(148,163,184,.2)", desc: "" }; }

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 9,
  padding: "9px 13px", color: "white", fontFamily: ff, fontSize: 13,
  outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 };

/* ── types ── */
interface UserRow { id: string; name: string; email: string; role: string; active: boolean; }
interface Branch   { id: string; code: string; name: string; }
interface RoleData  { role: string; permissions: string[]; }

/* ── permission grouping ── */
function groupPerms(perms: string[]) {
  const groups: Record<string, string[]> = {};
  for (const p of perms) {
    const cat =
      p.startsWith("AI_")                                          ? "AI Features"      :
      p.startsWith("VIEW_")                                        ? "View Access"      :
      p.startsWith("CREATE_")                                      ? "Create"           :
      p.startsWith("EDIT_") || p.startsWith("UPDATE_")            ? "Edit"             :
      p.startsWith("DELETE_")                                      ? "Delete"           :
      p.startsWith("BANK_") || p.startsWith("PAYMENT_") || p.startsWith("EXPENSE_") || p.startsWith("TAX_") ? "Banking & Tax" :
      p.startsWith("MANAGE_")                                      ? "Management"       : "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }
  return groups;
}

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function TeamAndPermissionsPage() {
  const [me,      setMe]      = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<"team" | "invite" | "permissions">("team");

  /* team */
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchMap, setBranchMap] = useState<Record<string, string[]>>({});

  /* user modal */
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({ id: "", name: "", email: "", password: "", role: "ACCOUNTANT", active: true });
  const [selBr,    setSelBr]    = useState<string[]>([]);

  /* invite */
  const [invEmail,   setInvEmail]   = useState("");
  const [invName,    setInvName]    = useState("");
  const [invRole,    setInvRole]    = useState("VIEWER");
  const [invBranches, setInvBranches] = useState<string[]>([]);
  const [invLoading, setInvLoading]  = useState(false);

  /* permissions */
  const [roles,      setRoles]      = useState<RoleData[]>([]);
  const [selRole,    setSelRole]    = useState("ADMIN");
  const [rolePerms,  setRolePerms]  = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState("");
  const [savingPerms, setSavingPerms] = useState(false);

  const allPerms = useMemo(() => Object.values(PERMISSIONS), []);
  const filteredPerms = useMemo(() =>
    permSearch ? allPerms.filter(p => p.toLowerCase().includes(permSearch.toLowerCase())) : allPerms,
    [allPerms, permSearch]);
  const permGroups = useMemo(() => groupPerms(filteredPerms), [filteredPerms]);

  const h = (u?: any) => {
    const usr = u || me;
    const headers: Record<string, string> = { "x-user-role": "ADMIN" };
    if (usr?.id)        headers["x-user-id"]    = usr.id;
    if (usr?.companyId) headers["x-company-id"] = usr.companyId;
    return headers;
  };

  /* ── load ── */
  useEffect(() => {
    const user = getCurrentUser();
    setMe(user);
    if (user?.role === "ADMIN") {
      Promise.all([loadUsers(user), loadBranches(user), loadBranchMap(user), loadRoles(user)]).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  async function loadUsers(u?: any) {
    const res = await fetch("/api/users", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => []);
    setUsers(Array.isArray(d) ? d : []);
  }
  async function loadBranches(u?: any) {
    const usr = u || getCurrentUser();
    // If we have companyId, send it directly. Otherwise let JWT cookie resolve it.
    const hdrs: Record<string, string> = {};
    if (usr?.companyId) {
      hdrs["x-user-role"]  = "ADMIN";
      hdrs["x-user-id"]    = usr.id || "";
      hdrs["x-company-id"] = usr.companyId;
    }
    const res = await fetch("/api/branches", { headers: hdrs, credentials: "include" }).catch(() => null);
    const d = await res?.json().catch(() => []);
    setBranches(Array.isArray(d) ? d : []);
  }
  async function loadBranchMap(u?: any) {
    const usr = u || getCurrentUser();
    const hdrs: Record<string, string> = {};
    if (usr?.companyId) {
      hdrs["x-user-role"]  = "ADMIN";
      hdrs["x-user-id"]    = usr.id || "";
      hdrs["x-company-id"] = usr.companyId;
    }
    const res = await fetch("/api/company/admin-control", { headers: hdrs, credentials: "include" }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setBranchMap(d?.branchAssignments || {});
  }
  async function loadRoles(u?: any) {
    const res = await fetch("/api/admin/roles", { headers: h(u) }).catch(() => null);
    const d = await res?.json().catch(() => []);
    const list: RoleData[] = Array.isArray(d) ? d : (Array.isArray(d?.roles) ? d.roles : []);
    setRoles(list);
    const admin = list.find(r => r.role === "ADMIN");
    if (admin) setRolePerms(admin.permissions || []);
  }

  /* ── user CRUD ── */
  function openAdd() {
    setForm({ id: "", name: "", email: "", password: "", role: "ACCOUNTANT", active: true });
    setSelBr([]); setEditing(false); setModal(true);
  }
  function openEdit(u: UserRow) {
    setForm({ id: u.id, name: u.name, email: u.email, password: "", role: u.role, active: u.active ?? true });
    setSelBr(branchMap[u.id] || []); setEditing(true); setModal(true);
  }

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
          body: JSON.stringify({ branchAssignments: { ...branchMap, [uid]: selBr } }),
        });
      }
      toast.success(editing ? "User updated!" : "User created!");
      setModal(false); loadUsers(); loadBranchMap();
    } catch { toast.error("Error saving user"); }
    finally { setSaving(false); }
  }

  async function deleteUser(id: string) {
    if (!await confirmToast("Delete this user?")) return;
    const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json", ...h() }, body: JSON.stringify({ id }) });
    if (res.ok) {
      const next = { ...branchMap }; delete next[id];
      await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json", ...h() }, body: JSON.stringify({ branchAssignments: next }) });
      toast.success("User deleted!"); loadUsers(); loadBranchMap();
    }
  }

  /* ── invite ── */
  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!invEmail) return;
    setInvLoading(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...h() },
        body: JSON.stringify({ email: invEmail, role: invRole, name: invName || undefined, branches: invBranches }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invitation sent successfully!");
        setInvEmail(""); setInvName(""); setInvRole("VIEWER"); setInvBranches([]);
      } else {
        toast.error(data.error || "Failed to send invite");
      }
    } catch { toast.error("Network error"); }
    finally { setInvLoading(false); }
  }

  /* ── permissions ── */
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

  /* ── access denied ── */
  if (!loading && me?.role !== "ADMIN") return (
    <div style={{ padding: "40px 28px", fontFamily: ff }}>
      <div style={{ padding: 32, borderRadius: 16, background: "rgba(248,113,113,.07)", border: "1px solid rgba(248,113,113,.25)", textAlign: "center", color: "#f87171" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Access Denied</div>
        <div style={{ fontSize: 13, color: "#475569" }}>Only admins can manage team members and permissions.</div>
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#475569", fontFamily: ff }}>Loading…</div>;

  const activeCount  = users.filter(u => u.active).length;
  const adminCount   = users.filter(u => u.role === "ADMIN").length;

  /* ════════════════ RENDER ════════════════ */
  return (
    <div style={{ padding: "24px 28px 60px", maxWidth: 1120, fontFamily: ff, color: "white" }}>
      <style>{`
        select option { background: #0f172a; color: white; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 8px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-.3px" }}>Team & Permissions</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>Manage users, send invitations, and control role permissions</p>
        </div>
        {tab === "team" && (
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,.35)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
        )}
        {tab === "invite" && (
          <div style={{ fontSize: 12, color: "#475569", padding: "6px 14px", borderRadius: 20, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.15)" }}>
            ✉️ Invite via email
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Users",   value: users.length,  color: "#818cf8" },
          { label: "Active",         value: activeCount,   color: "#34d399" },
          { label: "Admins",         value: adminCount,    color: "#f87171" },
          { label: "Roles Defined",  value: roles.length,  color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ padding: "14px 18px", borderRadius: 14, background: "rgba(255,255,255,.03)", border: `1px solid ${s.color}20` }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {([
          { key: "team",        label: "👥 Team Members" },
          { key: "invite",      label: "✉️ Invite" },
          { key: "permissions", label: "🎭 Roles & Permissions" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 20px", borderRadius: 9,
            background: tab === t.key ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "transparent",
            border: "none", color: tab === t.key ? "white" : "#475569",
            fontFamily: ff, fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: tab === t.key ? "0 2px 10px rgba(99,102,241,.3)" : "none",
            transition: "all .15s",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: TEAM ══════════════ */}
      {tab === "team" && (
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
          {users.length === 0 ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "#334155" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 6 }}>No team members yet</div>
              <div style={{ fontSize: 13 }}>Add your first user or send an invitation</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  {["Member", "Email", "Role", "Branch Access", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", fontSize: 10, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".08em", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rm = roleMeta(u.role);
                  const assignedBranches = (branchMap[u.id] || []).map(bid => branches.find(b => b.id === bid)?.name).filter(Boolean);
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none", transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: rm.bg, border: `1px solid ${rm.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: rm.color, flexShrink: 0 }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569" }}>{u.email}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: rm.bg, color: rm.color, border: `1px solid ${rm.border}` }}>{u.role}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#475569" }}>
                        {assignedBranches.length > 0 ? assignedBranches.join(", ") : <span style={{ color: "#334155" }}>All access</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: u.active ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)",
                          color: u.active ? "#34d399" : "#f87171",
                          border: `1px solid ${u.active ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}` }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEdit(u)} style={{ padding: "5px 13px", borderRadius: 7, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.08)", color: "#818cf8", fontFamily: ff, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => deleteUser(u.id)} style={{ padding: "5px 13px", borderRadius: 7, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.06)", color: "#f87171", fontFamily: ff, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ══════════════ TAB: INVITE ══════════════ */}
      {tab === "invite" && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, padding: "28px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Send Email Invitation</div>
            <form onSubmit={sendInvite}>
              {/* Name + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Full Name <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span></label>
                  <input style={inp} placeholder="Muhammad Ali" value={invName} onChange={e => setInvName(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Email Address <span style={{ color: "#f87171" }}>*</span></label>
                  <input style={inp} type="email" placeholder="user@example.com" value={invEmail} onChange={e => setInvEmail(e.target.value)} required />
                </div>
              </div>

              {/* Role selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Select Role</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 8 }}>
                  {ALL_ROLES.map(r => {
                    const rm = roleMeta(r);
                    const active = invRole === r;
                    return (
                      <label key={r} onClick={() => setInvRole(r)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, border: `1.5px solid ${active ? rm.border : "rgba(255,255,255,.07)"}`, background: active ? rm.bg : "rgba(255,255,255,.02)", cursor: "pointer", transition: "all .12s" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: rm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: active ? 700 : 400, color: active ? rm.color : "#475569" }}>{r.replace(/_/g, " ")}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Selected role description */}
              {invRole && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: roleMeta(invRole).bg, border: `1px solid ${roleMeta(invRole).border}`, marginBottom: 20 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: roleMeta(invRole).color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                    {invRole.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: roleMeta(invRole).color }}>{invRole.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{roleMeta(invRole).desc}</div>
                  </div>
                </div>
              )}

              {/* Branch access for invite */}
              {branches.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={lbl}>Branch Access <span style={{ color: "#334155", fontWeight: 400 }}>(optional)</span></label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {branches.map(b => {
                      const checked = invBranches.includes(b.id);
                      return (
                        <label key={b.id} onClick={() => setInvBranches(p => p.includes(b.id) ? p.filter(x => x !== b.id) : [...p, b.id])}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, border: `1px solid ${checked ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.07)"}`, background: checked ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.02)", cursor: "pointer", transition: "all .12s" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? "#6366f1" : "rgba(255,255,255,.15)"}`, background: checked ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {checked && <svg width="9" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: checked ? "white" : "#475569" }}>{b.name}</div>
                            <div style={{ fontSize: 10, color: "#334155" }}>{b.code}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>Unchecked = access to all branches</div>
                </div>
              )}

              <button type="submit" disabled={invLoading || !invEmail} style={{ width: "100%", padding: 12, borderRadius: 10, background: invLoading || !invEmail ? "rgba(99,102,241,.3)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: invLoading || !invEmail ? "not-allowed" : "pointer" }}>
                {invLoading ? "Sending…" : "✉️ Send Invitation"}
              </button>
            </form>
          </div>

          <div style={{ marginTop: 12, padding: "14px 18px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
              Invited member will receive an email with a link to set their password and join your workspace. You can change their role anytime from the <strong style={{ color: "#818cf8" }}>Team Members</strong> tab.
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: PERMISSIONS ══════════════ */}
      {tab === "permissions" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>

          {/* Role sidebar */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 10px", position: "sticky", top: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#334155", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 8 }}>Roles</div>
            {ALL_ROLES.map(r => {
              const rm = roleMeta(r);
              const found = roles.find(x => x.role === r);
              const count = found?.permissions?.length || 0;
              const active = selRole === r;
              return (
                <button key={r} onClick={() => pickRole(r)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: ff, background: active ? rm.bg : "transparent", borderLeft: `3px solid ${active ? rm.color : "transparent"}`, marginBottom: 3, transition: "all .12s" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? rm.color : "#475569" }}>{r.replace(/_/g, " ")}</div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{count} perms</div>
                  </div>
                  {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: rm.color, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Permissions panel */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "20px 22px" }}>
            {/* Top bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: roleMeta(selRole).color }}>{selRole.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{rolePerms.length} of {allPerms.length} permissions enabled</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input placeholder="Search…" value={permSearch} onChange={e => setPermSearch(e.target.value)}
                  style={{ ...inp, width: 160, padding: "7px 12px" }} />
                <button onClick={() => setRolePerms([...allPerms])} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(52,211,153,.3)", background: "rgba(52,211,153,.07)", color: "#34d399", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>All</button>
                <button onClick={() => setRolePerms([])} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.07)", color: "#f87171", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>None</button>
                <button onClick={savePermissions} disabled={savingPerms} style={{ padding: "7px 18px", borderRadius: 8, background: savingPerms ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 12, fontWeight: 700, cursor: savingPerms ? "default" : "pointer" }}>
                  {savingPerms ? "Saving…" : "💾 Save"}
                </button>
              </div>
            </div>

            {/* Permission groups */}
            {Object.entries(permGroups).map(([cat, perms]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 600, color: "#475569" }}>({perms.filter(p => rolePerms.includes(p)).length}/{perms.length})</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 6 }}>
                  {perms.map(perm => {
                    const on = rolePerms.includes(perm);
                    return (
                      <label key={perm} onClick={() => setRolePerms(p => p.includes(perm) ? p.filter(x => x !== perm) : [...p, perm])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${on ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.06)"}`, background: on ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.01)", cursor: "pointer", transition: "all .1s" }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${on ? "#6366f1" : "rgba(255,255,255,.15)"}`, background: on ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {on && <svg width="9" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: on ? "white" : "#475569" }}>{perm}</span>
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
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(5px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 40px 100px rgba(0,0,0,.5)" }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{editing ? "✏️ Edit User" : "➕ Add New User"}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{editing ? "Update user details and branch access" : "Create a new team member account"}</div>
              </div>
              <button onClick={() => setModal(false)} style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#475569", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>×</button>
            </div>

            <form onSubmit={saveUser} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name + Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>Full Name</label>
                  <input style={inp} placeholder="Muhammad Ali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" placeholder="ali@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="username" required />
                </div>
              </div>

              {/* Password + Role */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={lbl}>{editing ? "New Password (optional)" : "Password"}</label>
                  <input style={inp} type="password" placeholder={editing ? "Leave blank to keep" : "Enter password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
                </div>
                <div>
                  <label style={lbl}>Role</label>
                  <select style={{ ...inp }} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ALL_ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>

              {/* Selected role info */}
              {form.role && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, background: roleMeta(form.role).bg, border: `1px solid ${roleMeta(form.role).border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: roleMeta(form.role).color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: roleMeta(form.role).color, fontWeight: 600 }}>{roleMeta(form.role).desc}</span>
                </div>
              )}

              {/* Branch access */}
              {branches.length > 0 && (
                <div>
                  <label style={lbl}>Allowed Branches</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {branches.map(b => {
                      const checked = selBr.includes(b.id);
                      return (
                        <label key={b.id} onClick={() => setSelBr(p => p.includes(b.id) ? p.filter(x => x !== b.id) : [...p, b.id])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderRadius: 9, border: `1px solid ${checked ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.07)"}`, background: checked ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.02)", cursor: "pointer" }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? "#6366f1" : "rgba(255,255,255,.15)"}`, background: checked ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {checked && <svg width="9" height="9" viewBox="0 0 12 10" fill="none"><path d="M1 5.5L4.5 9 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{b.code} — {b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>Leave all unchecked = full branch access</div>
                </div>
              )}

              {/* Active toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div onClick={() => setForm(f => ({ ...f, active: !f.active }))} style={{ width: 40, height: 22, borderRadius: 11, background: form.active ? "#6366f1" : "rgba(255,255,255,.1)", position: "relative", transition: "background .2s", flexShrink: 0, cursor: "pointer" }}>
                  <div style={{ position: "absolute", top: 3, left: form.active ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Active account</span>
              </label>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 10, background: saving ? "rgba(99,102,241,.5)" : "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontFamily: ff, fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Saving…" : editing ? "Update User" : "Create User"}
                </button>
                <button type="button" onClick={() => setModal(false)} style={{ padding: "12px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "#475569", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
