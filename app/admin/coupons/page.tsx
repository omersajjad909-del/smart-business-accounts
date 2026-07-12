"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  applicableTo?: string | null;
  active: boolean;
  allowedEmails?: string | null;
  allowedCompanyIds?: string | null;
  allowedBusinessTypes?: string | null;
  allowedCountries?: string | null;
  createdAt: string;
  _count?: { redemptions: number };
};

const TYPES = ["PERCENT", "FIXED", "FREE_MONTHS"];

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState("PERCENT");
  const [value, setValue] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [applicableTo, setApplicableTo] = useState("all");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [allowedCompanyIds, setAllowedCompanyIds] = useState("");
  const [allowedBusinessTypes, setAllowedBusinessTypes] = useState("");
  const [allowedCountries, setAllowedCountries] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/coupons", { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.coupons) ? d.coupons : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createCoupon() {
    if (!code || value === undefined) {
      toast.error("Code and value required");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          code, type, value: Number(value),
          maxUses: maxUses ? Number(maxUses) : undefined,
          expiresAt: expiresAt || undefined,
          applicableTo, active: true,
          allowedEmails, allowedCompanyIds, allowedBusinessTypes, allowedCountries,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Create failed");
      toast.success("Coupon created");
      setCode(""); setValue(10); setMaxUses(""); setExpiresAt("");
      setAllowedEmails(""); setAllowedCompanyIds(""); setAllowedBusinessTypes(""); setAllowedCountries("");
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      const r = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ id, active: !active }),
      });
      if (!r.ok) throw new Error("Toggle failed");
      toast.success(active ? "Coupon disabled" : "Coupon enabled");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toggle failed");
    }
  }

  async function deleteCoupon(id: string, codeStr: string) {
    if (!confirm(`Delete coupon "${codeStr}"?`)) return;
    try {
      const r = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error("Delete failed");
      toast.success("Coupon deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const active = items.filter(c => c.active).length;
  const totalRedeems = items.reduce((s, c) => s + (c._count?.redemptions || 0), 0);

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Coupons</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>Manage discount codes and targeted promotions.</p>
        </div>
        <button className="cp-btn" onClick={() => setShowForm(!showForm)} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
          {showForm ? "Close" : "+ New Coupon"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Coupons", val: items.length, color: "#818cf8" },
          { label: "Active",        val: active,       color: "#34d399" },
          { label: "Redemptions",   val: totalRedeems, color: "#f472b6" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 22, marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>New Coupon</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>Code *</label>
              <input className="cp-inp" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SUMMER50" />
            </div>
            <div>
              <label style={label}>Type</label>
              <select className="cp-inp" value={type} onChange={e => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Value *</label>
              <input className="cp-inp" type="number" value={value} onChange={e => setValue(Number(e.target.value))} />
            </div>
            <div>
              <label style={label}>Max Uses</label>
              <input className="cp-inp" type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <label style={label}>Expires On</label>
              <DateInput value={expiresAt} onChange={setExpiresAt} style={inp as React.CSSProperties} />
            </div>
            <div>
              <label style={label}>Applicable Plan</label>
              <input className="cp-inp" value={applicableTo} onChange={e => setApplicableTo(e.target.value)} placeholder="all / starter / pro" />
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div>
              <label style={label}>Allowed Emails (comma)</label>
              <input className="cp-inp" value={allowedEmails} onChange={e => setAllowedEmails(e.target.value)} placeholder="a@x.com, b@y.com" />
            </div>
            <div>
              <label style={label}>Allowed Company IDs</label>
              <input className="cp-inp" value={allowedCompanyIds} onChange={e => setAllowedCompanyIds(e.target.value)} />
            </div>
            <div>
              <label style={label}>Allowed Business Types</label>
              <input className="cp-inp" value={allowedBusinessTypes} onChange={e => setAllowedBusinessTypes(e.target.value)} placeholder="retail, pharmacy" />
            </div>
            <div>
              <label style={label}>Allowed Countries (ISO)</label>
              <input className="cp-inp" value={allowedCountries} onChange={e => setAllowedCountries(e.target.value)} placeholder="PK, AE, SA" />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="cp-btn" onClick={createCoupon} disabled={creating}
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white" }}>
              {creating ? "Creating…" : "Create Coupon"}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Code","Type","Value","Redemptions","Max","Expires","Status","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={empty}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={empty}>No coupons yet</td></tr>
            ) : items.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ ...td, fontFamily: "monospace", fontWeight: 700 }}>{c.code}</td>
                <td style={td}>{c.type}</td>
                <td style={td}>{c.type === "PERCENT" ? `${c.value}%` : c.value}</td>
                <td style={td}>{c._count?.redemptions ?? 0}</td>
                <td style={td}>{c.maxUses ?? "∞"}</td>
                <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                  {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-GB") : "—"}
                </td>
                <td style={td}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: c.active ? "rgba(52,211,153,.15)" : "rgba(148,163,184,.15)",
                    color: c.active ? "#34d399" : "#94a3b8" }}>
                    {c.active ? "ACTIVE" : "DISABLED"}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="cp-btn-sm" onClick={() => toggleActive(c.id, c.active)}
                      style={{ background: c.active ? "rgba(148,163,184,.15)" : "rgba(52,211,153,.15)", color: c.active ? "#94a3b8" : "#34d399" }}>
                      {c.active ? "Disable" : "Enable"}
                    </button>
                    <button className="cp-btn-sm" onClick={() => deleteCoupon(c.id, c.code)}
                      style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
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
const inp = { background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 12px", color: "white", fontFamily: "inherit", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" };

const css = `
  .cp-inp { width:100%; background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:10px 12px; color:white; font-family:inherit; font-size:13px; outline:none; box-sizing:border-box; }
  .cp-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .cp-btn:disabled { opacity:.4; cursor:not-allowed; }
  .cp-btn:hover:not(:disabled) { opacity:.85; }
  .cp-btn-sm { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .cp-btn-sm:hover { opacity:.75; }
`;
