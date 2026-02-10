"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { ResponsiveForm, FormField, FormActions, Input, Button } from "@/components/ui/ResponsiveForm";
import { getCurrentUser } from "@/lib/auth";

type Company = {
  id: string;
  name: string;
  code: string | null;
  isDefault: boolean;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
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
        headers: {
          "x-user-id": u.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role, // API requires ADMIN role usually, let's hope user is admin
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm({ name: "", code: "" });
        loadCompanies();
        // Force reload to update the company switcher in the header
        window.location.reload(); 
      } else {
        const err = await res.json();
        alert("Error: " + (err.error || "Failed to create company"));
      }
    } catch (error) {
      console.error("Error creating company", error);
      alert("Failed to create company");
    } finally {
      setLoading(false);
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
      <PageHeader title="Companies" description="Create and manage multiple business entities (Companies)." />
      
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Create New Company</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Add a new company to manage its accounts, inventory, and employees separately.
          </p>
        </div>
        
        <ResponsiveForm onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company Name">
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. US Traders (Lahore)"
                required 
              />
            </FormField>
            <FormField label="Company Code (Optional)">
              <Input 
                value={form.code} 
                onChange={(e) => setForm({ ...form, code: e.target.value })} 
                placeholder="e.g. LHR-01"
              />
            </FormField>
          </div>
          <FormActions>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Company"}
            </Button>
          </FormActions>
        </ResponsiveForm>
      </Card>

      <div className="mt-6 space-y-3">
        <h3 className="text-lg font-semibold px-1">Your Companies</h3>
        {companies.map((c) => (
          <Card key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold text-lg">{c.name}</div>
              <div className="text-sm text-[var(--text-muted)]">
                Code: {c.code || "N/A"} {c.isDefault && <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Default</span>}
              </div>
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {c.id}
            </div>
          </Card>
        ))}
      </div>
    </ResponsiveContainer>
  );
}
