"use client";
import Link from "next/link";
import { useState } from "react";

/* ─── Data ──────────────────────────────────────────────────────────── */

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/external/company",
    tag: "Company",
    color: "#34d399",
    dim: "rgba(52,211,153,.1)",
    summary: "Authenticated company profile — name, country, currency, plan, subscription status.",
    params: [],
    response: `{
  "company": {
    "id": "cmp_abc",
    "name": "Acme Trading",
    "code": "ACME",
    "country": "United Arab Emirates",
    "baseCurrency": "AED",
    "plan": "PROFESSIONAL",
    "subscriptionStatus": "ACTIVE",
    "createdAt": "2026-01-10T09:00:00.000Z"
  },
  "apiKey": { "id": "key_xyz", "name": "Production Key" }
}`,
  },
  {
    method: "GET",
    path: "/api/external/summary",
    tag: "Reports",
    color: "#a78bfa",
    dim: "rgba(167,139,250,.1)",
    summary: "Financial snapshot — revenue, expenses, gross profit, overdue receivables, low-stock count.",
    params: [
      { name: "from", type: "YYYY-MM-DD", note: "Default: start of current month" },
      { name: "to",   type: "YYYY-MM-DD", note: "Default: today" },
    ],
    response: `{
  "period": { "from": "2026-03-01", "to": "2026-03-22" },
  "revenue": 485000,
  "expenses": 210000,
  "grossProfit": 275000,
  "profitMargin": 56.7,
  "invoices": { "total": 38, "overdue": 4, "overdueAmount": 32000 },
  "inventory": { "lowStockCount": 3 },
  "generatedAt": "2026-03-22T10:00:00.000Z"
}`,
  },
  {
    method: "GET",
    path: "/api/external/invoices",
    tag: "Invoices",
    color: "#fbbf24",
    dim: "rgba(251,191,36,.1)",
    summary: "List sales invoices. Pass ?id=<id> for a single invoice with full line items.",
    params: [
      { name: "id",       type: "string",     note: "Return single invoice with items" },
      { name: "from",     type: "YYYY-MM-DD", note: "Filter by date ≥" },
      { name: "to",       type: "YYYY-MM-DD", note: "Filter by date ≤" },
      { name: "customer", type: "string",     note: "Partial customer name match" },
      { name: "limit",    type: "number",     note: "Max 200, default 50" },
      { name: "offset",   type: "number",     note: "Pagination offset" },
    ],
    response: `{
  "total": 142,
  "limit": 50,
  "offset": 0,
  "invoices": [
    {
      "id": "inv_001",
      "invoiceNo": "SI-142",
      "date": "2026-03-20T00:00:00.000Z",
      "customerId": "acct_cust",
      "customerName": "Gulf Trade LLC",
      "total": 18500,
      "createdAt": "2026-03-20T11:22:00.000Z"
    }
  ]
}`,
  },
  {
    method: "POST",
    path: "/api/external/invoices",
    tag: "Invoices",
    color: "#818cf8",
    dim: "rgba(129,140,248,.1)",
    summary: "Create a new sales invoice. Customer is matched by name or auto-created.",
    params: [
      { name: "customerName", type: "string",   note: "Required — matched or auto-created" },
      { name: "date",         type: "YYYY-MM-DD",note: "Required" },
      { name: "items[]",      type: "array",    note: "Required — [{ name, qty, price }]" },
      { name: "tax",          type: "number",   note: "Optional — added to subtotal" },
      { name: "note",         type: "string",   note: "Optional narration" },
    ],
    response: `{
  "success": true,
  "invoice": {
    "id": "inv_003",
    "invoiceNo": "SI-143",
    "total": 6300,
    "customer": { "id": "acct_new", "name": "Al-Saqr Retail" },
    "items": [{ "itemName": "Product A", "qty": 3, "price": 2100 }]
  }
}`,
  },
  {
    method: "GET",
    path: "/api/external/expenses",
    tag: "Expenses",
    color: "#f87171",
    dim: "rgba(248,113,113,.1)",
    summary: "List purchase invoices / expenses. Pass ?id=<id> for full detail.",
    params: [
      { name: "id",       type: "string",     note: "Return single expense with items" },
      { name: "from",     type: "YYYY-MM-DD", note: "" },
      { name: "to",       type: "YYYY-MM-DD", note: "" },
      { name: "supplier", type: "string",     note: "Partial supplier name match" },
      { name: "limit",    type: "number",     note: "Max 200, default 50" },
      { name: "offset",   type: "number",     note: "" },
    ],
    response: `{
  "total": 56,
  "expenses": [
    {
      "id": "exp_001",
      "invoiceNo": "PI-56",
      "date": "2026-03-18T00:00:00.000Z",
      "supplierName": "Gulf Supplies Co.",
      "total": 42000
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/external/ledger",
    tag: "Accounting",
    color: "#06b6d4",
    dim: "rgba(6,182,212,.1)",
    summary: "Ledger entries for a specific account, or full chart of accounts list.",
    params: [
      { name: "accounts", type: "1",          note: "Return chart of accounts (no accountId needed)" },
      { name: "accountId",type: "string",     note: "Required for ledger entries" },
      { name: "from",     type: "YYYY-MM-DD", note: "" },
      { name: "to",       type: "YYYY-MM-DD", note: "" },
      { name: "limit",    type: "number",     note: "Max 500, default 100" },
      { name: "offset",   type: "number",     note: "" },
    ],
    response: `{
  "account": { "id": "acct_001", "code": "1100", "name": "Cash", "type": "ASSET" },
  "openingBalance": 50000,
  "closingBalance": 86500,
  "entries": [
    { "date": "2026-03-01T00:00:00.000Z", "voucherNo": "JV-12",
      "narration": "Cash sale", "debit": 36500, "credit": 0, "balance": 86500 }
  ],
  "count": 1
}`,
  },
  {
    method: "GET",
    path: "/api/external/inventory",
    tag: "Inventory",
    color: "#f97316",
    dim: "rgba(249,115,22,.1)",
    summary: "All items with current stock levels. Use ?low=1 for low-stock only, ?id=<id> for detail.",
    params: [
      { name: "id",  type: "string", note: "Single item + recent transactions" },
      { name: "low", type: "1",      note: "Return only items below minStock" },
    ],
    response: `{
  "total": 84,
  "lowStockCount": 3,
  "items": [
    {
      "id": "item_001",
      "name": "Widget A",
      "code": "WGT-A",
      "unit": "PCS",
      "salePrice": 250,
      "costPrice": 180,
      "minStock": 10,
      "currentStock": 42,
      "isLowStock": false
    }
  ]
}`,
  },
];

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:  { bg: "rgba(52,211,153,.14)",  text: "#34d399" },
  POST: { bg: "rgba(129,140,248,.14)", text: "#818cf8" },
  PUT:  { bg: "rgba(251,191,36,.14)",  text: "#fbbf24" },
  DELETE: { bg: "rgba(248,113,113,.14)", text: "#f87171" },
};

const TAGS = ["All", "Company", "Reports", "Invoices", "Expenses", "Accounting", "Inventory"];

/* ─── Components ────────────────────────────────────────────────────── */

function EndpointCard({ ep }: { ep: typeof ENDPOINTS[0] }) {
  const [open, setOpen] = useState(false);
  const mc = METHOD_COLORS[ep.method] ?? METHOD_COLORS.GET;

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden",
      background: "rgba(255,255,255,.025)",
      border: `1px solid ${open ? ep.color + "30" : "rgba(255,255,255,.07)"}`,
      transition: "border-color .2s",
    }}>
      {/* Header row */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        background: "none", border: "none", cursor: "pointer",
        fontFamily: "inherit", textAlign: "left",
      }}>
        <span style={{ padding: "4px 11px", borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: ".07em", flexShrink: 0, background: mc.bg, color: mc.text }}>
          {ep.method}
        </span>
        <code style={{ fontSize: 13, color: "rgba(255,255,255,.8)", flex: 1, fontFamily: "ui-monospace,monospace" }}>
          {ep.path}
        </code>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: ep.dim, color: ep.color, fontWeight: 700, letterSpacing: ".05em", flexShrink: 0 }}>
          {ep.tag}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "16px 0", lineHeight: 1.7 }}>
            {ep.summary}
          </p>

          {ep.params.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
                Parameters
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ep.params.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                    <code style={{ fontSize: 12, color: ep.color, fontFamily: "ui-monospace,monospace", flexShrink: 0 }}>{p.name}</code>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.28)", fontFamily: "ui-monospace,monospace", flexShrink: 0 }}>{p.type}</span>
                    {p.note && <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{p.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
            Example Response
          </div>
          <pre style={{
            margin: 0, padding: "14px 16px", borderRadius: 12,
            background: "#050816", border: "1px solid rgba(255,255,255,.07)",
            fontSize: 12, color: "#86efac", overflowX: "auto", lineHeight: 1.7,
            fontFamily: "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
          }}>
            {ep.response}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */

export default function ApiDocsPage() {
  const [activeTag, setActiveTag] = useState("All");

  const filtered = activeTag === "All"
    ? ENDPOINTS
    : ENDPOINTS.filter(e => e.tag === activeTag);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#07091c 0%,#080c22 50%,#06091a 100%)",
      color: "white", fontFamily: "'Outfit',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Lora:wght@700&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      {/* BG grid */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize: "52px 52px" }}/>
        <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent)" }}/>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "72px 24px 100px", position: "relative", zIndex: 1 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36 }}>
          <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}>Home</Link>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <Link href="/docs" style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.6)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.25)")}>Docs</Link>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 500 }}>API Reference</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 100, marginBottom: 20, background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.28)", fontSize: 10.5, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".09em" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "blink 2s ease infinite" }}/>
            REST API — v1
          </div>
          <h1 style={{ fontFamily: "'Lora',serif", fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 14 }}>
            FinovaOS API Reference
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.42)", lineHeight: 1.8, maxWidth: 620 }}>
            Company-scoped REST API. Generate a key from Dashboard → Integrations → API Access. Send it in every request header.
          </p>
        </div>

        {/* Auth cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 40 }}>
          <div style={{ borderRadius: 16, padding: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 12, letterSpacing: ".06em" }}>OPTION A — API KEY HEADER</div>
            <pre style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: "#050816", border: "1px solid rgba(255,255,255,.07)", color: "#86efac", fontSize: 12, overflowX: "auto" }}>{`x-api-key: finova_live_your_key`}</pre>
          </div>
          <div style={{ borderRadius: 16, padding: 20, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.5)", marginBottom: 12, letterSpacing: ".06em" }}>OPTION B — BEARER TOKEN</div>
            <pre style={{ margin: 0, padding: "12px 14px", borderRadius: 12, background: "#050816", border: "1px solid rgba(255,255,255,.07)", color: "#93c5fd", fontSize: 12, overflowX: "auto" }}>{`Authorization: Bearer finova_live_your_key`}</pre>
          </div>
        </div>

        {/* Base URL */}
        <div style={{ borderRadius: 14, padding: "14px 20px", marginBottom: 36, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", flexShrink: 0 }}>BASE URL</span>
          <code style={{ fontSize: 13, color: "#a5b4fc" }}>https://finovaos.app</code>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.25)", marginLeft: "auto" }}>All responses are JSON · Rate limit: 1,000 req/hr</span>
        </div>

        {/* Tag filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {TAGS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)} style={{
              padding: "7px 18px", borderRadius: 24, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              background: activeTag === tag ? "rgba(99,102,241,.22)" : "rgba(255,255,255,.04)",
              color: activeTag === tag ? "#a5b4fc" : "rgba(255,255,255,.42)",
              border: `1px solid ${activeTag === tag ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.08)"}`,
              transition: "all .2s",
            }}>
              {tag}
            </button>
          ))}
        </div>

        {/* Endpoint count */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.25)", marginBottom: 16 }}>
          {filtered.length} endpoint{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* Endpoints */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 56 }}>
          {filtered.map((ep, i) => <EndpointCard key={i} ep={ep} />)}
        </div>

        {/* cURL example */}
        <div style={{ borderRadius: 18, padding: 24, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 14 }}>Quick test — cURL</div>
          <pre style={{ margin: 0, padding: "14px 16px", borderRadius: 12, background: "#050816", border: "1px solid rgba(255,255,255,.07)", color: "#e5e7eb", fontSize: 12, overflowX: "auto", lineHeight: 1.8, fontFamily: "ui-monospace,monospace" }}>
{`# Financial summary for current month
curl -X GET "https://finovaos.app/api/external/summary" \\
  -H "x-api-key: finova_live_your_key"

# List last 10 invoices
curl "https://finovaos.app/api/external/invoices?limit=10" \\
  -H "x-api-key: finova_live_your_key"

# Create a new invoice
curl -X POST "https://finovaos.app/api/external/invoices" \\
  -H "x-api-key: finova_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"customerName":"Al-Saqr Retail","date":"2026-03-22","items":[{"name":"Widget A","qty":5,"price":1200}]}'

# Low-stock items only
curl "https://finovaos.app/api/external/inventory?low=1" \\
  -H "x-api-key: finova_live_your_key"`}
          </pre>
        </div>

        {/* CTA */}
        <div style={{ borderRadius: 18, padding: "28px 36px", background: "linear-gradient(135deg,rgba(45,43,107,.85),rgba(30,27,85,.85))", border: "1.5px solid rgba(99,102,241,.22)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "white", marginBottom: 6 }}>Ready to integrate?</div>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>Generate your API key from the dashboard and start in minutes.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard/integrations/api-access" style={{ padding: "12px 22px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 4px 16px rgba(99,102,241,.4)" }}>
              Generate API Key →
            </Link>
            <Link href="/docs" style={{ padding: "11px 20px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Back to Docs
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
