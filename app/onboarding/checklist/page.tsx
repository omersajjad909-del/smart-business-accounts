"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { getCurrentUser } from "@/lib/auth";

type Status = {
  company: boolean;
  branches: boolean;
  costCenters: boolean;
  accounts: boolean;
  items: boolean;
  openingBalances: boolean;
  proUpgrade: boolean;
};

type Counts = {
  companies: number;
  branches: number;
  costCenters: number;
  accounts: number;
  items: number;
  openingAccounts: number;
};

export default function SetupChecklistPage() {
  const [status, setStatus] = useState<Status>({
    company: false,
    branches: false,
    costCenters: false,
    accounts: false,
    items: false,
    openingBalances: false,
    proUpgrade: false,
  });
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({
    companies: 0,
    branches: 0,
    costCenters: 0,
    accounts: 0,
    items: 0,
    openingAccounts: 0,
  });

  useEffect(() => {
    const u = getCurrentUser();
    const headers: Record<string, string> = {};
    if (u?.role) headers["x-user-role"] = u.role;
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.companyId) headers["x-company-id"] = u.companyId;

    async function load() {
      try {
        const [
          companiesRes,
          branchesRes,
          centersRes,
          accountsRes,
          itemsRes,
          meCompanyRes,
        ] = await Promise.all([
          fetch("/api/companies", { headers }),
          fetch("/api/branches"),
          fetch("/api/cost-centers"),
          fetch("/api/accounts", { headers }),
          fetch("/api/items-new", { headers }),
          fetch("/api/me/company"),
        ]);

        const companies = await companiesRes.json();
        const branches = await branchesRes.json();
        const centers = await centersRes.json();
        const accounts = await accountsRes.json();
        const items = await itemsRes.json();
        const meCompany = await meCompanyRes.json();

        const hasCompanies = Array.isArray(companies) && companies.length > 0;
        const hasBranches = Array.isArray(branches) && branches.length > 0;
        const hasCenters = Array.isArray(centers) && centers.length > 0;
        const hasAccounts = Array.isArray(accounts) && accounts.length > 0;
        const hasItems = Array.isArray(items) && items.length > 0;
        const hasOpening =
          Array.isArray(accounts) &&
          accounts.some(
            (a: any) => Number(a.openDebit || 0) > 0 || Number(a.openCredit || 0) > 0
          );
        const openingCount =
          Array.isArray(accounts)
            ? accounts.filter(
                (a: any) => Number(a.openDebit || 0) > 0 || Number(a.openCredit || 0) > 0
              ).length
            : 0;
        const hasPro =
          meCompany &&
          typeof meCompany === "object" &&
          (meCompany.plan === "PRO" || meCompany.subscriptionStatus === "active");

        setStatus({
          company: hasCompanies,
          branches: hasBranches,
          costCenters: hasCenters,
          accounts: hasAccounts,
          items: hasItems,
          openingBalances: hasOpening,
          proUpgrade: !!hasPro,
        });
        setCounts({
          companies: hasCompanies ? companies.length : 0,
          branches: hasBranches ? branches.length : 0,
          costCenters: hasCenters ? centers.length : 0,
          accounts: hasAccounts ? accounts.length : 0,
          items: hasItems ? items.length : 0,
          openingAccounts: openingCount,
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const items = [
    { key: "company", title: "Create Company", href: "/dashboard/companies" },
    { key: "branches", title: "Add Branches", href: "/dashboard/branches" },
    { key: "costCenters", title: "Set Cost Centers", href: "/dashboard/cost-centers" },
    { key: "accounts", title: "Create Accounts", href: "/dashboard/accounts" },
    { key: "items", title: "Add Items", href: "/dashboard/items-new" },
    { key: "openingBalances", title: "Import Opening Balances", href: "/dashboard/opening-balances" },
    { key: "proUpgrade", title: "Upgrade to PRO (Reporting & Reconciliation)", href: "/onboarding/choose-plan" },
  ] as const;

  return (
    <ResponsiveContainer>
      <PageHeader title="First-time Setup Checklist" description="Complete these steps to get started professionally." />
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((i) => {
          const done = status[i.key as keyof Status];
          return (
            <Card key={i.title} className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{i.title}</div>
                <div className="mt-1">
                  <span
                    className={[
                      "inline-block text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide",
                      done ? "bg-green-200 text-green-900" : "bg-gray-200 text-gray-700",
                    ].join(" ")}
                  >
                    {loading ? "Checking…" : done ? "Completed" : "Pending"}
                  </span>
                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                    {loading
                      ? ""
                      : i.key === "company"
                      ? `${counts.companies} companies`
                      : i.key === "branches"
                      ? `${counts.branches} branches`
                      : i.key === "costCenters"
                      ? `${counts.costCenters} centers`
                      : i.key === "accounts"
                      ? `${counts.accounts} accounts`
                      : i.key === "items"
                      ? `${counts.items} items`
                      : i.key === "openingBalances"
                      ? `${counts.openingAccounts} with opening`
                      : ""}
                  </span>
                </div>
              </div>
              <Link href={i.href} className="px-3 py-1.5 bg-[var(--accent)] text-[#0b1324] rounded-md font-semibold">
                Open
              </Link>
            </Card>
          );
        })}
      </div>
    </ResponsiveContainer>
  );
}
