"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// ─── All navigable pages ──────────────────────────────────────────────────────
const NAV_PAGES = [
  { title: "Dashboard",           url: "/dashboard",                         icon: "🏠", tags: ["home","overview","dashboard"] },
  { title: "CRM",                 url: "/dashboard/crm",                     icon: "🤝", tags: ["crm","customers","contacts","leads","pipeline"] },
  { title: "Business Opinion",    url: "/dashboard/business-opinion",        icon: "💡", tags: ["opinion","ai","insights"] },
  { title: "AI Intelligence",     url: "/dashboard/ai-intelligence",         icon: "🤖", tags: ["ai","intelligence","analytics"] },
  { title: "Sales Invoices",      url: "/dashboard/sales-invoice",           icon: "🧾", tags: ["sales","invoice","bill"] },
  { title: "Purchase Invoices",   url: "/dashboard/purchase-invoice",        icon: "📦", tags: ["purchase","invoice","buy"] },
  { title: "Quotations",          url: "/dashboard/quotation",               icon: "📋", tags: ["quotation","quote","estimate"] },
  { title: "Purchase Orders",     url: "/dashboard/purchase-order",          icon: "🛒", tags: ["purchase","order","po"] },
  { title: "Delivery Challans",   url: "/dashboard/delivery-challan",        icon: "🚚", tags: ["delivery","challan","dispatch"] },
  { title: "Sale Returns",        url: "/dashboard/sale-return",             icon: "↩️", tags: ["return","sale","refund"] },
  { title: "Purchase Returns",    url: "/dashboard/purchase-return",         icon: "↩️", tags: ["return","purchase","refund"] },
  { title: "Accounts",            url: "/dashboard/accounts",                icon: "📒", tags: ["accounts","ledger","chart"] },
  { title: "Journal Voucher",     url: "/dashboard/jv",                      icon: "📝", tags: ["journal","voucher","jv","entry"] },
  { title: "CRV Vouchers",        url: "/dashboard/crv",                     icon: "💰", tags: ["crv","cash","receipt","voucher"] },
  { title: "CPV Vouchers",        url: "/dashboard/cpv",                     icon: "💸", tags: ["cpv","cash","payment","voucher"] },
  { title: "Expense Vouchers",    url: "/dashboard/expense-vouchers",        icon: "🧾", tags: ["expense","voucher"] },
  { title: "Payment Receipts",    url: "/dashboard/payment-receipts",        icon: "🧾", tags: ["payment","receipt","receive"] },
  { title: "Bank Reconciliation", url: "/dashboard/bank-reconciliation",     icon: "🏦", tags: ["bank","reconciliation","statement"] },
  { title: "Items / Products",    url: "/dashboard/items-new",               icon: "📦", tags: ["items","products","inventory","stock"] },
  { title: "Inventory",           url: "/dashboard/inventory",               icon: "📦", tags: ["inventory","stock","godown","warehouse"] },
  { title: "Employees",           url: "/dashboard/employees",               icon: "👥", tags: ["employees","staff","hr","team"] },
  { title: "Attendance",          url: "/dashboard/attendance",              icon: "📅", tags: ["attendance","present","absent","leave"] },
  { title: "Payroll",             url: "/dashboard/payroll",                 icon: "💵", tags: ["payroll","salary","wages"] },
  { title: "Advance Salary",      url: "/dashboard/advance-salary",          icon: "💰", tags: ["advance","salary","loan"] },
  { title: "Salary Tables",       url: "/dashboard/salary-table",            icon: "📊", tags: ["salary","table","structure"] },
  { title: "Profit & Loss",       url: "/dashboard/financial-reports/profit-loss", icon: "📈", tags: ["profit","loss","pnl","financial"] },
  { title: "Balance Sheet",       url: "/dashboard/financial-reports/balance-sheet", icon: "⚖️", tags: ["balance","sheet","assets","liability"] },
  { title: "Trial Balance",       url: "/dashboard/financial-reports/trial-balance", icon: "📊", tags: ["trial","balance"] },
  { title: "Cash Flow",           url: "/dashboard/financial-reports/cash-flow", icon: "💧", tags: ["cash","flow","statement"] },
  { title: "Activity Reports",    url: "/dashboard/activity-reports",        icon: "📊", tags: ["activity","report","log"] },
  { title: "Trading Control",     url: "/dashboard/trading",                 icon: "📈", tags: ["trading","wholesale","trade","control"] },
  { title: "Order Desk",          url: "/dashboard/trading/order-desk",      icon: "📋", tags: ["order","desk","trading"] },
  { title: "Procurement",         url: "/dashboard/trading/procurement",     icon: "🛒", tags: ["procurement","purchase","trading"] },
  { title: "Stock Control",       url: "/dashboard/trading/stock-control",   icon: "📦", tags: ["stock","control","trading"] },
  { title: "Outstandings",        url: "/dashboard/trading/outstandings",    icon: "📊", tags: ["outstanding","receivable","payable"] },
  { title: "Dispatch Board",      url: "/dashboard/trading/dispatch-board",  icon: "🚚", tags: ["dispatch","board","delivery"] },
  { title: "Settings",            url: "/dashboard/settings",                icon: "⚙️", tags: ["settings","config","setup"] },
  { title: "Refer & Earn",        url: "/affiliate",                         icon: "💰", tags: ["affiliate","refer","earn","commission"] },
];

