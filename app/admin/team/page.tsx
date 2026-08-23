"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV_GROUP_ORDER, ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";
import { SUPER_ADMIN_ONLY_PAGES, normalizeAllowedPages } from "@/lib/adminPages";
import toast from "react-hot-toast";

/**
 * Pages a team member can be granted. Super-admin-only pages are left out —
 * ticking them would do nothing, because the API refuses them to anyone who is
 * not a super admin whatever this list says.
 */
const GRANTABLE_PAGES = ADMIN_NAV_ITEMS.filter((i) => !SUPER_ADMIN_ONLY_PAGES.has(i.id));

function parsePages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeAllowedPages(parsed.map(String)) : [];
  } catch {
    return [];
  }
}

type Member = {
  id: string;
  name: string;
  email: string;
  team?: string | null;
  allowedPages?: string | null;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  isSuperAdmin?: boolean;
  // "platform" = a User-table row with role=ADMIN (the original super admin
  // login path) rather than an AdminUser team member — can't be disabled or
  // removed from this page, only viewed, since PATCH/DELETE only touch AdminUser.
  source?: "team" | "platform";
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminTeamPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [team, setTeam] = useState("");
  const [newPages, setNewPages] = useState<string[]>(["dashboard"]);

  // Which member row has its page list open, and the working copy being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPages, setEditPages] = useState<string[]>([]);
  const [savingPages, setSavingPages] = useState(false);

  const grouped = useMemo(
    () => ADMIN_NAV_GROUP_ORDER
      .map((group) => ({ group, items: GRANTABLE_PAGES.filter((i) => i.group === group) }))
      .filter((g) => g.items.length > 0),
    [],
  );

  function openPages(m: Member) {
    if (editingId === m.id) { setEditingId(null); return; }
    setEditingId(m.id);
    setEditPages(parsePages(m.allowedPages));
  }

  async function savePages(m: Member) {
    setSavingPages(true);
    try {
      const r = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id: m.id, allowedPages: editPages }),
      });
      if (!r.ok) throw new Error("Update failed");
      toast.success("Page access updated");
      setEditingId(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingPages(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/team", { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.members) ? d.members : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createMember() {
    if (!name || !email || !password) {
      toast.error("Name, email, and password required");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/team", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name, email, password, team, allowedPages: newPages }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Create failed");
      toast.success("Team member added");
      setName(""); setEmail(""); setPassword(""); setTeam(""); setNewPages(["dashboard"]);
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(m: Member) {
    if (m.source === "platform") {
      toast.error("Platform admins can't be disabled from here");
      return;
    }
    try {
      const r = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id: m.id, active: !m.active }),
      });
      if (!r.ok) throw new Error("Update failed");
      toast.success(m.active ? "Member disabled" : "Member enabled");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function removeMember(m: Member) {
    if (m.isSuperAdmin) {
      toast.error("Cannot delete a super admin");
      return;
    }
    if (!confirm(`Remove ${m.name} from the team?`)) return;
    try {
      const r = await fetch(`/api/admin/team?id=${m.id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error("Delete failed");
      toast.success("Member removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  function PagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
    const toggle = (id: string) =>
      onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" className="tm-btn-sm" style={pickBtn}
            onClick={() => onChange(GRANTABLE_PAGES.map((i) => i.id))}>Select all</button>
          <button type="button" className="tm-btn-sm" style={pickBtn}
            onClick={() => onChange([])}>Clear</button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", alignSelf: "center" }}>
            {value.length} of {GRANTABLE_PAGES.length} selected
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {grouped.map(({ group, items: gItems }) => (
            <div key={group}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", color: "rgba(255,255,255,.3)", marginBottom: 6 }}>
                {group.toUpperCase()}
              </div>
              {gItems.map((item) => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={value.includes(item.id)} onChange={() => toggle(item.id)} />
                  <span style={{ color: value.includes(item.id) ? "white" : "rgba(255,255,255,.5)" }}>{item.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "rgba(255,255,255,.3)" }}>
          Team, API Keys, Backup &amp; Restore and Dev Test are super-admin only and cannot be granted here.
        </p>
      </div>
    );
  }

  const filtered = search.trim()
    ? items.filter(m => (m.name || "").toLowerCase().includes(search.trim().toLowerCase()) || m.email.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Admin Team</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Every admin account lives here — team members and platform admins alike.
            Platform admins are view-only; they're never listed under Companies or Users,
            and can't be deleted or disabled from anywhere in the admin panel.
          </p>
        </div>
        <button className="tm-btn" onClick={() => setShowForm(!showForm)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
          {showForm ? "Close" : "+ Add Member"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Members", val: items.length,                       color: "#818cf8" },
          { label: "Active",        val: items.filter(m => m.active).length, color: "#34d399" },
          { label: "Super Admins",  val: items.filter(m => m.isSuperAdmin).length, color: "#f472b6" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 22, marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>New Team Member</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>Full Name *</label>
              <input className="tm-inp" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={label}>Email *</label>
              <input className="tm-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={label}>Password *</label>
              <input className="tm-inp" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label style={label}>Team (optional)</label>
              <input className="tm-inp" value={team} onChange={e => setTeam(e.target.value)} placeholder="Support, Ops, Growth…" />
            </div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <label style={{ ...label, marginBottom: 10 }}>Pages this member can open</label>
            <PagePicker value={newPages} onChange={setNewPages} />
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="tm-btn" onClick={createMember} disabled={creating}
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
              {creating ? "Creating…" : "Create Member"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input className="tm-inp" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 280 }} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflowX: "auto", overflowY: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Name","Email","Team","Pages","Status","Last Login","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={empty}>No team members yet</td></tr>
            ) : filtered.flatMap(m => [
              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ ...td, fontWeight: 700 }}>
                  {m.name}
                  {m.isSuperAdmin && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(244,114,182,.15)", color: "#f472b6" }}>SUPER</span>}
                </td>
                <td style={{ ...td, color: "rgba(255,255,255,.6)" }}>{m.email}</td>
                <td style={td}>{m.team || "—"}</td>
                <td style={td}>
                  {m.isSuperAdmin ? (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>All pages</span>
                  ) : (
                    <button className="tm-btn-sm" onClick={() => openPages(m)} style={pickBtn}>
                      {parsePages(m.allowedPages).length} pages
                    </button>
                  )}
                </td>
                <td style={td}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: m.active ? "rgba(52,211,153,.15)" : "rgba(148,163,184,.15)",
                    color: m.active ? "#34d399" : "#94a3b8" }}>
                    {m.active ? "ACTIVE" : "DISABLED"}
                  </span>
                </td>
                <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                  {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString("en-GB") : "Never"}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {m.source === "platform" ? (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontStyle: "italic" }}>View only</span>
                    ) : (
                      <button className="tm-btn-sm" onClick={() => toggleActive(m)}
                        style={{ background: m.active ? "rgba(148,163,184,.15)" : "rgba(52,211,153,.15)", color: m.active ? "#94a3b8" : "#34d399" }}>
                        {m.active ? "Disable" : "Enable"}
                      </button>
                    )}
                    {!m.isSuperAdmin && (
                      <button className="tm-btn-sm" onClick={() => removeMember(m)}
                        style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>Remove</button>
                    )}
                  </div>
                </td>
              </tr>,
              editingId === m.id ? (
                <tr key={m.id + "-pages"} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: "rgba(255,255,255,.02)" }}>
                  <td colSpan={7} style={{ padding: "18px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                      Page access — {m.name}
                    </div>
                    <PagePicker value={editPages} onChange={setEditPages} />
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                      <button className="tm-btn" onClick={() => savePages(m)} disabled={savingPages}
                        style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
                        {savingPages ? "Saving…" : "Save access"}
                      </button>
                      <button className="tm-btn" onClick={() => setEditingId(null)}
                        style={{ background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.6)" }}>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null,
            ])}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".07em" };
const td: React.CSSProperties = { padding: "13px 16px", fontSize: 13 };
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", display: "block", marginBottom: 6 };
const pickBtn: React.CSSProperties = { background: "rgba(129,140,248,.15)", color: "#a5b4fc" };

const css = `
  .tm-inp { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:10px 12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
  .tm-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .tm-btn:disabled { opacity:.4; cursor:not-allowed; }
  .tm-btn:hover:not(:disabled) { opacity:.85; }
  .tm-btn-sm { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .tm-btn-sm:hover { opacity:.75; }
`;
