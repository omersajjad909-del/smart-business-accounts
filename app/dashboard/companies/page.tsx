"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";

type Company = {
  id: string;
  name: string;
  code: string | null;
  isDefault: boolean;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    loadCompanies();
  }, []);

  async function loadCompanies() {
    const u = getCurrentUser();
    if (!u) return;

    try {
      // We can reuse the same API used for the switcher, or create a specific GET if needed.
      // The current GET /api/companies returns companies for the logged-in user.
      const res = await fetch("/api/companies", {
        credentials: "include",
        headers: {
          "x-user-id":   u.id,
          "x-user-role": u.role || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
        
        // Update localStorage to reflect new companies immediately
        updateStoredUser((parsed) => {
          if (parsed?.user) {
            return { ...parsed, user: { ...parsed.user, companies: data } };
          }
          return { ...parsed, companies: data };
        });
      }
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <ResponsiveContainer>
        <PageHeader title="Companies" description="Manage your business entities." />
        <Card>
          <div className="p-4 text-center text-red-500">
            Only Administrators can manage companies.
          </div>
        </Card>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <PageHeader title="Companies" description="Your business entity on FinovaOS." />

      <Card>
        <p className="text-sm text-(--text-muted)">
          Every plan covers one company. To manage a separate business, contact support.
        </p>
      </Card>

      <div className="mt-6 space-y-3">
        <h3 className="text-lg font-semibold px-1">Your Companies</h3>
        {companies.map((c) => (
          <Card key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold text-lg">{c.name}</div>
              <div className="text-sm text-(--text-muted)">
                Code: {c.code || "N/A"} {c.isDefault && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Default</span>}
              </div>
            </div>
            <div className="text-sm text-(--text-muted)">
              {c.id}
            </div>
          </Card>
        ))}
      </div>
    </ResponsiveContainer>
  );
}