function searchPages(q: string) {
  const lower = q.toLowerCase().trim();
  if (lower.length < 2) return [];
  return NAV_PAGES.filter(p =>
    p.title.toLowerCase().includes(lower) ||
    p.tags.some(t => t.includes(lower))
  ).slice(0, 5);
}

export default function GlobalSearch() {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<any>(null);
  const [loading,     setLoading]     = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const searchRef  = useRef<HTMLDivElement>(null);
  const router     = useRouter();
  const searchParams = useSearchParams();
  const pathname   = usePathname();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);
    else if (!q && query) setQuery("");
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (query !== (searchParams.get("q") || "")) {
        const p = new URLSearchParams(searchParams.toString());
        if (query) p.set("q", query); else p.delete("q");
        router.replace(`${pathname}?${p.toString()}`);
      }
      if (query.length >= 2) { setShowResults(true); performSearch(); }
      else { setResults(null); setShowResults(false); setError(null); }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function performSearch() {
    setLoading(true); setError(null);
    try {
      const user = getCurrentUser();
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "x-user-id":    user?.id       || "",
          "x-user-role":  user?.role     || "ADMIN",
          "x-company-id": user?.companyId || "",
        },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(null); setResults({}); }
      else { setResults(data); }
    } catch {
      setResults({});
    } finally { setLoading(false); }
  }

  function handleResultClick(url: string) {
    setShowResults(false); setQuery(""); router.push(url);
  }

  const pageMatches = searchPages(query);

  const dataSections = results ? [
    { label: "Accounts",           items: results.accounts        || [], icon: "📒" },
    { label: "Items",              items: results.items           || [], icon: "📦" },
    { label: "Sales Invoices",     items: results.salesInvoices   || [], icon: "🧾" },
    { label: "Purchase Invoices",  items: results.purchaseInvoices || [], icon: "📦" },
    { label: "Vouchers",           items: results.vouchers        || [], icon: "📝" },
  ].filter(s => s.items.length > 0) : [];

  const hasAny = pageMatches.length > 0 || dataSections.length > 0;

  return (
    <div ref={searchRef} style={{ position: "relative", width: "100%", maxWidth: 420 }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2"
          style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (pageMatches.length > 0) handleResultClick(pageMatches[0].url);
              else if (dataSections.length > 0 && dataSections[0].items.length > 0)
                handleResultClick(dataSections[0].items[0].url);
            }
            if (e.key === "Escape") setShowResults(false);
          }}
          placeholder="Search pages, accounts, invoices…"
          style={{
            width: "100%", padding: "8px 32px 8px 32px",
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 9, fontSize: 13,
            color: "var(--text-primary)",
            outline: "none", boxSizing: "border-box",
            transition: "border-color .15s", fontFamily: "inherit",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "#818cf8"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
        {loading ? (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <div style={{ width: 13, height: 13, border: "2px solid var(--border)", borderTopColor: "#818cf8", borderRadius: "50%", animation: "spin .7s linear infinite" }}/>
          </div>
        ) : query.length > 0 ? (
          <button onClick={() => { setQuery(""); setShowResults(false); }}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
              fontSize: 14, padding: "0 2px", lineHeight: 1 }}>
            ✕
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {showResults && query.length >= 2 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 9999,
          background: "var(--panel-bg)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,.35)",
          maxHeight: 440, overflowY: "auto",
        }}>

          {/* Page Navigation Results */}
          {pageMatches.length > 0 && (
            <div>
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700,
                color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em",
                display: "flex", alignItems: "center", gap: 6 }}>
                <span>🔗</span> Pages
              </div>
              {pageMatches.map(p => (
                <div key={p.url} onClick={() => handleResultClick(p.url)}
                  style={{ padding: "9px 14px", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: 10, transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(129,140,248,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{p.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{p.url}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 10, color: "#818cf8",
                    background: "rgba(129,140,248,.1)", padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>
                    Go →
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Divider between pages and data */}
          {pageMatches.length > 0 && dataSections.length > 0 && (
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          )}

          {/* Data Results */}
          {dataSections.map((section, si) => (
            <div key={si}>
              {si > 0 && <div style={{ height: 1, background: "var(--border)", margin: "0 12px" }}/>}
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700,
                color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".08em",
                display: "flex", alignItems: "center", gap: 6 }}>
                <span>{section.icon}</span> {section.label}
              </div>
              {section.items.map((item: any) => (
                <div key={item.id} onClick={() => handleResultClick(item.url)}
                  style={{ padding: "9px 14px", cursor: "pointer", transition: "background .1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(129,140,248,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                  {item.subtitle && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.subtitle}</div>}
                </div>
              ))}
            </div>
          ))}

          {/* Empty state */}
          {!loading && !hasAny && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                No results for &ldquo;{query}&rdquo;
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Try searching: CRM, Sales, Invoice, Payroll…
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
