"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { resolvePlanPermissions, PERMISSION_CATEGORIES } from "@/lib/planPermissions";

export default function AdminPermissionsPage() {
  const userSession = getCurrentUser();
  const isAdmin = userSession?.role === "ADMIN";

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [planAllowed, setPlanAllowed] = useState<Set<string> | null>(null);
  const [plan, setPlan] = useState<string>("STARTER");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Load users + plan info
  useEffect(() => {
    if (!isAdmin) { setPageLoading(false); return; }

    Promise.all([
      fetch("/api/users", { headers: { "x-user-role": "ADMIN" } }).then(r => r.json()),
      fetch("/api/me/company").then(r => r.ok ? r.json() : null),
      fetch("/api/public/plan-config").then(r => r.ok ? r.json() : null),
    ]).then(([usersData, companyData, planConfig]) => {
      setUsers(Array.isArray(usersData) ? usersData : []);

      const planCode = String(companyData?.plan || "STARTER").toUpperCase();
      setPlan(planCode);

      const allowed = resolvePlanPermissions({
        plan: planCode,
        configuredPlanPermissions: planConfig?.planPermissions || null,
        activeModules: companyData?.activeModules || null,
      });
      setPlanAllowed(new Set(allowed));
    }).catch(() => {}).finally(() => setPageLoading(false));
  }, [isAdmin]);

  function loadPermissions(user: any) {
    if (user.permissions) {
      setPermissions(user.permissions.map((p: any) => p.permission ?? p));
    } else {
      setPermissions([]);
    }
  }

  function togglePermission(p: string) {
    // Cannot assign permission outside plan
    if (planAllowed && !planAllowed.has(p)) return;
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function save() {
    if (!selectedUser) return toast.error("Please select a user first");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/user-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
        body: JSON.stringify({ userId: selectedUser.id, permissions }),
      });
      if (res.ok) {
        toast.success("Permissions saved ✅");
      } else {
        const err = await res.json();
        toast.error("Error: " + (err.error || "Failed to save"));
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!userSession) return null;
  if (!isAdmin) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ padding:32, borderRadius:16, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
        <div style={{ fontSize:16, fontWeight:700, color:"#f87171" }}>Access Denied</div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginTop:6 }}>Only ADMIN can manage permissions.</div>
      </div>
    </div>
  );

  if (pageLoading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh" }}>
      <div style={{ width:32, height:32, border:"3px solid rgba(99,102,241,0.2)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const card: React.CSSProperties = {
    borderRadius:14, padding:"20px 24px",
    background:"rgba(255,255,255,0.03)",
    border:"1px solid rgba(255,255,255,0.07)",
    marginBottom:16,
  };

  const planAllowedCount = planAllowed ? planAllowed.size : Object.values(PERMISSIONS).length;

  return (
    <div style={{ maxWidth:900, margin:"0 auto", fontFamily:"inherit" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"white", margin:0 }}>User Permissions</h1>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:4 }}>Assign permissions within your plan&apos;s limits</p>
        </div>
        {/* Plan badge */}
        <div style={{ padding:"8px 16px", borderRadius:10, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Active Plan</div>
          <div style={{ fontSize:14, fontWeight:800, color:"#a5b4fc" }}>{plan}</div>
        </div>
      </div>

      {/* Plan info banner */}
      <div style={{ ...card, background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:"rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🛡️</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.8)", marginBottom:3 }}>
            Plan-Restricted Permissions
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
            Your <strong style={{ color:"#a5b4fc" }}>{plan}</strong> plan includes <strong style={{ color:"#a5b4fc" }}>{planAllowedCount} permissions</strong>.
            Locked permissions (🔒) are not available on your current plan — upgrade to unlock them.
          </div>
        </div>
      </div>

      {/* User Selector */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.7)", marginBottom:12 }}>Select User to Manage</div>
        <select
          style={{
            width:"100%", padding:"10px 14px", borderRadius:8,
            background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
            color:"white", fontSize:13, outline:"none",
          }}
          onChange={e => {
            const u = users.find(x => x.id === e.target.value);
            setSelectedUser(u || null);
            if (u) loadPermissions(u);
            else setPermissions([]);
          }}
        >
          <option value="">— Select a user —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.role}) — {u.email}</option>
          ))}
        </select>
      </div>

      {/* Permissions Grid */}
      {selectedUser && (
        <div style={card}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.8)" }}>
                Permissions for: <span style={{ color:"#a5b4fc" }}>{selectedUser.name}</span>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3 }}>
                {permissions.length} assigned · {planAllowedCount} available in plan
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {/* Select all allowed */}
              <button
                type="button"
                onClick={() => setPermissions(planAllowed ? Array.from(planAllowed) : Object.values(PERMISSIONS))}
                style={{ padding:"6px 14px", borderRadius:8, background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.25)", color:"#a5b4fc", fontSize:11, fontWeight:700, cursor:"pointer" }}
              >
                Select All Allowed
              </button>
              <button
                type="button"
                onClick={() => setPermissions([])}
                style={{ padding:"6px 14px", borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)", fontSize:11, fontWeight:700, cursor:"pointer" }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Category groups */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {PERMISSION_CATEGORIES.map(cat => {
              const catPerms = cat.permissions;
              const allowedInCat = catPerms.filter(p => !planAllowed || planAllowed.has(p));
              const lockedInCat = catPerms.filter(p => planAllowed && !planAllowed.has(p));

              return (
                <div key={cat.key}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"rgba(99,102,241,0.7)", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                    {cat.label}
                    {lockedInCat.length > 0 && (
                      <span style={{ padding:"2px 8px", borderRadius:10, background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.25)", fontSize:9 }}>
                        {lockedInCat.length} locked
                      </span>
                    )}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {catPerms.map(p => {
                      const locked = planAllowed ? !planAllowed.has(p) : false;
                      const checked = permissions.includes(p);
                      return (
                        <label
                          key={p}
                          onClick={() => !locked && togglePermission(p)}
                          style={{
                            display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                            borderRadius:8, cursor: locked ? "not-allowed" : "pointer",
                            background: locked ? "rgba(255,255,255,0.01)" : checked ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${locked ? "rgba(255,255,255,0.04)" : checked ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.07)"}`,
                            transition:"all .15s",
                            opacity: locked ? 0.45 : 1,
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width:16, height:16, borderRadius:4, flexShrink:0,
                            border: `2px solid ${locked ? "rgba(255,255,255,0.1)" : checked ? "#6366f1" : "rgba(255,255,255,0.2)"}`,
                            background: checked && !locked ? "#6366f1" : "transparent",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
                            {checked && !locked && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                            {locked && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5">
                                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize:11.5, fontWeight: checked ? 600 : 400, color: locked ? "rgba(255,255,255,0.25)" : checked ? "#c7d2fe" : "rgba(255,255,255,0.55)", lineHeight:1.3 }}>
                            {p}
                          </span>
                          {locked && <span style={{ marginLeft:"auto", fontSize:9, color:"rgba(255,255,255,0.2)", whiteSpace:"nowrap" }}>🔒 Upgrade</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save Button */}
          <button
            onClick={save}
            disabled={loading}
            style={{
              marginTop:24, width:"100%", padding:"13px",
              borderRadius:10, border:"none",
              background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
              color:"white", fontWeight:700, fontSize:14, cursor: loading ? "not-allowed" : "pointer",
              boxShadow:"0 4px 16px rgba(99,102,241,0.3)", transition:"all .2s",
            }}
          >
            {loading ? "Saving…" : "Save Permissions"}
          </button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
