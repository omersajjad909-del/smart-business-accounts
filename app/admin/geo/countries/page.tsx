"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

type Row = {
  country: string;
  countryName: string;
  companies: number;
  activeUsers30d: number;
};

function authHeaders(): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function AdminGeoCountriesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/geo/countries", { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(d => { if (!cancelled) setRows(Array.isArray(d?.rows) ? d.rows : []); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => search.trim()
    ? rows.filter(r => r.countryName.toLowerCase().includes(search.trim().toLowerCase()) || r.country.toLowerCase().includes(search.trim().toLowerCase()))
    : rows,
  [rows, search]);

  const totals = useMemo(() => ({
    countries: rows.length,
    companies: rows.reduce((s, r) => s + r.companies, 0),
    users:     rows.reduce((s, r) => s + r.activeUsers30d, 0),
  }), [rows]);

  const maxCompanies = Math.max(...rows.map(r => r.companies), 1);
  const maxUsers = Math.max(...rows.map(r => r.activeUsers30d), 1);

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", padding: "0 0 60px" }}>
      <style>{css}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Countries</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Company distribution and active users by country (last 30 days).
          </p>
        </div>
        <Link href="/admin/geo" style={{ textDecoration: "none" }}>
          <button className="gc-btn" style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.7)" }}>
            ← Back to Geo Map
          </button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Countries",            val: totals.countries, color: "#818cf8" },
          { label: "Total Companies",      val: totals.companies, color: "#34d399" },
          { label: "Active Users (30d)",   val: totals.users,     color: "#f472b6" },
        ].map(k => (
          <div key={k.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "20px 22px" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 4, fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input className="gc-inp" placeholder="Search country…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              {["#","Country","Code","Companies","Active Users (30d)"].map(h => (
                <th key={h} style={th}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={empty}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={empty}>No countries with data yet</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.country} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ ...td, color: "rgba(255,255,255,.4)", width: 40 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.countryName}</td>
                <td style={{ ...td, fontFamily: "monospace", color: "rgba(255,255,255,.5)", fontSize: 12 }}>{r.country}</td>
                <td style={{ ...td, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.07)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(r.companies / maxCompanies) * 100}%`, height: "100%", background: "#34d399", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{r.companies}</span>
                  </div>
                </td>
                <td style={{ ...td, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.07)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${(r.activeUsers30d / maxUsers) * 100}%`, height: "100%", background: "#f472b6", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{r.activeUsers30d}</span>
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

const css = `
  .gc-inp { background:rgba(255,255,255,.04); border:1.5px solid rgba(255,255,255,.1); border-radius:10px; padding:8px 14px; color:white; font-family:inherit; font-size:13px; outline:none; min-width:280px; }
  .gc-btn { border:none; border-radius:10px; padding:9px 20px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:opacity .2s; }
  .gc-btn:hover { opacity:.85; }
`;
