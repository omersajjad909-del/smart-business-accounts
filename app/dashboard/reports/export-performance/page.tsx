"use client";
import { useState, useMemo, useEffect } from "react";
import DateInput from "@/app/dashboard/reports/_components/DateInput";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportRecord {
  id:          string;
  invoiceNo:   string;
  date:        string;
  customer:    string;
  country:     string;
  product:     string;
  hsCode:      string;
  currency:    string;
  amount:      number;
  amountUsd:   number;
  qty:         number;
  unit:        string;
  shipmentRef: string;
  status:      string;
}

interface CountryPerf {
  country:   string;
  revenue:   number;
  orders:    number;
  avgOrder:  number;
  growth:    number;
}

interface CustomerPerf {
  customer:  string;
  country:   string;
  revenue:   number;
  orders:    number;
  lastOrder: string;
}

interface ProductPerf {
  product:   string;
  hsCode:    string;
  revenue:   number;
  qty:       number;
  orders:    number;
}

// ─── Style ────────────────────────────────────────────────────────────────────

const FONT = "'Outfit','Inter',sans-serif";

const s = {
  page:   { fontFamily: FONT, color: "var(--text-primary)", padding: "28px 24px", minHeight: "100vh", background: "var(--app-bg)" },
  panel:  { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 },
  inp:    { background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, boxSizing: "border-box" as const, outline: "none" },
  th:     { padding: "10px 13px", textAlign: "left" as const, fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const, borderBottom: "1px solid var(--border)" },
  td:     { padding: "11px 13px", fontSize: 12, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", verticalAlign: "middle" as const },
  kpi:    { background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" },
  tabBtn: (active: boolean, color = "#10b981") => ({ background: active ? color : "rgba(255,255,255,.06)", border: `1px solid ${active ? color : "var(--border)"}`, borderRadius: 8, padding: "7px 16px", color: active ? "#fff" : "var(--text-muted)", fontFamily: FONT, cursor: "pointer", fontSize: 12, fontWeight: 600 }),
};

const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";

function buildBar(value: number, max: number, color: string) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,.07)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width .4s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 60, textAlign: "right" }}>{fmt(value)}</span>
    </div>
  );
}

// ─── DEMO DATA GENERATOR ──────────────────────────────────────────────────────

const COUNTRIES = ["UAE","Saudi Arabia","UK","USA","Germany","China","Turkey","Egypt","Kenya","Canada"];
const CUSTOMERS = ["Al-Futtaim Trading","Gulf Star LLC","Tesco PLC","Amazon US","Müller GmbH","Alibaba Trading","Istanbul Textiles","Cairo Exports","Nairobi Goods","Maple Imports"];
const PRODUCTS  = ["Cotton Fabric","Rice (Basmati)","Surgical Instruments","Leather Goods","Ceramic Tiles","Sports Goods","Cutlery Set","Marble Slabs","Textile Yarn","Embroidered Fabric"];
const HS_CODES  = ["5208.11","1006.30","9018.39","4202.22","6908.90","9506.91","8215.99","2516.11","5509.21","5810.10"];

