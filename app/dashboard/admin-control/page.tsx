"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, PageHeader, ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button, FormActions, FormField, Input, ResponsiveForm, Select } from "@/components/ui/ResponsiveForm";

type Branch = { id: string; code: string; name: string; city?: string | null; isActive: boolean };
type UserRow = { id: string; name: string; email: string; role: string; active: boolean };
type RoleRow = { role: string; permissions: string[] };
type CompanyRow = { name: string; country?: string | null; baseCurrency?: string | null; plan?: string | null };
type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  invoiceTemplate: "classic" | "compact" | "modern";
  receiptTemplate: "standard" | "mart" | "restaurant";
  defaultOutput: "pdf" | "browser-print";
  showLogo: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showTaxNumber: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
  thermalFontSize: "sm" | "md" | "lg";
};
type AdminControlSettings = { branchAssignments: Record<string, string[]>; printPreferences: PrintPreferences };

const DEFAULT_PRINT: PrintPreferences = {
  paperSize: "A4",
  invoiceTemplate: "classic",
  receiptTemplate: "standard",
  defaultOutput: "pdf",
  showLogo: true,
  showPhone: true,
  showAddress: true,
  showTaxNumber: true,
  logoUrl: "",
  headerNote: "",
  footerNote: "Thank you for your business.",
  thermalFontSize: "md",
};

const COUNTRIES = ["Pakistan", "United States", "United Kingdom", "United Arab Emirates", "Saudi Arabia", "Canada", "Australia", "Singapore"];
const CURRENCIES = ["USD", "PKR", "GBP", "EUR", "AED", "SAR", "CAD", "AUD", "SGD"];

