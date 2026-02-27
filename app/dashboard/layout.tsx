"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/logout";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import GlobalSearch from "@/components/GlobalSearch";
import { useGlobalEnterNavigation } from "@/hooks/useGlobalEnterNavigation";
import { ModeToggle } from "@/components/mode-toggle";

type PermissionEntry = { permission: string } | string;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionEntry[];
  rolePermissions: PermissionEntry[];
  companyId?: string | null;
  companies?: Array<{
    id: string;
    name?: string;
    code?: string | null;
    isDefault?: boolean;
  }>;
} | null;

type MenuHeaderProps = {
  title: string;
  open: boolean;
  onClick: () => void;
};

type SubHeaderProps = {
  title: string;
  open: boolean;
  onClick: () => void;
};

type MenuLinkProps = {
  href: string;
  children: React.ReactNode;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";
  const [ready, setReady] = useState(false);

  // SIDEBAR STATES
  const [openForms, setOpenForms] = useState(true);
  const [openReports, setOpenReports] = useState(true);
  const [openAccounts, setOpenAccounts] = useState(false);
  const [openCatalog, setOpenCatalog] = useState(false);
  const [openInventory, setOpenInventory] = useState(false);
  const [openFinReports, setOpenFinReports] = useState(false);
  const [openInvReports, setOpenInvReports] = useState(false);
  const [openPhase1, setOpenPhase1] = useState(false);
  const [openAccounting, setOpenAccounting] = useState(false);
  const [openHR, setOpenHR] = useState(false);
  const [openCRM, setOpenCRM] = useState(false);
  const [openCurrency, setOpenCurrency] = useState(false);
  const [openAdmin, setOpenAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [subInfo, setSubInfo] = useState<{ plan: string; status: string } | null>(null);

  // MOBILE MENU STATE
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Enable global Enter key navigation
  useGlobalEnterNavigation();

  useEffect(() => {
    const u = getCurrentUser() as CurrentUser;

    const loadFreshPermissions = async () => {
      if (!u) {
        setCurrentUser(null);
        setReady(true);
        return;
      }

      if (u.role === "ADMIN") {
        setCurrentUser(u);
        setReady(true);
        return;
      }

      try {
        const res = await fetch("/api/me/permissions", {
          headers: {
            "x-user-id": u.id,
            "x-user-role": u.role,
            "x-company-id": u.companyId || "",
          },
        });

        if (!res.ok) {
          setCurrentUser(u);
          setReady(true);
          return;
        }

        const data = (await res.json()) as {
          role: string;
          permissions: string[];
          rolePermissions: string[];
        };

        const updatedUser: CurrentUser = {
          ...u,
          role: data.role || u.role,
          permissions: data.permissions,
          rolePermissions: data.rolePermissions,
        };

        setCurrentUser(updatedUser);
        try {
          const c = await fetch("/api/me/company", {
            headers: {
              "x-user-id": u.id,
              "x-user-role": u.role,
              "x-company-id": u.companyId || "",
            },
          });
          if (c.ok) {
            const cj = await c.json();
            setIsPro(String(cj.plan || "").toUpperCase() === "PRO" && String(cj.subscriptionStatus || "").toUpperCase() === "ACTIVE");
            setSubInfo({ plan: String(cj.plan || "STARTER"), status: String(cj.subscriptionStatus || "ACTIVE") });
          } else {
            setIsPro(false);
            setSubInfo(null);
          }
        } catch {
          setIsPro(false);
          setSubInfo(null);
        }
        setReady(true);
      } catch (err) {
        console.error("Failed to fetch current user permissions:", err);
        setCurrentUser(u);
        setReady(true);
      }
    };

    loadFreshPermissions();
  }, []);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    const originalFetch = window.fetch;
    window.fetch = (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      if (!headers.has("x-company-id")) {
        headers.set("x-company-id", currentUser.companyId || "");
      }
      return originalFetch(input, { ...init, headers });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [currentUser?.companyId]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] font-[var(--font-sans)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading session...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--app-bg)]">
        <div className="text-[var(--danger)] font-bold text-lg">Session expired.</div>
        <button onClick={logout} className="mt-4 text-[var(--accent)] underline">
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--app-bg)] text-sm font-[var(--font-sans)] text-[var(--text-primary)] relative">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-[var(--panel-bg)] text-[var(--text-muted)] flex flex-col border-r border-[var(--border)]
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* ---- HEADER ---- */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider font-[var(--font-display)]">
            US Traders 
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            Business Management System
          </div>
        </div>

        <nav className="p-3 space-y-2 overflow-y-auto flex-1 pb-24">
          {hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD) && (
            <MenuLink href="/dashboard">Dashboard</MenuLink>
          )}

          {/* ================= FORMS ================= */}
          <MenuHeader title="Forms" open={openForms} onClick={() => setOpenForms(!openForms)} />

          {openForms && (
            <div className="ml-2 space-y-2 border-l border-[var(--border)]">

              {/* PHASE 1 */}
              {hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD) && (
                <>
                  <SubHeader title="Banking & Payment" open={openPhase1} onClick={() => setOpenPhase1(!openPhase1)} />
                  {openPhase1 && (
                    <div className="ml-4 space-y-1">
                      {hasPermission(currentUser, PERMISSIONS.BANK_RECONCILIATION) && <MenuLink href="/dashboard/bank-reconciliation">Bank Reconciliation</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.PAYMENT_RECEIPTS) && <MenuLink href="/dashboard/payment-receipts">Payment Receipts</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.EXPENSE_VOUCHERS) && <MenuLink href="/dashboard/expense-vouchers">Expense Vouchers</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.TAX_CONFIGURATION) && <MenuLink href="/dashboard/tax-configuration">Tax Configuration</MenuLink>}
                      <MenuLink href="/dashboard/phase1-guide">ðŸ“– Complete Guide</MenuLink>
                    </div>
                  )}
                </>
              )}

              {/* ACCOUNTS */}
              {hasPermission(currentUser, PERMISSIONS.VIEW_ACCOUNTS) && (
                <>
                  <SubHeader title="Accounts" open={openAccounts} onClick={() => setOpenAccounts(!openAccounts)} />
                  {openAccounts && (
                    <div className="ml-4 space-y-1">
                      {hasPermission(currentUser, PERMISSIONS.CREATE_CPV) && <MenuLink href="/dashboard/cpv">CPV</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_CRV) && <MenuLink href="/dashboard/crv">CRV</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_CPV) && <MenuLink href="/dashboard/jv">JV (Journal)</MenuLink>}
                    </div>
                  )}
                </>
              )}

              {/* ACCOUNTING FEATURES - ALWAYS VISIBLE */}
              <SubHeader
                title="Accounting"
                open={openAccounting}
                onClick={() => setOpenAccounting(!openAccounting)}
              />
              {openAccounting && (
                <div className="ml-4 space-y-1">
                  <MenuLink href="/dashboard/contra">Contra Entry</MenuLink>
                  <MenuLink href="/dashboard/advance-payment">Advance Payment</MenuLink>
                  <MenuLink href="/dashboard/petty-cash">Petty Cash</MenuLink>
                  <MenuLink href="/dashboard/credit-note">Credit Notes</MenuLink>
                  <MenuLink href="/dashboard/debit-note">Debit Notes</MenuLink>
                  <MenuLink href="/dashboard/fixed-assets">Fixed Assets</MenuLink>
                  <MenuLink href="/dashboard/loans">Loans</MenuLink>
                </div>
              )}


              {/* CATALOG */}
              {hasPermission(currentUser, PERMISSIONS.VIEW_CATALOG) && (
                <>
                  <SubHeader title="Catalog" open={openCatalog} onClick={() => setOpenCatalog(!openCatalog)} />
                  {openCatalog && (
                    <div className="ml-4 space-y-1">
                      {hasPermission(currentUser, PERMISSIONS.CREATE_ACCOUNTS) && <MenuLink href="/dashboard/accounts">Accounts</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_ITEMS) && <MenuLink href="/dashboard/items-new">Items</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_STOCK_RATE) && <MenuLink href="/dashboard/stock-rate">Stock Rate</MenuLink>}
                    </div>
                  )}
                </>
              )}

              {/* INVENTORY */}
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && (
                <>
                  <SubHeader title="Inventory" open={openInventory} onClick={() => setOpenInventory(!openInventory)} />
                  {openInventory && (
                    <div className="ml-4 space-y-1">
                      {hasPermission(currentUser, PERMISSIONS.CREATE_PURCHASE_ORDER) && <MenuLink href="/dashboard/purchase-order">PO</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_PURCHASE_INVOICE) && <MenuLink href="/dashboard/purchase-invoice">Purchase</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_SALES_INVOICE) && <MenuLink href="/dashboard/sales-invoice">Sales</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_SALE_RETURN) && <MenuLink href="/dashboard/sale-return">Sale Return</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.CREATE_OUTWARD) && <MenuLink href="/dashboard/outward">Outward</MenuLink>}
                      <MenuLink href="/dashboard/quotation">Quotation / Estimate</MenuLink>
                      <MenuLink href="/dashboard/delivery-challan">Delivery Challan</MenuLink>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================= REPORTS ================= */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (    
          <MenuHeader title="Reports" open={openReports} onClick={() => setOpenReports(!openReports)} />)}
          {openReports && (
            <div className="ml-2 space-y-2 border-l border-[var(--border)]">
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && (
                <SubHeader title="Financial Reports" open={openFinReports} onClick={() => setOpenFinReports(!openFinReports)} />
              )}
              {openFinReports && (
                <div className="ml-4 space-y-1">
                  {hasPermission(currentUser, PERMISSIONS.VIEW_AGEING_REPORT) && <MenuLink href="/dashboard/reports/ageing">Ageing</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_LEDGER_REPORT) && <MenuLink href="/dashboard/reports/ledger">Ledger</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT) && <MenuLink href="/dashboard/reports/trial-balance">Trial Balance</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_PROFIT_LOSS_REPORT) && isPro && <MenuLink href="/dashboard/reports/profit-loss">P&L</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_BALANCE_SHEET_REPORT) && isPro && <MenuLink href="/dashboard/reports/balance-sheet">Balance Sheet</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT) && <MenuLink href="/dashboard/reports/cash-flow">Cash Flow</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/tax-summary">Tax Summary</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/profitability">Profitability</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/annual-statements">Annual Statements</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.BUDGET_PLANNING) && <MenuLink href="/dashboard/budget">Budget Planning</MenuLink>}
                  {(hasPermission(currentUser, PERMISSIONS.RECURRING_TRANSACTIONS) || isAdmin) && <MenuLink href="/dashboard/recurring-transactions">Recurring Transactions</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.FINANCIAL_YEAR) && <MenuLink href="/dashboard/financial-year">Financial Year</MenuLink>}
                  
                </div>
              )}

              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY_REPORTS) && (
                <>
                  <SubHeader title="Inventory Reports" open={openInvReports} onClick={() => setOpenInvReports(!openInvReports)} />
                  {openInvReports && (
                    <div className="ml-4 space-y-1">
                      {hasPermission(currentUser, PERMISSIONS.VIEW_INWARD) && <MenuLink href="/dashboard/reports/inventory/inward">Inward</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_OUTWARD) && <MenuLink href="/dashboard/reports/outward">Outward</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_SALES_REPORT) && <MenuLink href="/dashboard/reports/sales">Sales</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_STOCK_LEDGER) && <MenuLink href="/dashboard/reports/stock-ledger">Stock Ledger</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_STOCK_SUMMARY) && <MenuLink href="/dashboard/reports/stock">Stock</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_LOW_STOCK) && <MenuLink href="/dashboard/reports/stock/low">Low Stock</MenuLink>}
                      {hasPermission(currentUser, PERMISSIONS.VIEW_LOCATION) && <MenuLink href="/dashboard/reports/stock/location">Location</MenuLink>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}


          {/* ================= ADMIN SETTINGS ================= */}
          {(hasPermission(currentUser, PERMISSIONS.MANAGE_USERS) || isAdmin) && (
            <div className="pt-4 mt-4 border-t border-[var(--border)]">
              <MenuHeader title="Admin Settings" open={openAdmin} onClick={() => setOpenAdmin(!openAdmin)} />
                {openAdmin && (
              <div className="ml-2 mt-2 space-y-1 border-l border-[var(--border)]">
                <MenuLink href="/dashboard/users">Users & Permissions</MenuLink>
                <MenuLink href="/dashboard/companies">Companies</MenuLink>
                <MenuLink href="/dashboard/approvals">Approvals</MenuLink>
                {hasPermission(currentUser, PERMISSIONS.BACKUP_RESTORE) && <MenuLink href="/dashboard/backup-restore">Backup & Restore</MenuLink>}
                {hasPermission(currentUser, PERMISSIONS.EMAIL_SETTINGS) && <MenuLink href="/dashboard/email-settings">Email Settings</MenuLink>}
                {(hasPermission(currentUser, PERMISSIONS.VIEW_LOGS) || isAdmin) && <MenuLink href="/dashboard/users/logs">System Logs</MenuLink>}
              </div>
              )}
            </div>
          )}

          {/* HR & PAYROLL SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_HR_PAYROLL) && (
            <>
              <SubHeader title="HR & Payroll" open={openHR} onClick={() => setOpenHR(!openHR)} />
              {openHR && (
                <div className="ml-4 space-y-1 border-l border-[var(--border)] pl-2">
                  <MenuLink href="/dashboard/employees">Employees</MenuLink>
                  <MenuLink href="/dashboard/attendance">Attendance</MenuLink>
                  <MenuLink href="/dashboard/advance">Advance Salary</MenuLink>
                  <MenuLink href="/dashboard/payroll">Payroll</MenuLink>
                </div>
              )}
            </>
          )}

          {/* CRM SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_CRM) && (
            <>
              <SubHeader title="CRM & Sales" open={openCRM} onClick={() => setOpenCRM(!openCRM)} />
              {openCRM && (
                <div className="ml-4 space-y-1 border-l border-[var(--border)] pl-2">
                  <MenuLink href="/dashboard/crm/contacts">Contacts</MenuLink>
                  <MenuLink href="/dashboard/crm/opportunities">Opportunities</MenuLink>
                  <MenuLink href="/dashboard/crm/interactions">Interactions</MenuLink>
                </div>
              )}
            </>
          )}

          {/* MULTI-CURRENCY SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_SETTINGS) && (
            <>
              <SubHeader title="Settings" open={openCurrency} onClick={() => setOpenCurrency(!openCurrency)} />
              {openCurrency && (
                <div className="ml-4 space-y-1 border-l border-[var(--border)] pl-2">
                  <MenuLink href="/dashboard/currencies">Currencies</MenuLink>
                  <MenuLink href="/dashboard/branches">Branches</MenuLink>
                  <MenuLink href="/dashboard/cost-centers">Cost Centers</MenuLink>
                  <MenuLink href="/dashboard/department-budgets">Dept Budgets</MenuLink>
                  <MenuLink href="/dashboard">Subscription</MenuLink>
                  <MenuLink href="/landing">Landing</MenuLink>
                </div>
              )}
            </>
          )}
        </nav>


        <div className="p-3 border-t border-[var(--border)] bg-[var(--panel-bg-2)]">
          <div className="px-3 py-1 mb-2 text-[10px] text-[var(--text-muted)] truncate">
            Logged as: {currentUser.email}
          </div>
          <button onClick={logout} className="w-full text-left px-3 py-2 text-[var(--danger)] hover:bg-[var(--card-bg)] rounded">
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[var(--surface)] overflow-hidden min-h-screen min-w-0">
        <div className="bg-[var(--panel-bg-2)] border-b border-[var(--border)] px-4 md:px-6 py-3 flex items-center gap-4 print:hidden">
          
          {/* HAMBURGER BUTTON */}
          <button
            className="md:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--card-bg)] rounded-lg mr-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Suspense fallback={<div className="w-full max-w-md h-10 bg-[var(--card-bg-2)] animate-pulse rounded" />}>
            <GlobalSearch />
          </Suspense>
          {currentUser?.companies && currentUser.companies.length > 0 && (
            <div className="ml-2 flex items-center gap-2">
              <select
                className="border border-[var(--border)] rounded px-2 py-1 text-xs bg-[var(--panel-bg)] text-[var(--text-primary)]"
                value={currentUser.companyId || ""}
                onChange={async (e) => {
                  const nextCompanyId = e.target.value;
                  const raw = localStorage.getItem("user");
                  if (!raw) return;
                  const parsed = JSON.parse(raw);
                  const user = parsed.user ?? parsed;

                  user.companyId = nextCompanyId;
                  const payload = parsed.user ? { ...parsed, user } : user;
                  localStorage.setItem("user", JSON.stringify(payload));

                  try {
                    await fetch("/api/companies", {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        "x-user-id": user.id,
                        "x-user-role": user.role,
                      },
                      body: JSON.stringify({ companyId: nextCompanyId, setDefault: true }),
                    });
                  } catch (err) {
                    console.error("Failed to set default company:", err);
                  }

                  window.location.reload();
                }}
              >
                {currentUser.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.code || c.id}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-[var(--text-muted)]">Default</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-4">
            <ModeToggle />
            {subInfo && (
              <div className={`text-xs px-2 py-1 rounded border ${subInfo.status === "ACTIVE" ? "border-green-600 text-green-700 bg-green-50" : "border-red-600 text-red-700 bg-red-50"}`}>
                {subInfo.plan} • {subInfo.status}
              </div>
            )}
            <div className="text-sm text-[var(--text-muted)]">
              {currentUser.name || currentUser.email}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="w-full max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

function MenuHeader({ title, open, onClick }: MenuHeaderProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer px-3 py-2 bg-[var(--panel-bg-2)] text-[var(--text-primary)] font-medium rounded flex justify-between items-center hover:bg-[var(--card-bg)] transition-all"
    >
      <span>{title}</span>
      <span className="text-[var(--text-muted)] text-xs">{open ? "â–¼" : "â–¶"}</span>
    </div>
  );
}

function SubHeader({ title, open, onClick }: SubHeaderProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer px-3 py-1 text-[var(--accent)] flex justify-between items-center hover:text-[var(--accent-strong)] transition-colors"
    >
      <span className="font-semibold tracking-wide uppercase text-[11px]">{title}</span>
      <span className="text-[10px]">{open ? "-" : "+"}</span>
    </div>
  );
}

function MenuLink({ href, children }: MenuLinkProps) {
  return (
    <Link
      href={href}
      className="block px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] rounded transition-all text-[13px]"
    >
      {children}
    </Link>
  );
}
