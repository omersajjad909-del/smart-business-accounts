import { confirmToast, alertToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";
"use client";
import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getMaxUsersForPlan } from "@/lib/planLimits";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

type CurrentUser = {
  id: string;
  role: string;
  name?: string;
  email?: string;
  companyId?: string | null;
};

type UserForm = {
  id: string | null;
  name: string;
  email: string;
  password: string;
  role: string;
  active: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser] = useState<CurrentUser | null>(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ACCOUNTANT");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [plan, setPlan] = useState<string>("STARTER");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState<UserForm>({
    id: null, name: "", email: "", password: "", role: "ACCOUNTANT", active: true,
  });
  const [editing, setEditing] = useState(false);

  const [dynamicMaxUsers, setDynamicMaxUsers] = useState<number | null | undefined>(undefined);
  // dynamicMaxUsers: undefined = not loaded yet, null = unlimited, number = limit
  const maxUsers = dynamicMaxUsers !== undefined ? dynamicMaxUsers : getMaxUsersForPlan(plan);
  const atLimit = maxUsers !== null && users.length >= (maxUsers ?? Infinity);

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/users", { headers: { "x-user-role": "ADMIN" } })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (currentUser?.role === "ADMIN") {
      reload();
      Promise.all([
        fetch("/api/me/company").then(r => r.ok ? r.json() : null),
        fetch("/api/public/plan-config").then(r => r.ok ? r.json() : null),
      ]).then(([companyData, planConfig]) => {
        const planCode = String(companyData?.plan || "STARTER").toUpperCase();
        setPlan(planCode);
        // Dynamic limit from admin config Ã¢â‚¬â€ overrides hardcoded
        if (planConfig?.planLimits) {
          const key = planCode.toLowerCase();
          const limit = planConfig.planLimits[key];
          setDynamicMaxUsers(limit === undefined ? null : limit);
        }
      }).catch(() => {});
    } else {
      setLoading(false);
    }
  }, [currentUser, reload]);

  async function save() {
    if (!form.name || !form.email) return toast.error("Please fill required fields");
    setSaveError(null);

    const res = await fetch("/api/users", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setSaveError(j.error || "Failed to save user");
      return;
    }

    reset();
    reload();
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return toast.error("Please enter an email");
    setInviting(true);
    setInviteMsg(null);
    setInviteLink(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (currentUser?.role) headers["x-user-role"] = currentUser.role;
      if (currentUser?.id) headers["x-user-id"] = currentUser.id;
      if (currentUser?.companyId) headers["x-company-id"] = String(currentUser.companyId);

      const r = await fetch("/api/team/invite", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setInviteMsg(j.error || "Failed to send invite");
      } else {
        setInviteLink(j.inviteLink || null);
        if (j.emailSent) setInviteMsg("Invite email sent");
        else setInviteMsg(j.emailError || "Email failed. Use invite link below.");
        setInviteEmail("");
        reload();
      }
    } catch (e: any) {
      setInviteMsg(e.message || "Network error");
    } finally {
      setInviting(false);
    }
  }

  async function remove(id: string) {
    if (!await confirmToast("Are you sure?")) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE", headers: { "x-user-role": "ADMIN" } });
    reload();
  }

  function edit(u: User) { setForm({ ...u, password: "" }); setEditing(true); setSaveError(null); }
  function reset() { setForm({ id: null, name: "", email: "", password: "", role: "ACCOUNTANT", active: true }); setEditing(false); setSaveError(null); }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ width:36, height:36, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!currentUser || currentUser.role !== "ADMIN") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ padding:32, borderRadius:16, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>Ã¢Å¡Â Ã¯Â¸Â</div>
        <div style={{ fontSize:16, fontWeight:700, color:"#f87171" }}>Access Denied</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:6 }}>Only ADMIN can manage users.</div>
      </div>
    </div>
  );

  const card: React.CSSProperties = {
    borderRadius:14, padding:"20px 24px",
    background:"rgba(255,255,255,0.03)",
    border:"1px solid rgba(255,255,255,0.07)",
    marginBottom:16,
  };

  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"10px 14px", borderRadius:8,
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    color:"white", fontSize:13, outline:"none", boxSizing:"border-box",
  };

  const btnPrimary: React.CSSProperties = {
    padding:"10px 20px", borderRadius:8,
    background:"linear-gradient(135deg,#6366f1,#4f46e5)",
    border:"none", color:"white", fontWeight:700, fontSize:13,
    cursor:"pointer", transition:"all .2s",
  };

  const btnGhost: React.CSSProperties = {
    padding:"10px 20px", borderRadius:8,
    background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
    color:"rgba(255,255,255,0.6)", fontWeight:600, fontSize:13,
    cursor:"pointer", transition:"all .2s",
  };

  return (
    <div style={{ maxWidth:900, margin:"0 auto", fontFamily:"inherit" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"white", margin:0, letterSpacing:"-.3px" }}>User Management</h1>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>Manage team members and their access</p>
        </div>
        {/* Plan + User Count Badge */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            padding:"8px 16px", borderRadius:10,
            background: atLimit ? "rgba(248,113,113,0.1)" : "rgba(99,102,241,0.1)",
            border: `1px solid ${atLimit ? "rgba(248,113,113,0.3)" : "rgba(99,102,241,0.25)"}`,
          }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>
              {plan} Plan Ã¢â‚¬â€ Users
            </div>
            <div style={{ fontSize:16, fontWeight:800, color: atLimit ? "#f87171" : "#a5b4fc" }}>
              {users.length} / {maxUsers === null ? "Ã¢Ë†Å¾" : maxUsers}
            </div>
          </div>
        </div>
      </div>

      {/* Limit warning banner */}
      {atLimit && (
        <div style={{ ...card, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:22 }}>Ã°Å¸Å¡Â«</span>
          <div>
            <div style={{ fontWeight:700, color:"#f87171", fontSize:13 }}>User Limit Reached</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:2 }}>
              Your <strong style={{ color:"#a5b4fc" }}>{plan}</strong> plan allows max <strong style={{ color:"#a5b4fc" }}>{maxUsers} users</strong>. Upgrade to add more team members.
            </div>
          </div>
        </div>
      )}

      {/* Invite User */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:14 }}>
          Invite Team Member
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:10, alignItems:"end" }}>
          <input
            placeholder="Email address"
            style={inputStyle}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={atLimit && !editing}
          />
          <select
            style={{ ...inputStyle, width:"auto", paddingRight:28 }}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            disabled={atLimit}
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="SALES">Sales Executive</option>
            <option value="INVENTORY_MANAGER">Inventory Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="AUDITOR">Auditor</option>
            <option value="SECURITY">Security / Gate</option>
            <option value="VIEWER">Viewer (Read Only)</option>
          </select>
          <button
            onClick={sendInvite}
            disabled={inviting || atLimit}
            style={{ ...btnPrimary, opacity: (inviting || atLimit) ? 0.5 : 1, cursor: atLimit ? "not-allowed" : "pointer", whiteSpace:"nowrap" }}
          >
            {inviting ? "SendingÃ¢â‚¬Â¦" : "Send Invite"}
          </button>
        </div>
        {inviteMsg && <div style={{ marginTop:10, fontSize:12, color: inviteMsg.includes("sent") ? "#34d399" : "#f87171" }}>{inviteMsg}</div>}
        {inviteLink && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>Invite Link</div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={inviteLink} readOnly style={{ ...inputStyle, flex:1, fontSize:11 }} />
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ ...btnGhost, fontSize:11, whiteSpace:"nowrap" }}>Copy</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit User Form */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:14 }}>
          {editing ? "Edit User" : "Create New User"}
        </div>

        {/* Error */}
        {saveError && (
          <div style={{ marginBottom:14, padding:"10px 14px", borderRadius:8, background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", fontSize:12, color:"#f87171" }}>
            {saveError}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          <input placeholder="Full Name" style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Email Address" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" placeholder="Password" style={inputStyle} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="SALES">Sales Executive</option>
            <option value="INVENTORY_MANAGER">Inventory Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="AUDITOR">Auditor</option>
            <option value="SECURITY">Security / Gate</option>
            <option value="VIEWER">Viewer (Read Only)</option>
          </select>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button
            onClick={save}
            disabled={atLimit && !editing}
            style={{ ...btnPrimary, opacity: (atLimit && !editing) ? 0.5 : 1, cursor: (atLimit && !editing) ? "not-allowed" : "pointer" }}
            title={atLimit && !editing ? `User limit reached (${maxUsers})` : undefined}
          >
            {editing ? "Update User" : "Add User"}
          </button>
          {editing && <button onClick={reset} style={btnGhost}>Cancel</button>}
        </div>
      </div>

      {/* Users Table */}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              {["Name","Email","Role","Status","Actions"].map((h,i) => (
                <th key={h} style={{ padding:"12px 16px", textAlign: i===4 ? "right" : "left", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} style={{ padding:32, textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.2)" }}>No users found</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{u.name}</td>
                <td style={{ padding:"12px 16px", fontSize:12, color:"rgba(255,255,255,0.45)" }}>{u.email}</td>
                <td style={{ padding:"12px 16px" }}>
                  <span style={{
                    padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                    background: u.role==="ADMIN" ? "rgba(139,92,246,0.15)" : "rgba(99,102,241,0.12)",
                    color: u.role==="ADMIN" ? "#c4b5fd" : "#a5b4fc",
                    border: `1px solid ${u.role==="ADMIN" ? "rgba(139,92,246,0.3)" : "rgba(99,102,241,0.25)"}`,
                  }}>{u.role}</span>
                </td>
                <td style={{ padding:"12px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background: u.active ? "#34d399" : "rgba(255,255,255,0.2)" }}/>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{u.active ? "Active" : "Disabled"}</span>
                  </div>
                </td>
                <td style={{ padding:"12px 16px", textAlign:"right" }}>
                  <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                    <button onClick={() => edit(u)} style={{ ...btnGhost, padding:"5px 12px", fontSize:12 }}>Edit</button>
                    <button onClick={() => remove(u.id)} style={{ padding:"5px 12px", borderRadius:8, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontWeight:600, fontSize:12, cursor:"pointer" }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
