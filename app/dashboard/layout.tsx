"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/logout";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import GlobalSearch from "@/components/GlobalSearch";

type PermissionEntry = { permission: string } | string;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionEntry[];
  rolePermissions: PermissionEntry[];
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
  const [openAdmin, setopenAdmin] =useState(false)

  // MOBILE MENU STATE
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        setReady(true);
      } catch (err) {
        console.error("Failed to fetch current user permissions:", err);
        setCurrentUser(u);
        setReady(true);
      }
    };

    loadFreshPermissions();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="animate-pulse text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-red-500 font-bold text-lg">Session expired.</div>
        <button onClick={logout} className="mt-4 text-blue-600 underline">
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 text-sm font-sans relative">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-64 bg-black text-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* ---- HEADER ---- */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="font-semibold text-white uppercase tracking-wider">
            US Traders
          </div>
          <div className="text-[10px] text-gray-400">
            Business Management System
          </div>
        </div>

        <nav className="p-3 space-y-2 overflow-y-auto flex-1 pb-24">

          {/* ================= FORMS ================= */}
          <MenuHeader title="Forms" open={openForms} onClick={() => setOpenForms(!openForms)} />

          {openForms && (
            <div className="ml-2 space-y-2 border-l border-gray-800">

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
                      <MenuLink href="/dashboard/phase1-guide">📖 Complete Guide</MenuLink>
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
                  <MenuLink href="/dashboard/contra">💱 Contra Entry</MenuLink>
                  <MenuLink href="/dashboard/advance-payment">💰 Advance Payment</MenuLink>
                  <MenuLink href="/dashboard/petty-cash">💵 Petty Cash</MenuLink>
                  <MenuLink href="/dashboard/credit-note">📝 Credit Notes</MenuLink>
                  <MenuLink href="/dashboard/debit-note">📋 Debit Notes</MenuLink>
                  <MenuLink href="/dashboard/fixed-assets">🏢 Fixed Assets</MenuLink>
                  <MenuLink href="/dashboard/loans">🏦 Loans</MenuLink>
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
            <div className="ml-2 space-y-2 border-l border-gray-800">
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && (
                <SubHeader title="Financial Reports" open={openFinReports} onClick={() => setOpenFinReports(!openFinReports)} />
              )}
              {openFinReports && (
                <div className="ml-4 space-y-1">
                  {hasPermission(currentUser, PERMISSIONS.VIEW_AGEING_REPORT) && <MenuLink href="/dashboard/reports/ageing">Ageing</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_LEDGER_REPORT) && <MenuLink href="/dashboard/reports/ledger">Ledger</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT) && <MenuLink href="/dashboard/reports/trial-balance">Trial Balance</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_PROFIT_LOSS_REPORT) && <MenuLink href="/dashboard/reports/profit-loss">P&L</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_BALANCE_SHEET_REPORT) && <MenuLink href="/dashboard/reports/balance-sheet">Balance Sheet</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT) && <MenuLink href="/dashboard/reports/cash-flow">Cash Flow</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/tax-summary">Tax Summary</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/profitability">Profitability</MenuLink>}
                  {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <MenuLink href="/dashboard/reports/annual-statements">Annual Statements</MenuLink>}
                  <div className="ml-4 space-y-1 mt-2">
                    {hasPermission(currentUser, PERMISSIONS.BUDGET_PLANNING) && <MenuLink href="/dashboard/budget">Budget Planning</MenuLink>}
                    {hasPermission(currentUser, PERMISSIONS.RECURRING_TRANSACTIONS) && <MenuLink href="/dashboard/recurring-transactions">Recurring Transactions</MenuLink>}
                    {hasPermission(currentUser, PERMISSIONS.FINANCIAL_YEAR) && <MenuLink href="/dashboard/financial-year">Financial Year</MenuLink>}
                  </div>
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
          {hasPermission(currentUser, PERMISSIONS.MANAGE_USERS) && (
            <div className="pt-4 mt-4 border-t border-gray-800">
              <MenuHeader title="Admin Settings" open={openAdmin} onClick={() => setopenAdmin(!openAdmin)} />
                {openAdmin && (
              <div className="ml-2 mt-2 space-y-1 border-l border-gray-800">
                <MenuLink href="/dashboard/users">👥 Users & Permissions</MenuLink>
                {hasPermission(currentUser, PERMISSIONS.BACKUP_RESTORE) && <MenuLink href="/dashboard/backup-restore">💾 Backup & Restore</MenuLink>}
                {hasPermission(currentUser, PERMISSIONS.EMAIL_SETTINGS) && <MenuLink href="/dashboard/email-settings">✉️ Email Settings</MenuLink>}
                {hasPermission(currentUser, PERMISSIONS.VIEW_LOGS) && <MenuLink href="/dashboard/users/logs">📋 System Logs</MenuLink>}
              </div>
              )}
            </div>
          )}

          {/* HR & PAYROLL SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_HR_PAYROLL) && (
            <>
              <SubHeader title="HR & Payroll" open={openHR} onClick={() => setOpenHR(!openHR)} />
              {openHR && (
                <div className="ml-4 space-y-1 border-l border-gray-800 pl-2">
                  <MenuLink href="/dashboard/employees">👥 Employees</MenuLink>
                  <MenuLink href="/dashboard/attendance">📋 Attendance</MenuLink>
                  <MenuLink href="/dashboard/advance">💸 Advance Salary</MenuLink>
                  <MenuLink href="/dashboard/payroll">💰 Payroll</MenuLink>
                </div>
              )}
            </>
          )}

          {/* CRM SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_CRM) && (
            <>
              <SubHeader title="CRM & Sales" open={openCRM} onClick={() => setOpenCRM(!openCRM)} />
              {openCRM && (
                <div className="ml-4 space-y-1 border-l border-gray-800 pl-2">
                  <MenuLink href="/dashboard/crm/contacts">📇 Contacts</MenuLink>
                  <MenuLink href="/dashboard/crm/opportunities">💼 Opportunities</MenuLink>
                  <MenuLink href="/dashboard/crm/interactions">📞 Interactions</MenuLink>
                </div>
              )}
            </>
          )}

          {/* MULTI-CURRENCY SECTION */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_SETTINGS) && (
            <>
              <SubHeader title="Settings" open={openCurrency} onClick={() => setOpenCurrency(!openCurrency)} />
              {openCurrency && (
                <div className="ml-4 space-y-1 border-l border-gray-800 pl-2">
                  <MenuLink href="/dashboard/currencies">💱 Currencies</MenuLink>
                </div>
              )}
            </>
          )}
        </nav>


        <div className="p-3 border-t border-gray-700 bg-gray-950">
          <div className="px-3 py-1 mb-2 text-[10px] text-gray-500 truncate">
            Logged as: {currentUser.email}
          </div>
          <button onClick={logout} className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/20 rounded">
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white overflow-hidden min-h-screen">
        <div className="bg-gray-50 border-b px-4 md:px-6 py-3 flex items-center gap-4 print:hidden">
          
          {/* HAMBURGER BUTTON */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <Suspense fallback={<div className="w-full max-w-md h-10 bg-gray-200 animate-pulse rounded" />}>
            <GlobalSearch />
          </Suspense>
          <div className="ml-auto text-sm text-gray-600">
            {currentUser.name || currentUser.email}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function MenuHeader({ title, open, onClick }: MenuHeaderProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer px-3 py-2 bg-gray-900 text-gray-100 font-medium rounded flex justify-between items-center hover:bg-gray-800 transition-all"
    >
      <span>{title}</span>
      <span className="text-gray-500 text-xs">{open ? "▼" : "▶"}</span>
    </div>
  );
}

function SubHeader({ title, open, onClick }: SubHeaderProps) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer px-3 py-1 text-yellow-500/80 flex justify-between items-center hover:text-yellow-500 transition-colors"
    >
      <span className="font-semibold tracking-wide uppercase text-[11px]">{title}</span>
      <span className="text-[10px]">{open ? "−" : "+"}</span>
    </div>
  );
}

function MenuLink({ href, children }: MenuLinkProps) {
  return (
    <Link
      href={href}
      className="block px-3 py-1.5 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded transition-all text-[13px]"
    >
      {children}
    </Link>
  );
}
