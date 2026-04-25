"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  type?: string;
};

type SearchResults = {
  contacts?: SearchResultItem[];
  opportunities?: SearchResultItem[];
  interactions?: SearchResultItem[];
  accounts?: SearchResultItem[];
  customers?: SearchResultItem[];
  suppliers?: SearchResultItem[];
  items?: SearchResultItem[];
  salesInvoices?: SearchResultItem[];
  purchaseInvoices?: SearchResultItem[];
  quotations?: SearchResultItem[];
  purchaseOrders?: SearchResultItem[];
  deliveryChallans?: SearchResultItem[];
  grns?: SearchResultItem[];
  paymentReceipts?: SearchResultItem[];
  saleReturns?: SearchResultItem[];
  vouchers?: SearchResultItem[];
};

type NavPage = {
  title: string;
  url: string;
  icon: string;
  tags: string[];
};

const NAV_PAGES: NavPage[] = [
  { title: "Dashboard", url: "/dashboard", icon: "🏠", tags: ["home", "overview", "dashboard"] },
  { title: "Owner Dashboard", url: "/dashboard/owner-dashboard", icon: "👑", tags: ["owner", "kpi", "summary"] },
  { title: "Accounts", url: "/dashboard/accounts", icon: "📒", tags: ["accounts", "ledger", "chart"] },
  { title: "Items / Products", url: "/dashboard/items-new", icon: "📦", tags: ["items", "products", "inventory", "stock"] },
  { title: "Inventory", url: "/dashboard/inventory", icon: "🏷️", tags: ["inventory", "stock", "warehouse", "godown"] },
  { title: "Sales Invoice", url: "/dashboard/sales-invoice", icon: "🧾", tags: ["sales", "invoice", "bill"] },
  { title: "Purchase Invoice", url: "/dashboard/purchase-invoice", icon: "📥", tags: ["purchase", "invoice", "buy"] },
  { title: "Quotation", url: "/dashboard/quotation", icon: "📋", tags: ["quotation", "quote", "estimate"] },
  { title: "Purchase Order", url: "/dashboard/purchase-order", icon: "🛒", tags: ["purchase", "order", "po"] },
  { title: "Goods Receipt Note", url: "/dashboard/grn", icon: "📦", tags: ["grn", "goods receipt", "received"] },
  { title: "Delivery Challan", url: "/dashboard/delivery-challan", icon: "🚚", tags: ["delivery", "challan", "dispatch"] },
  { title: "Sales Return", url: "/dashboard/sale-return", icon: "↩️", tags: ["return", "sales", "refund"] },
  { title: "Payment Receipts", url: "/dashboard/payment-receipts", icon: "💳", tags: ["payment", "receipt", "receive"] },
  { title: "Journal Voucher", url: "/dashboard/jv", icon: "📝", tags: ["journal", "voucher", "entry", "jv"] },
  { title: "CRV", url: "/dashboard/crv", icon: "💰", tags: ["crv", "cash", "receipt voucher"] },
  { title: "CPV", url: "/dashboard/cpv", icon: "💸", tags: ["cpv", "cash", "payment voucher"] },
  { title: "Expense Vouchers", url: "/dashboard/expense-vouchers", icon: "🧾", tags: ["expense", "voucher"] },
  { title: "Bank Reconciliation", url: "/dashboard/bank-reconciliation", icon: "🏦", tags: ["bank", "reconciliation", "statement"] },
  { title: "Employees", url: "/dashboard/employees", icon: "👥", tags: ["employees", "staff", "hr", "team"] },
  { title: "Attendance", url: "/dashboard/attendance", icon: "📅", tags: ["attendance", "present", "leave"] },
  { title: "Payroll", url: "/dashboard/payroll", icon: "💵", tags: ["payroll", "salary", "wages"] },
      { title: "CRM", url: "/dashboard/crm", icon: "🤝", tags: ["crm", "customers", "contacts", "leads"] },
  { title: "CRM Contacts", url: "/dashboard/crm/contacts", icon: "📇", tags: ["crm", "contacts", "customer", "supplier", "lead", "partner"] },
  { title: "CRM Opportunities", url: "/dashboard/crm/opportunities", icon: "🎯", tags: ["crm", "opportunity", "pipeline", "deal"] },
  { title: "CRM Interactions", url: "/dashboard/crm/interactions", icon: "💬", tags: ["crm", "interaction", "calls", "meetings", "followup"] },
  { title: "Reports Hub", url: "/dashboard/reports", icon: "📊", tags: ["reports", "analytics"] },
  { title: "Ledger Report", url: "/dashboard/reports/ledger", icon: "📘", tags: ["report", "ledger"] },
  { title: "Sales Report", url: "/dashboard/reports/sales", icon: "📈", tags: ["report", "sales"] },
  { title: "Stock Report", url: "/dashboard/reports/stock/valuation", icon: "📦", tags: ["report", "stock", "valuation"] },
  { title: "Ageing Report", url: "/dashboard/reports/ageing", icon: "⏳", tags: ["report", "ageing", "receivable", "payable"] },
  { title: "AI Center", url: "/dashboard/ai-center", icon: "🤖", tags: ["ai", "assistant", "insights"] },
  { title: "AI Assistant", url: "/dashboard/ai-assistant", icon: "🧠", tags: ["ai", "assistant", "chat"] },
];