export default function AdminControlPage() {
  const me = getCurrentUser();
  const isAdmin = me?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [companyForm, setCompanyForm] = useState({ companyName: "", country: "", baseCurrency: "" });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState({ id: "", code: "", name: "", city: "", isActive: true });
  const [branchSaving, setBranchSaving] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [settings, setSettings] = useState<AdminControlSettings>({ branchAssignments: {}, printPreferences: DEFAULT_PRINT });

  const availablePermissions = useMemo(() => Object.values(PERMISSIONS), []);

  async function loadAll() {
    setLoading(true);
    try {
      const [companyRes, branchRes, userRes, roleRes, settingsRes] = await Promise.all([
        fetch("/api/me/company"),
        fetch("/api/branches"),
        fetch("/api/users"),
        fetch("/api/admin/roles"),
        fetch("/api/company/admin-control"),
      ]);
      const companyData = companyRes.ok ? await companyRes.json() : null;
      const branchData = branchRes.ok ? await branchRes.json() : [];
      const userData = userRes.ok ? await userRes.json() : [];
      const roleData = roleRes.ok ? await roleRes.json() : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : null;

      setCompany(companyData);
      setCompanyForm({
        companyName: companyData?.name || "",
        country: companyData?.country || "",
        baseCurrency: companyData?.baseCurrency || "USD",
      });
      setBranches(Array.isArray(branchData) ? branchData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setSettings({
        branchAssignments: settingsData?.branchAssignments || {},
        printPreferences: { ...DEFAULT_PRINT, ...(settingsData?.printPreferences || {}) },
      });

      const firstRole = Array.isArray(roleData) && roleData.length > 0 ? roleData[0] : null;
      if (firstRole?.role) {
        setSelectedRole(firstRole.role);
        setRolePermissions(firstRole.permissions || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) loadAll();
    else setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    const found = roles.find((role) => role.role === selectedRole);
    setRolePermissions(found?.permissions || []);
  }, [roles, selectedRole]);

  function flash(text: string, ok = true) {
    setMessage({ text, ok });
    window.setTimeout(() => setMessage(null), 3000);
  }

  async function saveCompanyAndPrint() {
    setSaving(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        fetch("/api/company/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(companyForm),
        }),
        fetch("/api/company/admin-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ printPreferences: settings.printPreferences }),
        }),
      ]);
      if (!profileRes.ok || !settingsRes.ok) throw new Error("Failed to save admin settings");
      flash("Company profile and print settings saved.");
      await loadAll();
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to save settings", false);
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch(e: React.FormEvent) {
    e.preventDefault();
    setBranchSaving(true);
    try {
      const res = await fetch("/api/branches", {
        method: branchForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchForm.id ? branchForm : { code: branchForm.code, name: branchForm.name, city: branchForm.city, isActive: branchForm.isActive }),
      });
      if (!res.ok) throw new Error("Failed to save branch");
      setBranchForm({ id: "", code: "", name: "", city: "", isActive: true });
      flash(branchForm.id ? "Branch updated." : "Branch created.");
      await loadAll();
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to save branch", false);
    } finally {
      setBranchSaving(false);
    }
  }

  async function deleteBranch(id: string) {
    if (!window.confirm("Delete this branch?")) return;
    const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      flash("Branch deleted.");
      await loadAll();
    } else {
      flash("Unable to delete branch", false);
    }
  }

  async function saveBranchAssignments() {
    try {
      const res = await fetch("/api/company/admin-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchAssignments: settings.branchAssignments }),
      });
      if (!res.ok) throw new Error("Failed to save branch access");
      flash("Branch access updated for team.");
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to save branch access", false);
    }
  }

  async function saveRolePermissions() {
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, permissions: rolePermissions }),
      });
      if (!res.ok) throw new Error("Failed to save role permissions");
      flash(`${selectedRole} permissions updated.`);
      await loadAll();
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to save role permissions", false);
    }
  }

  function toggleUserBranch(userId: string, branchId: string) {
    setSettings((current) => {
      const existing = current.branchAssignments[userId] || [];
      const next = existing.includes(branchId) ? existing.filter((item) => item !== branchId) : [...existing, branchId];
      return { ...current, branchAssignments: { ...current.branchAssignments, [userId]: next } };
    });
  }

  function toggleRolePermission(permission: string) {
    setRolePermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  }

  if (!isAdmin) {
    return (
      <ResponsiveContainer className="py-8">
        <Card>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Admin access required</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">This page is only accessible to account owners and admins.</p>
        </Card>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer className="space-y-6 py-6">
      <PageHeader title="Admin Control Center" description="Manage branches, team access, permissions, branding and print formats — all in one place." />

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <Card><div className="text-sm text-[var(--text-muted)]">Loading admin controls...</div></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Plan</div><div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{company?.plan || "STARTER"}</div></Card>
            <Card><div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Branches</div><div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{branches.length}</div></Card>
            <Card><div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Users</div><div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{users.length}</div></Card>
            <Card><div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Assigned Users</div><div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{Object.values(settings.branchAssignments).filter((items) => items.length > 0).length}</div></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Company & Print Control</h2>
                  <p className="text-sm text-[var(--text-muted)]">Set your logo, branding text, invoice/receipt format and default output options.</p>
                </div>
                <Button onClick={saveCompanyAndPrint} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Company Name"><Input value={companyForm.companyName} onChange={(e) => setCompanyForm((s) => ({ ...s, companyName: e.target.value }))} /></FormField>
                <FormField label="Country"><Select value={companyForm.country} onChange={(e) => setCompanyForm((s) => ({ ...s, country: e.target.value }))}><option value="">Select country</option>{COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}</Select></FormField>
                <FormField label="Base Currency"><Select value={companyForm.baseCurrency} onChange={(e) => setCompanyForm((s) => ({ ...s, baseCurrency: e.target.value }))}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</Select></FormField>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <FormField label="Logo URL"><Input placeholder="https://..." value={settings.printPreferences.logoUrl} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: e.target.value } }))} /></FormField>
                <FormField label="Invoice Template"><Select value={settings.printPreferences.invoiceTemplate} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, invoiceTemplate: e.target.value as PrintPreferences["invoiceTemplate"] } }))}><option value="classic">Classic</option><option value="compact">Compact</option><option value="modern">Modern</option></Select></FormField>
                <FormField label="Receipt Template"><Select value={settings.printPreferences.receiptTemplate} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, receiptTemplate: e.target.value as PrintPreferences["receiptTemplate"] } }))}><option value="standard">Standard</option><option value="mart">Mart / POS</option><option value="restaurant">Restaurant</option></Select></FormField>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <FormField label="Paper Size"><Select value={settings.printPreferences.paperSize} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, paperSize: e.target.value as PrintPreferences["paperSize"] } }))}><option value="A4">A4</option><option value="THERMAL_80MM">Thermal 80mm</option><option value="THERMAL_58MM">Thermal 58mm</option></Select></FormField>
                <FormField label="Default Output"><Select value={settings.printPreferences.defaultOutput} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, defaultOutput: e.target.value as PrintPreferences["defaultOutput"] } }))}><option value="pdf">PDF</option><option value="browser-print">Browser Print</option></Select></FormField>
                <FormField label="Thermal Font Size"><Select value={settings.printPreferences.thermalFontSize} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, thermalFontSize: e.target.value as PrintPreferences["thermalFontSize"] } }))}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></Select></FormField>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  ["showLogo", "Print pe logo show ho"],
                  ["showPhone", "Phone number show ho"],
                  ["showAddress", "Address show ho"],
                  ["showTaxNumber", "Tax / NTN label show ho"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    <input type="checkbox" checked={Boolean(settings.printPreferences[key as keyof PrintPreferences])} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, [key]: e.target.checked } }))} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FormField label="Header Note"><Input value={settings.printPreferences.headerNote} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, headerNote: e.target.value } }))} placeholder="Short note shown at the top of invoices" /></FormField>
                <FormField label="Footer Note"><Input value={settings.printPreferences.footerNote} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, footerNote: e.target.value } }))} placeholder="Thanks note / bank details" /></FormField>
              </div>
            </Card>

            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick Access</h2>
                <p className="text-sm text-[var(--text-muted)]">Quick links to deep settings and existing modules.</p>
              </div>
              <div className="space-y-3">
                {[
                  { href: "/dashboard/users", label: "Users & Invitations", desc: "Add new users and onboard your team." },
                  { href: "/dashboard/roles-permissions", label: "Detailed Roles Screen", desc: "Granular role and permission management." },
                  { href: "/dashboard/company-profile", label: "Company Profile", desc: "View subscription and company summary." },
                  { href: "/dashboard/business-settings", label: "Business Type", desc: "Switch industry-specific modules on or off." },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 no-underline transition hover:border-[var(--accent)]">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{item.desc}</div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[.95fr_1.05fr]">
            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Branches</h2>
                <p className="text-sm text-[var(--text-muted)]">Manage head office, outlets, warehouses and city branches.</p>
              </div>

              <ResponsiveForm onSubmit={saveBranch}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Branch Code" required><Input value={branchForm.code} onChange={(e) => setBranchForm((s) => ({ ...s, code: e.target.value }))} required /></FormField>
                  <FormField label="Branch Name" required><Input value={branchForm.name} onChange={(e) => setBranchForm((s) => ({ ...s, name: e.target.value }))} required /></FormField>
                  <FormField label="City"><Input value={branchForm.city} onChange={(e) => setBranchForm((s) => ({ ...s, city: e.target.value }))} /></FormField>
                  <FormField label="Status"><Select value={branchForm.isActive ? "active" : "inactive"} onChange={(e) => setBranchForm((s) => ({ ...s, isActive: e.target.value === "active" }))}><option value="active">Active</option><option value="inactive">Inactive</option></Select></FormField>
                </div>
                <FormActions>
                  {branchForm.id && <Button type="button" variant="secondary" onClick={() => setBranchForm({ id: "", code: "", name: "", city: "", isActive: true })}>Cancel Edit</Button>}
                  <Button type="submit" disabled={branchSaving}>{branchSaving ? "Saving..." : branchForm.id ? "Update Branch" : "Add Branch"}</Button>
                </FormActions>
              </ResponsiveForm>

              <div className="mt-6 space-y-3">
                {branches.map((branch) => (
                  <div key={branch.id} className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{branch.code} · {branch.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{branch.city || "No city"} · {branch.isActive ? "Active" : "Inactive"}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" onClick={() => setBranchForm({ id: branch.id, code: branch.code, name: branch.name, city: branch.city || "", isActive: branch.isActive })}>Edit</Button>
                      <Button type="button" variant="danger" onClick={() => deleteBranch(branch.id)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Branch Users & Access</h2>
                  <p className="text-sm text-[var(--text-muted)]">Assign allowed branches to each user. Admin always has access to all branches.</p>
                </div>
                <Button onClick={saveBranchAssignments}>Save Access</Button>
              </div>

              <div className="space-y-4">
                {users.map((user) => {
                  const assigned = settings.branchAssignments[user.id] || [];
                  return (
                    <div key={user.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{user.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{user.email} · {user.role} · {user.active ? "Active" : "Inactive"}</div>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{user.role === "ADMIN" ? "Admin defaults to full access" : `${assigned.length || 0} branch(es) assigned`}</div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {branches.map((branch) => {
                          const checked = user.role === "ADMIN" ? true : assigned.includes(branch.id);
                          return (
                            <label key={branch.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${checked ? "border-[var(--accent)] bg-[color:rgba(99,102,241,.14)] text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
                              <input type="checkbox" disabled={user.role === "ADMIN"} checked={checked} onChange={() => toggleUserBranch(user.id, branch.id)} />
                              {branch.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Role Permissions</h2>
                <p className="text-sm text-[var(--text-muted)]">Owner/admin yahan se poori company ke default permissions set kar sakta hai.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setRolePermissions(availablePermissions)}>Select All</Button>
                <Button type="button" variant="secondary" onClick={() => setRolePermissions([])}>Clear</Button>
                <Button type="button" onClick={saveRolePermissions}>Save Role</Button>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              {["ADMIN", "ACCOUNTANT", "VIEWER"].map((roleName) => (
                <button key={roleName} type="button" onClick={() => setSelectedRole(roleName)} className={`rounded-full border px-4 py-2 text-sm transition ${selectedRole === roleName ? "border-[var(--accent)] bg-[color:rgba(99,102,241,.14)] text-[var(--text-primary)]" : "border-[var(--border)] text-[var(--text-muted)]"}`}>
                  {roleName}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availablePermissions.map((permission) => (
                <label key={permission} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]">
                  <input type="checkbox" checked={rolePermissions.includes(permission)} onChange={() => toggleRolePermission(permission)} />
                  <span>{permission}</span>
                </label>
              ))}
            </div>
          </Card>
        </>
      )}
    </ResponsiveContainer>
  );
}
