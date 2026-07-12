"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type ApiKey = {
  id: string;
  companyName: string;
  keyPreview: string;
  key: string;
  status: string;
  lastUsed?: string | null;
  createdAt: string;
  revokedAt?: string | null;
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminApiKeysPage() {
  const [items, setItems] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/api-keys", { headers: authHeaders() });
      const d = await r.json();
      setItems(Array.isArray(d.keys) ? d.keys : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    if (!confirm("Revoke this API key? The client using it will lose access immediately.")) return;
    try {
      const r = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "REVOKE", id }),
      });
      if (!r.ok) throw new Error("Revoke failed");
      toast.success("API key revoked");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    }
  }

  const filtered = search.trim()
    ? items.filter(k => k.companyName.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  const active = items.filter(k => k.status === "active").length;
  const revoked = items.filter(k => k.status === "revoked").length;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>API Keys</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Manage all API keys issued to companies. Revoke immediately when compromised.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total Keys", val: items.length,       color: "#818cf8" },
          { label: "Active",     val: active,             color: "#34d399" },
          { label: "Revoked",    val: revoked,            color: "#f87171" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input className="ak-inp" placeholder="Search company…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["Company","Key","Status","Last Used","Created","Actions"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={empty}>No API keys found</td></tr>
            ) : filtered.map(k => (
              <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ ...td, fontWeight: 700 }}>{k.companyName}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                  <span style={{ userSelect: "all" }}>{revealed[k.id] ? k.key : k.keyPreview}</span>
                  <button className="ak-link" onClick={() => setRevealed(r => ({ ...r, [k.id]: !r[k.id] }))} style={{ marginLeft: 8 }}>
                    {revealed[k.id] ? "hide" : "show"}
                  </button>
                </td>
                <td style={td}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: k.status === "active" ? "rgba(52,211,153,.15)" : "rgba(248,113,113,.15)",
                    color: k.status === "active" ? "#34d399" : "#f87171" }}>
                    {k.status}
                  </span>
                </td>
                <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                  {k.lastUsed ? new Date(k.lastUsed).toLocaleDateString("en-GB") : "—"}
                </td>
                <td style={{ ...td, color: "rgba(255,255,255,.4)", fontSize: 12 }}>
                  {new Date(k.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td style={td}>
                  {k.status === "active" && (
                    <button className="ak-btn" onClick={() => revoke(k.id)} style={{ background: "rgba(248,113,113,.15)", color: "#f87171" }}>Revoke</button>
                  )}
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

const css = `
  .ak-inp { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; min-width:280px; }
  .ak-btn { border:none; border-radius:6px; padding:5px 12px; font-family:inherit; font-size:11px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .ak-btn:hover { opacity:.75; }
  .ak-link { background:none; border:none; color:#818cf8; cursor:pointer; font-size:11px; font-family:inherit; padding:0; }
  .ak-link:hover { text-decoration:underline; }
`;