function searchPages(query: string) {
  const normalized = query.toLowerCase().trim();
  if (normalized.length < 2) return [];
  return NAV_PAGES.filter((page) => {
    const titleHit = page.title.toLowerCase().includes(normalized);
    const tagHit = page.tags.some((tag) => tag.toLowerCase().includes(normalized));
    return titleHit || tagHit;
  }).slice(0, 8);
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) setQuery(q);
    if (!q && query) setQuery("");
  }, [query, searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (query !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (query) params.set("q", query);
        else params.delete("q");
        router.replace(`${pathname}?${params.toString()}`);
      }

      if (query.length >= 2) {
        setShowResults(true);
        void performSearch();
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, query, router, searchParams]);

  async function performSearch() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
        },
      });

      const text = await response.text();
      const parsed = text ? (JSON.parse(text) as SearchResults) : {};
      setResults(response.ok ? parsed : {});
    } catch {
      setResults({});
    } finally {
      setLoading(false);
    }
  }

  function handleResultClick(url: string) {
    setShowResults(false);
    setQuery("");
    router.push(url);
  }

  const pageMatches = searchPages(query);
  const dataSections = results
    ? [
        { label: "Customers", items: results.customers || [], icon: "👤" },
        { label: "Suppliers", items: results.suppliers || [], icon: "🏭" },
        { label: "CRM Contacts", items: results.contacts || [], icon: "📇" },
        { label: "Opportunities", items: results.opportunities || [], icon: "🎯" },
        { label: "Interactions", items: results.interactions || [], icon: "💬" },
        { label: "Accounts", items: results.accounts || [], icon: "📒" },
        { label: "Items", items: results.items || [], icon: "📦" },
        { label: "Sales Invoices", items: results.salesInvoices || [], icon: "🧾" },
        { label: "Purchase Invoices", items: results.purchaseInvoices || [], icon: "📥" },
        { label: "Quotations", items: results.quotations || [], icon: "📋" },
        { label: "Purchase Orders", items: results.purchaseOrders || [], icon: "🛒" },
        { label: "Delivery Challans", items: results.deliveryChallans || [], icon: "🚚" },
        { label: "GRN", items: results.grns || [], icon: "📦" },
        { label: "Payment Receipts", items: results.paymentReceipts || [], icon: "💳" },
        { label: "Sales Returns", items: results.saleReturns || [], icon: "↩️" },
        { label: "Vouchers", items: results.vouchers || [], icon: "📝" },
      ].filter((section) => section.items.length > 0)
    : [];

  const hasAnyResult = pageMatches.length > 0 || dataSections.length > 0;

  return (
    <div ref={searchRef} style={{ position: "relative", width: "100%", maxWidth: 420 }}>
      <div style={{ position: "relative" }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          data-global-search-input="true"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (pageMatches.length > 0) {
                handleResultClick(pageMatches[0].url);
                return;
              }
              if (dataSections.length > 0 && dataSections[0].items.length > 0) {
                handleResultClick(dataSections[0].items[0].url);
              }
            }
            if (event.key === "Escape") setShowResults(false);
          }}
          placeholder="Search pages, users, invoices, vouchers, PO, GRN..."
          style={{
            width: "100%",
            padding: "8px 32px",
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            fontSize: 13,
            color: "var(--text-primary)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color .15s",
            fontFamily: "inherit",
          }}
          onFocus={(event) => {
            event.currentTarget.style.borderColor = "#818cf8";
          }}
          onBlur={(event) => {
            event.currentTarget.style.borderColor = "var(--border)";
          }}
        />

        {loading ? (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <div
              style={{
                width: 13,
                height: 13,
                border: "2px solid var(--border)",
                borderTopColor: "#818cf8",
                borderRadius: "50%",
                animation: "spin .7s linear infinite",
              }}
            />
          </div>
        ) : query.length > 0 ? (
          <button
            onClick={() => {
              setQuery("");
              setShowResults(false);
            }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {showResults && query.length >= 2 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,.35)",
            maxHeight: 460,
            overflowY: "auto",
          }}
        >
          {pageMatches.length > 0 && (
            <div>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🔗</span> Pages
              </div>
              {pageMatches.map((page) => (
                <div
                  key={page.url}
                  onClick={() => handleResultClick(page.url)}
                  style={{
                    padding: "9px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "background .1s",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "rgba(129,140,248,.1)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{page.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{page.title}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{page.url}</div>
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: "#818cf8",
                      background: "rgba(129,140,248,.1)",
                      padding: "2px 7px",
                      borderRadius: 5,
                      fontWeight: 700,
                    }}
                  >
                    Go →
                  </div>
                </div>
              ))}
            </div>
          )}

          {pageMatches.length > 0 && dataSections.length > 0 && (
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          )}

          {dataSections.map((section, sectionIndex) => (
            <div key={`${section.label}-${sectionIndex}`}>
              {sectionIndex > 0 && (
                <div style={{ height: 1, background: "var(--border)", margin: "0 12px" }} />
              )}
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{section.icon}</span> {section.label}
              </div>
              {section.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  style={{ padding: "9px 14px", cursor: "pointer", transition: "background .1s" }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = "rgba(129,140,248,.1)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                  {item.subtitle ? (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.subtitle}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}

          {!loading && !hasAnyResult && (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 4,
                }}
              >
                No results for "{query}"
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Try keywords like customer, supplier, invoice, PO, challan, GRN, report.
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