function generateDemoData(from: string, to: string): ExportRecord[] {
  const records: ExportRecord[] = [];
  const start = new Date(from || "2024-01-01");
  const end   = new Date(to   || "2024-12-31");
  let id = 1;
  const cur = new Date(start);
  while (cur <= end) {
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const ci = Math.floor(Math.random() * COUNTRIES.length);
      const pi = Math.floor(Math.random() * PRODUCTS.length);
      const qty = Math.floor(Math.random() * 500) + 50;
      const rate = Math.floor(Math.random() * 800) + 100;
      records.push({
        id: String(id++),
        invoiceNo: `EXP-${cur.getFullYear()}-${String(id).padStart(4,"0")}`,
        date: cur.toISOString().split("T")[0],
        customer: CUSTOMERS[ci],
        country: COUNTRIES[ci],
        product: PRODUCTS[pi],
        hsCode: HS_CODES[pi],
        currency: "USD",
        amount: qty * rate,
        amountUsd: qty * rate,
        qty, unit: "PCS",
        shipmentRef: `SHIP-${cur.getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3,"0")}`,
        status: "SHIPPED",
      });
    }
    cur.setDate(cur.getDate() + Math.floor(Math.random() * 5) + 1);
  }
  return records;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExportPerformancePage() {
  const today    = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [from, setFrom]       = useState(yearStart);
  const [to, setTo]           = useState(today);
  const [activeTab, setActiveTab] = useState<"country" | "customer" | "product" | "detail">("country");
  const [countryFilter, setCountryFilter] = useState("ALL");
  const [search, setSearch]   = useState("");
  const [records, setRecords] = useState<ExportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecords(generateDemoData(from, to));
      setLoading(false);
    }, 300);
  }, [from, to]);

  const filtered = useMemo(() => {
    let list = records;
    if (countryFilter !== "ALL") list = list.filter(r => r.country === countryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.customer.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.invoiceNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, countryFilter, search]);

  const kpis = useMemo(() => {
    const total      = filtered.reduce((s, r) => s + r.amountUsd, 0);
    const orders     = filtered.length;
    const countries  = new Set(filtered.map(r => r.country)).size;
    const customers  = new Set(filtered.map(r => r.customer)).size;
    const avgOrder   = orders > 0 ? total / orders : 0;
    return { total, orders, countries, customers, avgOrder };
  }, [filtered]);

  const countryPerf: CountryPerf[] = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    records.forEach(r => {
      const cur = map.get(r.country) ?? { revenue: 0, orders: 0 };
      cur.revenue += r.amountUsd;
      cur.orders  += 1;
      map.set(r.country, cur);
    });

    const prevRecords = generateDemoData(
      new Date(new Date(from).setFullYear(new Date(from).getFullYear() - 1)).toISOString().split("T")[0],
      new Date(new Date(to).setFullYear(new Date(to).getFullYear() - 1)).toISOString().split("T")[0]
    );
    const prevMap = new Map<string, number>();
    prevRecords.forEach(r => prevMap.set(r.country, (prevMap.get(r.country) ?? 0) + r.amountUsd));

    return Array.from(map.entries()).map(([country, v]) => ({
      country, revenue: v.revenue, orders: v.orders, avgOrder: v.revenue / v.orders,
      growth: prevMap.get(country) ? ((v.revenue - (prevMap.get(country) ?? 0)) / (prevMap.get(country) ?? 1)) * 100 : 100,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [records, from, to]);

  const customerPerf: CustomerPerf[] = useMemo(() => {
    const map = new Map<string, { country: string; revenue: number; orders: number; lastOrder: string }>();
    filtered.forEach(r => {
      const cur = map.get(r.customer) ?? { country: r.country, revenue: 0, orders: 0, lastOrder: r.date };
      cur.revenue += r.amountUsd;
      cur.orders  += 1;
      if (r.date > cur.lastOrder) cur.lastOrder = r.date;
      map.set(r.customer, cur);
    });
    return Array.from(map.entries()).map(([customer, v]) => ({ customer, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const productPerf: ProductPerf[] = useMemo(() => {
    const map = new Map<string, { hsCode: string; revenue: number; qty: number; orders: number }>();
    filtered.forEach(r => {
      const cur = map.get(r.product) ?? { hsCode: r.hsCode, revenue: 0, qty: 0, orders: 0 };
      cur.revenue += r.amountUsd;
      cur.qty     += r.qty;
      cur.orders  += 1;
      map.set(r.product, cur);
    });
    return Array.from(map.entries()).map(([product, v]) => ({ product, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const maxCountryRev  = Math.max(...countryPerf.map(c => c.revenue), 1);
  const maxCustomerRev = Math.max(...customerPerf.map(c => c.revenue), 1);
  const maxProductRev  = Math.max(...productPerf.map(p => p.revenue), 1);

  const allCountries = useMemo(() => ["ALL", ...new Set(records.map(r => r.country))], [records]);

  const MONTHLY = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(r => {
      const ym = r.date.slice(0, 7);
      map.set(ym, (map.get(ym) ?? 0) + r.amountUsd);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const maxMonth = Math.max(...MONTHLY.map(([, v]) => v), 1);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <span>📊</span> Export Performance
          </h1>
          <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: 13 }}>
            Country-wise and customer-wise export analysis, revenue trends, and product performance.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <span>From</span>
            <DateInput value={from} onChange={v => setFrom(v)} style={{ ...s.inp, width: 148 }} />
            <span>To</span>
            <DateInput value={to} onChange={v => setTo(v)} style={{ ...s.inp, width: 148 }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Export Revenue", value: fmt(kpis.total),     color: "#10b981" },
          { label: "Total Orders",         value: kpis.orders,         color: "#60a5fa" },
          { label: "Countries Served",     value: kpis.countries,      color: "#a78bfa" },
          { label: "Active Customers",     value: kpis.customers,      color: "#fbbf24" },
          { label: "Avg Order Value",      value: fmt(kpis.avgOrder),  color: "#f472b6" },
        ].map(k => (
          <div key={k.label} style={s.kpi as React.CSSProperties}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, marginBottom: 4 }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Monthly Trend */}
      {MONTHLY.length > 0 && (
        <div style={{ ...s.panel, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Monthly Export Revenue</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80, overflowX: "auto" }}>
            {MONTHLY.map(([ym, val]) => {
              const pct = (val / maxMonth) * 100;
              return (
                <div key={ym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52 }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{fmt(val)}</span>
                  <div style={{ width: 36, height: `${Math.max(pct * 0.6, 4)}px`, background: "linear-gradient(180deg,#10b981,#059669)", borderRadius: "4px 4px 0 0", transition: "height .4s" }} />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{ym.slice(5)}/{ym.slice(2, 4)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs + Filters */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["country","customer","product","detail"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={s.tabBtn(activeTab === t)}>
              {t === "country" ? "🌍 By Country" : t === "customer" ? "👤 By Customer" : t === "product" ? "📦 By Product" : "📋 Detail"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeTab === "detail" && (
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
              style={{ ...s.inp, width: "auto", padding: "7px 12px", fontSize: 12 }}>
              {allCountries.map(c => <option key={c} value={c}>{c === "ALL" ? "All Countries" : c}</option>)}
            </select>
          )}
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...s.inp, width: 220, padding: "7px 12px" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>Loading export data…</div>
      ) : (
        <>
          {/* Country View */}
          {activeTab === "country" && (
            <div style={{ ...s.panel, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Country","Revenue (USD)","Share","Orders","Avg Order","YoY Growth"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {countryPerf.map((c, i) => (
                    <tr key={c.country}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...s.td, color: "var(--text-muted)", width: 36 }}>{i + 1}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{c.country}</td>
                      <td style={{ ...s.td, minWidth: 200 }}>{buildBar(c.revenue, maxCountryRev, "#10b981")}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        {((c.revenue / kpis.total) * 100).toFixed(1)}%
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>{c.orders}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>{fmt(c.avgOrder)}</td>
                      <td style={s.td}>
                        <span style={{ color: c.growth >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{fmtPct(c.growth)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customer View */}
          {activeTab === "customer" && (
            <div style={{ ...s.panel, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Customer","Country","Revenue (USD)","Share","Orders","Avg Order","Last Order"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerPerf.map((c, i) => (
                    <tr key={c.customer}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...s.td, color: "var(--text-muted)", width: 36 }}>{i + 1}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{c.customer}</td>
                      <td style={s.td}>{c.country}</td>
                      <td style={{ ...s.td, minWidth: 200 }}>{buildBar(c.revenue, maxCustomerRev, "#60a5fa")}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        {kpis.total > 0 ? ((c.revenue / kpis.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>{c.orders}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>{fmt(c.revenue / c.orders)}</td>
                      <td style={s.td}>{c.lastOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Product View */}
          {activeTab === "product" && (
            <div style={{ ...s.panel, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Product","HS Code","Revenue (USD)","Share","Qty Exported","Orders","Avg Price/Unit"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productPerf.map((p, i) => (
                    <tr key={p.product}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ ...s.td, color: "var(--text-muted)", width: 36 }}>{i + 1}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{p.product}</td>
                      <td style={s.td}><span style={{ background: "rgba(167,139,250,.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,.3)", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>{p.hsCode}</span></td>
                      <td style={{ ...s.td, minWidth: 200 }}>{buildBar(p.revenue, maxProductRev, "#a78bfa")}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        {kpis.total > 0 ? ((p.revenue / kpis.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>{p.qty.toLocaleString()}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>{p.orders}</td>
                      <td style={{ ...s.td, textAlign: "right" }}>{fmt(p.qty > 0 ? p.revenue / p.qty : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail View */}
          {activeTab === "detail" && (
            <div style={{ ...s.panel, padding: 0, overflow: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 56, textAlign: "center", color: "var(--text-muted)" }}>No records found for selected filters.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                  <thead>
                    <tr>
                      {["Invoice No","Date","Customer","Country","Product","HS Code","Qty","Currency","Amount (USD)","Shipment","Status"].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...s.td, fontWeight: 700, color: "#10b981" }}>{r.invoiceNo}</td>
                        <td style={s.td}>{r.date}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{r.customer}</td>
                        <td style={s.td}>{r.country}</td>
                        <td style={s.td}>{r.product}</td>
                        <td style={s.td}><span style={{ background: "rgba(167,139,250,.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,.3)", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>{r.hsCode}</span></td>
                        <td style={{ ...s.td, textAlign: "right" }}>{r.qty.toLocaleString()} {r.unit}</td>
                        <td style={s.td}>{r.currency}</td>
                        <td style={{ ...s.td, textAlign: "right", fontWeight: 700, color: "#4ade80" }}>{fmt(r.amountUsd)}</td>
                        <td style={s.td}>{r.shipmentRef}</td>
                        <td style={s.td}><span style={{ background: "rgba(74,222,128,.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,.25)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(16,185,129,.06)" }}>
                      <td colSpan={8} style={{ ...s.td, fontWeight: 700, borderTop: "1px solid var(--border)", borderBottom: "none" }}>Total ({filtered.length} records)</td>
                      <td style={{ ...s.td, textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: 14, borderTop: "1px solid var(--border)", borderBottom: "none" }}>
                        {fmt(filtered.reduce((s, r) => s + r.amountUsd, 0))}
                      </td>
                      <td colSpan={2} style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }} />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
