"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  twoFactorEnabled: boolean;
  companyId: string | null;
  companyName: string | null;
  companyPlan: string | null;
};

type Stats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminCount: number;
};

const ROLES = ["ADMIN", "ACCOUNTANT", "MANAGER", "VIEWER", "USER"];

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN:      { bg: "rgba(139,92,246,.18)", color: "#c4b5fd" },
  ACCOUNTANT: { bg: "rgba(79,124,255,.18)", color: "#93c5fd" },
  MANAGER:    { bg: "rgba(251,146,60,.18)", color: "#fdba74" },
  VIEWER:     { bg: "rgba(148,163,184,.14)", color: "#94a3b8" },
  USER:       { bg: "rgba(34,197,94,.16)",  color: "#86efac" },
};

function roleStyle(role: string) {
  return ROLE_COLORS[role] || ROLE_COLORS["USER"];
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function avatarColor(name: string) {
  const colors = ["#8b5cf6","#4f7cff","#22c55e","#f59e0b","#ec4899","#06b6d4"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("USER");
  const [inviting, setInviting]       = useState(false);

  // Edit modal
  const [editUser, setEditUser]     = useState<AdminUser | null>(null);
  const [editName, setEditName]     = useState("");
  const [editRole, setEditRole]     = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving]         = useState(false);

  // Toast
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok = true) {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 3500);
  }

  function adminHeaders() {
    const u = getCurrentUser();
    const h: Record<string, string> = {};
    if (u?.role) h["x-user-role"] = u.role;
    if (u?.id) h["x-user-id"] = u.id;
    if (u?.companyId) h["x-company-id"] = u.companyId;
    return h;
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users/all", {
        credentials: "include",
        headers: adminHeaders(),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to load users");
      setUsers(data.rows || []);
      setStats(data.stats || null);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to load users", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const r = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ email: inviteEmail.trim(), inviteRole }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to send invite");
      showToast("Invite sent successfully");
      setInviteEmail("");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to send invite", false);
    } finally {
      setInviting(false);
    }
  }

  function openEdit(user: AdminUser) {
    setEditUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditActive(user.active);
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ name: editName, role: editRole, active: editActive }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed to update user");
      showToast("User updated successfully");
      setEditUser(null);
      await loadUsers();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to update", false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!r.ok) throw new Error();
      showToast(`User ${user.active ? "suspended" : "activated"}`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
    } catch {
      showToast("Failed to update user status", false);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter === "ACTIVE" && !u.active) return false;
    if (statusFilter === "INACTIVE" && u.active) return false;
    return true;
  });

  const statCards = [
    { label: "Total Users",    value: stats?.totalUsers   ?? "—", tone: "purple", icon: "users" },
    { label: "Active",         value: stats?.activeUsers  ?? "—", tone: "green",  icon: "check" },
    { label: "Inactive",       value: stats?.inactiveUsers ?? "—", tone: "orange", icon: "ban"  },
    { label: "Admins",         value: stats?.adminCount   ?? "—", tone: "blue",   icon: "shield"},
  ];

  return (
    <div className="users-page">
      <style>{styles}</style>

      {/* Toast */}
      {toast ? (
        <div className={`users-toast ${toast.ok ? "users-toast--ok" : "users-toast--err"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      ) : null}

      {/* Header */}
      <div className="users-header">
        <div>
          <h1>Users</h1>
          <p>Manage all platform users, roles, and access.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="users-stats">
        {statCards.map((c) => (
          <div key={c.label} className={`users-stat tone-${c.tone}`}>
            <div className="users-stat-icon"><StatIcon name={c.icon} /></div>
            <div>
              <div className="users-stat-val">{loading ? "—" : c.value}</div>
              <div className="users-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite bar */}
      <div className="users-card users-invite">
        <div className="users-invite-label">Invite User</div>
        <div className="users-invite-row">
          <input
            className="users-input users-invite-email"
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendInvite()}
          />
          <select className="users-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="users-btn-primary" onClick={sendInvite} disabled={inviting}>
            {inviting ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="users-card users-filters">
        <input
          className="users-input users-search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="users-filter-pills">
          {["ALL", ...ROLES].map((r) => (
            <button
              key={r}
              className={`users-pill ${roleFilter === r ? "users-pill--active" : ""}`}
              onClick={() => setRoleFilter(r)}
            >{r}</button>
          ))}
        </div>
        <div className="users-filter-pills">
          {["ALL", "ACTIVE", "INACTIVE"].map((s) => (
            <button
              key={s}
              className={`users-pill ${statusFilter === s ? "users-pill--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="users-card">
        <div className="users-table-wrap">
          {loading ? (
            <div className="users-empty">Loading users…</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>2FA</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="users-empty-cell">
                      {search || roleFilter !== "ALL" || statusFilter !== "ALL"
                        ? "No users match your filters."
                        : "No users found."}
                    </td>
                  </tr>
                ) : filtered.map((u) => {
                  const rs = roleStyle(u.role);
                  const av = avatarColor(u.name);
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="users-user-cell">
                          <div className="users-avatar" style={{ background: av }}>
                            {initials(u.name)}
                          </div>
                          <span className="users-name">{u.name}</span>
                        </div>
                      </td>
                      <td className="users-email">{u.email}</td>
                      <td>
                        <span className="users-role-badge" style={{ background: rs.bg, color: rs.color }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="users-company">
                        {u.companyName ? (
                          <div className="users-company-cell">
                            <span>{u.companyName}</span>
                            {u.companyPlan ? <span className="users-plan">{u.companyPlan}</span> : null}
                          </div>
                        ) : <span className="users-muted">—</span>}
                      </td>
                      <td>
                        <span className={`users-2fa ${u.twoFactorEnabled ? "users-2fa--on" : ""}`}>
                          {u.twoFactorEnabled ? "ON" : "OFF"}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`users-status-toggle ${u.active ? "users-status-toggle--active" : "users-status-toggle--inactive"}`}
                          onClick={() => toggleActive(u)}
                          title={u.active ? "Click to suspend" : "Click to activate"}
                        >
                          <span className="users-status-dot" />
                          {u.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="users-date">{formatDate(u.createdAt)}</td>
                      <td>
                        <button className="users-edit-btn" onClick={() => openEdit(u)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length > 0 ? (
          <div className="users-count">{filtered.length} of {users.length} users</div>
        ) : null}
      </div>

      {/* Edit Modal */}
      {editUser ? (
        <div className="users-overlay" onClick={() => setEditUser(null)}>
          <div className="users-modal" onClick={(e) => e.stopPropagation()}>
            <div className="users-modal-head">
              <h2>Edit User</h2>
              <button className="users-modal-close" onClick={() => setEditUser(null)}>✕</button>
            </div>

            <div className="users-modal-avatar-row">
              <div className="users-avatar users-avatar--lg" style={{ background: avatarColor(editUser.name) }}>
                {initials(editUser.name)}
              </div>
              <div>
                <div className="users-name">{editUser.name}</div>
                <div className="users-muted">{editUser.email}</div>
              </div>
            </div>

            <div className="users-form-grid">
              <div className="users-field">
                <label>Full Name</label>
                <input
                  className="users-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="users-field">
                <label>Role</label>
                <select className="users-select" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="users-field">
              <label>Account Status</label>
              <div className="users-toggle-row">
                <button
                  className={`users-toggle-btn ${editActive ? "users-toggle-btn--on" : ""}`}
                  onClick={() => setEditActive(true)}
                >Active</button>
                <button
                  className={`users-toggle-btn ${!editActive ? "users-toggle-btn--off" : ""}`}
                  onClick={() => setEditActive(false)}
                >Suspended</button>
              </div>
            </div>

            {editUser.companyName ? (
              <div className="users-field">
                <label>Company</label>
                <div className="users-company-cell" style={{ marginTop: 4 }}>
                  <span style={{ color: "var(--text)" }}>{editUser.companyName}</span>
                  {editUser.companyPlan ? <span className="users-plan">{editUser.companyPlan}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="users-modal-footer">
              <button className="users-btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="users-btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  if (name === "users") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === "check") return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  if (name === "ban")   return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

const styles = `
.users-page{
  display:grid;gap:16px;
  font-family:'Outfit','DM Sans',sans-serif;
  position:relative;
  width:100%;max-width:100%;overflow-x:hidden;
}
.users-header{margin-bottom:4px;}
.users-header h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.05em;color:var(--text);}
.users-header p{margin:6px 0 0;color:var(--text-soft);font-size:14px;}

/* Stats */
.users-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.users-stat{
  display:flex;align-items:center;gap:14px;
  padding:16px 18px;border-radius:20px;
  border:1px solid var(--border);
  background:var(--panel);
  box-shadow:var(--card-shadow,0 4px 20px rgba(0,0,0,.18));
}
.users-stat-icon{
  width:42px;height:42px;border-radius:13px;
  display:grid;place-items:center;flex-shrink:0;
}
.tone-purple .users-stat-icon{background:rgba(139,92,246,.2);color:#c4b5fd;}
.tone-green  .users-stat-icon{background:rgba(34,197,94,.18);color:#86efac;}
.tone-orange .users-stat-icon{background:rgba(251,146,60,.18);color:#fdba74;}
.tone-blue   .users-stat-icon{background:rgba(79,124,255,.2);color:#93c5fd;}
.users-stat-val{font-size:30px;font-weight:800;letter-spacing:-.04em;color:var(--text);line-height:1;}
.users-stat-label{font-size:12px;color:var(--text-soft);margin-top:3px;}

/* Card */
.users-card{
  border-radius:20px;border:1px solid var(--border);
  background:var(--panel);
  box-shadow:var(--card-shadow,0 4px 20px rgba(0,0,0,.18));
  padding:18px 20px;
}

/* Invite */
.users-invite-label{font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;}
.users-invite-row{display:flex;gap:10px;flex-wrap:wrap;}
.users-invite-email{flex:1;min-width:220px;}

/* Filters */
.users-filters{display:flex;flex-wrap:wrap;align-items:center;gap:12px;}
.users-search{flex:1;min-width:220px;}
.users-filter-pills{display:flex;gap:6px;flex-wrap:wrap;}
.users-pill{
  padding:5px 12px;border-radius:999px;border:1px solid var(--border);
  background:transparent;color:var(--text-soft);font-size:12px;font-weight:600;
  cursor:pointer;transition:all .14s ease;white-space:nowrap;
}
.users-pill--active{
  background:rgba(139,92,246,.22);border-color:rgba(139,92,246,.45);color:#c4b5fd;
}
.users-pill:hover:not(.users-pill--active){background:var(--bg-soft);}

/* Input / Select */
.users-input,.users-select{
  padding:10px 14px;border-radius:12px;
  border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.04));
  color:var(--text);font-size:13px;font-family:inherit;outline:none;
  transition:border-color .15s ease;
}
.users-input:focus,.users-select:focus{border-color:rgba(139,92,246,.6);}
.users-select{cursor:pointer;}

/* Buttons */
.users-btn-primary{
  padding:10px 20px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#8b5cf6,#6d41e8);
  color:#fff;font-size:13px;font-weight:700;font-family:inherit;
  cursor:pointer;transition:opacity .14s ease;white-space:nowrap;
}
.users-btn-primary:hover{opacity:.88;}
.users-btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.users-btn-ghost{
  padding:10px 20px;border-radius:12px;
  border:1px solid var(--border);background:transparent;
  color:var(--text-soft);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;
}
.users-btn-ghost:hover{background:var(--bg-soft);}

/* Table */
.users-table-wrap{overflow-x:auto;}
.users-table{width:100%;border-collapse:collapse;}
.users-table th{
  text-align:left;padding:10px 12px 10px 0;
  border-bottom:1px solid var(--border);
  color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em;
  white-space:nowrap;
}
.users-table td{
  text-align:left;padding:13px 12px 13px 0;
  border-bottom:1px solid var(--border);
  color:var(--text-soft);font-size:13px;vertical-align:middle;
}
.users-table tbody tr:last-child td{border-bottom:none;}
.users-table tbody tr:hover{background:var(--bg-soft,rgba(255,255,255,.02));}

.users-user-cell{display:flex;align-items:center;gap:10px;}
.users-avatar{
  width:34px;height:34px;border-radius:50%;
  display:grid;place-items:center;
  font-size:12px;font-weight:800;color:#fff;flex-shrink:0;
}
.users-avatar--lg{width:46px;height:46px;font-size:16px;}
.users-name{font-weight:700;color:var(--text);white-space:nowrap;}
.users-email{color:var(--text-muted);font-size:12px;}
.users-muted{color:var(--text-muted);font-size:12px;}
.users-date{color:var(--text-muted);font-size:12px;white-space:nowrap;}

.users-role-badge{
  display:inline-flex;padding:4px 10px;border-radius:999px;
  font-size:11px;font-weight:700;white-space:nowrap;
}
.users-company-cell{display:flex;align-items:center;gap:8px;}
.users-plan{
  font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;
  background:rgba(139,92,246,.18);color:#c4b5fd;
}
.users-2fa{
  font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;
  background:rgba(148,163,184,.12);color:var(--text-muted);
}
.users-2fa--on{background:rgba(34,197,94,.16);color:#86efac;}

.users-status-toggle{
  display:inline-flex;align-items:center;gap:6px;
  padding:5px 11px;border-radius:999px;border:none;
  font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;
  transition:all .14s ease;
}
.users-status-toggle--active{background:rgba(34,197,94,.16);color:#86efac;}
.users-status-toggle--inactive{background:rgba(148,163,184,.12);color:var(--text-muted);}
.users-status-toggle:hover{filter:brightness(1.12);}
.users-status-dot{
  width:7px;height:7px;border-radius:50%;flex-shrink:0;
}
.users-status-toggle--active .users-status-dot{background:#4ad37a;}
.users-status-toggle--inactive .users-status-dot{background:#64748b;}

.users-edit-btn{
  padding:6px 14px;border-radius:10px;border:1px solid var(--border);
  background:transparent;color:var(--text-soft);font-size:12px;font-weight:700;
  cursor:pointer;font-family:inherit;transition:all .14s ease;
}
.users-edit-btn:hover{background:var(--bg-soft);border-color:rgba(139,92,246,.4);color:#c4b5fd;}

.users-empty{padding:48px;text-align:center;color:var(--text-muted);}
.users-empty-cell{text-align:center;padding:48px 0!important;color:var(--text-muted);border-bottom:none!important;}
.users-count{margin-top:14px;font-size:12px;color:var(--text-muted);}

/* Modal */
.users-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.52);backdrop-filter:blur(4px);
  display:grid;place-items:center;z-index:9999;padding:20px;
}
.users-modal{
  width:100%;max-width:480px;border-radius:24px;
  border:1px solid var(--border);
  background:var(--panel);
  box-shadow:0 32px 80px rgba(0,0,0,.4);
  padding:24px;
}
.users-modal-head{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:20px;
}
.users-modal-head h2{margin:0;font-size:20px;font-weight:800;color:var(--text);}
.users-modal-close{
  border:none;background:var(--bg-soft,rgba(255,255,255,.06));
  color:var(--text-muted);width:32px;height:32px;border-radius:50%;
  cursor:pointer;font-size:14px;display:grid;place-items:center;
}
.users-modal-close:hover{background:rgba(255,255,255,.1);color:var(--text);}
.users-modal-avatar-row{
  display:flex;align-items:center;gap:14px;
  padding:14px;border-radius:14px;
  background:var(--bg-soft,rgba(255,255,255,.04));
  border:1px solid var(--border);margin-bottom:18px;
}
.users-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
.users-field{display:flex;flex-direction:column;gap:7px;margin-bottom:14px;}
.users-field label{font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;}
.users-field .users-input,.users-field .users-select{width:100%;box-sizing:border-box;}
.users-toggle-row{display:flex;gap:8px;}
.users-toggle-btn{
  flex:1;padding:9px 14px;border-radius:12px;
  border:1px solid var(--border);background:transparent;
  color:var(--text-muted);font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;
  transition:all .14s ease;
}
.users-toggle-btn--on{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.35);color:#86efac;}
.users-toggle-btn--off{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.3);color:#fca5a5;}
.users-modal-footer{
  display:flex;justify-content:flex-end;gap:10px;
  margin-top:22px;padding-top:18px;border-top:1px solid var(--border);
}

/* Toast */
.users-toast{
  position:fixed;top:24px;right:24px;z-index:99999;
  padding:13px 20px;border-radius:14px;font-size:13px;font-weight:700;
  box-shadow:0 8px 32px rgba(0,0,0,.3);
  animation:toastIn .22s ease;
}
.users-toast--ok{background:#052e16;border:1px solid #16a34a;color:#86efac;}
.users-toast--err{background:#2d0a0a;border:1px solid #dc2626;color:#fca5a5;}
@keyframes toastIn{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}

/* Responsive */
@media(max-width:1024px){
  .users-stats{grid-template-columns:repeat(2,1fr);}
  .users-form-grid{grid-template-columns:1fr;}
}
@media(max-width:767px){
  .users-stats{grid-template-columns:1fr 1fr;gap:10px;}
  .users-stat{padding:12px 14px;gap:10px;}
  .users-stat-icon{width:36px;height:36px;border-radius:11px;}
  .users-stat-val{font-size:24px;}
  .users-invite-row{flex-direction:column;}
  .users-invite-email{min-width:unset;}
  .users-filters{flex-direction:column;align-items:stretch;}
  .users-search{min-width:unset;}
  .users-table th:nth-child(4),
  .users-table td:nth-child(4),
  .users-table th:nth-child(5),
  .users-table td:nth-child(5),
  .users-table th:nth-child(7),
  .users-table td:nth-child(7){display:none;}
  .users-modal{padding:18px;}
  .users-modal-head h2{font-size:17px;}
}
`;
