"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { COUNTRIES as ALL_COUNTRIES, sortCountries } from "@/lib/countries";
import { CURRENCY_LABEL, SUPPORTED_CURRENCIES, currencyByCountry } from "@/lib/currency";
import { Card, PageHeader, ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button, FormActions, FormField, Input, ResponsiveForm, Select } from "@/components/ui/ResponsiveForm";

type Branch = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  isActive: boolean;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geoSource?: "exact" | "manual" | "country" | "unset";
};
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
type TaxProfile = {
  taxIdLabel: string;
  taxIdValue: string;
  vatNumber: string;
  gstNumber: string;
  registrationNote: string;
};
type CompanyIdentityProfile = {
  legalName: string;
  legalAddress: string;
  city: string;
  state: string;
  postalCode: string;
  website: string;
  latitude: number | null;
  longitude: number | null;
  geoSource: "exact" | "manual" | "country" | "unset";
};
type InvoiceContactProfile = {
  contactName: string;
  email: string;
  phone: string;
  supportEmail: string;
  supportPhone: string;
};
type BankDetailsProfile = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  branchName: string;
  branchCode: string;
};
type BranchGeoProfile = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  geoSource: "exact" | "manual" | "country" | "unset";
};
type AdminControlSettings = {
  branchAssignments: Record<string, string[]>;
  printPreferences: PrintPreferences;
  taxProfile: TaxProfile;
  companyIdentity: CompanyIdentityProfile;
  invoiceContact: InvoiceContactProfile;
  bankDetails: BankDetailsProfile;
  branchLocations: Record<string, BranchGeoProfile>;
};
type BackupRow = { id: string; fileName: string; status: string; createdAt: string };

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
const DEFAULT_TAX_PROFILE: TaxProfile = {
  taxIdLabel: "NTN / Tax ID",
  taxIdValue: "",
  vatNumber: "",
  gstNumber: "",
  registrationNote: "",
};
const DEFAULT_COMPANY_IDENTITY: CompanyIdentityProfile = {
  legalName: "",
  legalAddress: "",
  city: "",
  state: "",
  postalCode: "",
  website: "",
  latitude: null,
  longitude: null,
  geoSource: "unset",
};
const DEFAULT_INVOICE_CONTACT: InvoiceContactProfile = {
  contactName: "",
  email: "",
  phone: "",
  supportEmail: "",
  supportPhone: "",
};
const DEFAULT_BANK_DETAILS: BankDetailsProfile = {
  bankName: "",
  accountTitle: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  branchName: "",
  branchCode: "",
};
const DEFAULT_BRANCH_GEO: BranchGeoProfile = {
  address: "",
  latitude: null,
  longitude: null,
  geoSource: "unset",
};
const CURRENCIES = [...SUPPORTED_CURRENCIES];

export default function AdminControlPage() {
  const me = getCurrentUser();
  const isAdmin = me?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [companyForm, setCompanyForm] = useState({ companyName: "", country: "", baseCurrency: "" });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true });
  const [branchSaving, setBranchSaving] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [settings, setSettings] = useState<AdminControlSettings>({
    branchAssignments: {},
    printPreferences: DEFAULT_PRINT,
    taxProfile: DEFAULT_TAX_PROFILE,
    companyIdentity: DEFAULT_COMPANY_IDENTITY,
    invoiceContact: DEFAULT_INVOICE_CONTACT,
    bankDetails: DEFAULT_BANK_DETAILS,
    branchLocations: {},
  });
  const [opsLoading, setOpsLoading] = useState<null | "backup" | "download">(null);

  const availablePermissions = useMemo(() => Object.values(PERMISSIONS), []);
  const countryOptions = useMemo(() => sortCountries(ALL_COUNTRIES).map((country) => country.name), []);

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
      const branchLocationMap = settingsData?.branchLocations || {};
      setBranches(
        Array.isArray(branchData)
          ? branchData.map((branch: Branch) => ({
              ...branch,
              address: branchLocationMap[branch.id]?.address || "",
              latitude: typeof branchLocationMap[branch.id]?.latitude === "number" ? branchLocationMap[branch.id].latitude : null,
              longitude: typeof branchLocationMap[branch.id]?.longitude === "number" ? branchLocationMap[branch.id].longitude : null,
              geoSource: branchLocationMap[branch.id]?.geoSource || "unset",
            }))
          : []
      );
      setUsers(Array.isArray(userData) ? userData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setSettings({
        branchAssignments: settingsData?.branchAssignments || {},
        printPreferences: { ...DEFAULT_PRINT, ...(settingsData?.printPreferences || {}) },
        taxProfile: { ...DEFAULT_TAX_PROFILE, ...(settingsData?.taxProfile || {}) },
        companyIdentity: { ...DEFAULT_COMPANY_IDENTITY, ...(settingsData?.companyIdentity || {}) },
        invoiceContact: { ...DEFAULT_INVOICE_CONTACT, ...(settingsData?.invoiceContact || {}) },
        bankDetails: { ...DEFAULT_BANK_DETAILS, ...(settingsData?.bankDetails || {}) },
        branchLocations: settingsData?.branchLocations || {},
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

  function updateCompanyCountry(countryName: string) {
    const match = ALL_COUNTRIES.find((country) => country.name === countryName);
    const nextCurrency = match ? currencyByCountry(match.code) : companyForm.baseCurrency;
    setCompanyForm((current) => ({
      ...current,
      country: countryName,
      baseCurrency: match ? nextCurrency : current.baseCurrency,
    }));
  }

  async function getBrowserLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      throw new Error("Browser geolocation is not available.");
    }
    return await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
        }),
        () => reject(new Error("Unable to read current location.")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
      );
    });
  }

  async function useCurrentCompanyLocation() {
    try {
      const coords = await getBrowserLocation();
      setSettings((current) => ({
        ...current,
        companyIdentity: {
          ...current.companyIdentity,
          latitude: coords.latitude,
          longitude: coords.longitude,
          geoSource: "exact",
        },
      }));
      flash("Current HQ location captured. Save settings to keep it.");
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to capture current location.", false);
    }
  }

  async function useCurrentBranchLocation() {
    try {
      const coords = await getBrowserLocation();
      setBranchForm((current) => ({
        ...current,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6),
      }));
      flash("Current branch location captured. Save branch to keep it.");
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to capture branch location.", false);
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Please choose an image file for the logo.", false);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        flash("Unable to read logo file.", false);
        return;
      }
      setSettings((current) => ({
        ...current,
        printPreferences: {
          ...current.printPreferences,
          logoUrl: result,
        },
      }));
      flash("Logo uploaded. Save settings to keep it.");
    };
    reader.onerror = () => flash("Unable to upload logo file.", false);
    reader.readAsDataURL(file);
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
          body: JSON.stringify({
            printPreferences: settings.printPreferences,
            taxProfile: settings.taxProfile,
            companyIdentity: settings.companyIdentity,
            invoiceContact: settings.invoiceContact,
            bankDetails: settings.bankDetails,
            branchLocations: settings.branchLocations,
          }),
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

  async function createInstantBackup() {
    setOpsLoading("backup");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": "ADMIN", ...(me?.id ? { "x-user-id": me.id } : {}) },
        body: JSON.stringify({ backupType: "FULL" }),
      });
      if (!res.ok) throw new Error("Unable to create backup");
      flash("Instant backup created successfully.");
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to create backup", false);
    } finally {
      setOpsLoading(null);
    }
  }

  async function downloadLatestBackup() {
    setOpsLoading("download");
    try {
      const listRes = await fetch("/api/backup", {
        headers: { "x-user-role": "ADMIN" },
      });
      if (!listRes.ok) throw new Error("Unable to load backups");
      const backups = (await listRes.json()) as BackupRow[];
      const latestCompleted = backups.find((row) => String(row.status).toUpperCase() === "COMPLETED");
      if (!latestCompleted) throw new Error("No completed backup available yet");
      const downloadRes = await fetch(`/api/backup/download?id=${latestCompleted.id}`, {
        headers: { "x-user-role": "ADMIN" },
      });
      if (!downloadRes.ok) throw new Error("Unable to download latest backup");
      const blob = await downloadRes.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = latestCompleted.fileName || "backup.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to download backup", false);
    } finally {
      setOpsLoading(null);
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
      const savedBranch = await res.json();
      const lat = branchForm.latitude.trim() ? Number(branchForm.latitude) : null;
      const lon = branchForm.longitude.trim() ? Number(branchForm.longitude) : null;
      if (savedBranch?.id) {
        await fetch("/api/company/admin-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            branchLocations: {
              [savedBranch.id]: {
                ...DEFAULT_BRANCH_GEO,
                address: branchForm.address.trim(),
                latitude: Number.isFinite(lat) ? lat : null,
                longitude: Number.isFinite(lon) ? lon : null,
                geoSource: Number.isFinite(lat) && Number.isFinite(lon) ? "manual" : "unset",
              },
            },
          }),
        });
      }
      setBranchForm({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true });
      flash(branchForm.id ? "Branch updated." : "Branch created.");
      await loadAll();
    } catch (error: unknown) {
      flash(error instanceof Error ? error.message : "Unable to save branch", false);
    } finally {
      setBranchSaving(false);
    }
  }

  async function deleteBranch(id: string) {
    if (!await confirmToast("Delete this branch?")) return;
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
                <FormField label="Country"><Select value={companyForm.country} onChange={(e) => updateCompanyCountry(e.target.value)}><option value="">Select country</option>{countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}</Select></FormField>
                <FormField label="Base Currency"><Select value={companyForm.baseCurrency} onChange={(e) => setCompanyForm((s) => ({ ...s, baseCurrency: e.target.value }))}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency} - {CURRENCY_LABEL[currency] || currency}</option>)}</Select></FormField>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <FormField label="Logo URL"><Input placeholder="https://..." value={settings.printPreferences.logoUrl} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: e.target.value } }))} /></FormField>
                <FormField label="Invoice Template"><Select value={settings.printPreferences.invoiceTemplate} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, invoiceTemplate: e.target.value as PrintPreferences["invoiceTemplate"] } }))}><option value="classic">Classic</option><option value="compact">Compact</option><option value="modern">Modern</option></Select></FormField>
                <FormField label="Receipt Template"><Select value={settings.printPreferences.receiptTemplate} onChange={(e) => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, receiptTemplate: e.target.value as PrintPreferences["receiptTemplate"] } }))}><option value="standard">Standard</option><option value="mart">Mart / POS</option><option value="restaurant">Restaurant</option></Select></FormField>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                  <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Logo Upload</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel-bg)]">
                      {settings.printPreferences.logoUrl ? (
                        <img src={settings.printPreferences.logoUrl} alt="Company logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleLogoUpload(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[color:rgba(99,102,241,.18)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--text-primary)]"
                      />
                      <div className="mt-2 text-xs text-[var(--text-muted)]">Upload PNG, JPG, or SVG-style image. You can still paste a direct URL above if you prefer.</div>
                    </div>
                    {settings.printPreferences.logoUrl && (
                      <Button type="button" variant="secondary" onClick={() => setSettings((s) => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: "" } }))}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                  <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Print Identity Notes</div>
                  <div className="text-xs text-[var(--text-muted)]">These admin fields are now ready for invoice, quotation, receipt, and print template use across the platform.</div>
                </div>
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

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Tax & Registration Profile</h3>
                  <p className="text-sm text-[var(--text-muted)]">Store the main company tax details once, then reuse them across compliance, print formats, and statutory workflows.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Primary Tax Label"><Input value={settings.taxProfile.taxIdLabel} onChange={(e) => setSettings((s) => ({ ...s, taxProfile: { ...s.taxProfile, taxIdLabel: e.target.value } }))} placeholder="NTN / Tax ID / TRN" /></FormField>
                  <FormField label="Primary Tax Number"><Input value={settings.taxProfile.taxIdValue} onChange={(e) => setSettings((s) => ({ ...s, taxProfile: { ...s.taxProfile, taxIdValue: e.target.value } }))} placeholder="Enter your main tax number" /></FormField>
                  <FormField label="VAT Number"><Input value={settings.taxProfile.vatNumber} onChange={(e) => setSettings((s) => ({ ...s, taxProfile: { ...s.taxProfile, vatNumber: e.target.value } }))} placeholder="VAT / TRN" /></FormField>
                  <FormField label="GST / Sales Tax No"><Input value={settings.taxProfile.gstNumber} onChange={(e) => setSettings((s) => ({ ...s, taxProfile: { ...s.taxProfile, gstNumber: e.target.value } }))} placeholder="GST / STRN" /></FormField>
                  <div className="md:col-span-2 xl:col-span-2">
                    <FormField label="Registration Note"><Input value={settings.taxProfile.registrationNote} onChange={(e) => setSettings((s) => ({ ...s, taxProfile: { ...s.taxProfile, registrationNote: e.target.value } }))} placeholder="Optional note for invoices, footer, or local filing instructions" /></FormField>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Company Legal Address</h3>
                  <p className="text-sm text-[var(--text-muted)]">Keep the official legal identity of the company ready for invoices, compliance docs, and print layouts.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Legal Name"><Input value={settings.companyIdentity.legalName} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, legalName: e.target.value } }))} placeholder="Registered company name" /></FormField>
                  <FormField label="Website"><Input value={settings.companyIdentity.website} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, website: e.target.value } }))} placeholder="https://yourcompany.com" /></FormField>
                  <FormField label="Postal Code"><Input value={settings.companyIdentity.postalCode} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, postalCode: e.target.value } }))} placeholder="Postal / ZIP code" /></FormField>
                  <div className="md:col-span-2 xl:col-span-3">
                    <FormField label="Legal Address"><Input value={settings.companyIdentity.legalAddress} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, legalAddress: e.target.value } }))} placeholder="Street, building, floor, full legal address" /></FormField>
                  </div>
                  <FormField label="City"><Input value={settings.companyIdentity.city} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, city: e.target.value } }))} placeholder="City" /></FormField>
                  <FormField label="State / Region"><Input value={settings.companyIdentity.state} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, state: e.target.value } }))} placeholder="State / Region / Province" /></FormField>
                  <FormField label="Latitude"><Input value={settings.companyIdentity.latitude ?? ""} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, latitude: e.target.value.trim() ? Number(e.target.value) : null, geoSource: "manual" } }))} placeholder="24.860735" /></FormField>
                  <FormField label="Longitude"><Input value={settings.companyIdentity.longitude ?? ""} onChange={(e) => setSettings((s) => ({ ...s, companyIdentity: { ...s.companyIdentity, longitude: e.target.value.trim() ? Number(e.target.value) : null, geoSource: "manual" } }))} placeholder="67.001137" /></FormField>
                  <div className="flex items-end">
                    <Button type="button" variant="secondary" onClick={useCurrentCompanyLocation}>Use Current Location</Button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Invoice Contact Details</h3>
                  <p className="text-sm text-[var(--text-muted)]">These details can be shown on customer-facing documents and support sections.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Contact Name"><Input value={settings.invoiceContact.contactName} onChange={(e) => setSettings((s) => ({ ...s, invoiceContact: { ...s.invoiceContact, contactName: e.target.value } }))} placeholder="Billing contact or accounts person" /></FormField>
                  <FormField label="Invoice Email"><Input value={settings.invoiceContact.email} onChange={(e) => setSettings((s) => ({ ...s, invoiceContact: { ...s.invoiceContact, email: e.target.value } }))} placeholder="billing@company.com" /></FormField>
                  <FormField label="Invoice Phone"><Input value={settings.invoiceContact.phone} onChange={(e) => setSettings((s) => ({ ...s, invoiceContact: { ...s.invoiceContact, phone: e.target.value } }))} placeholder="+1 555 010 200" /></FormField>
                  <FormField label="Support Email"><Input value={settings.invoiceContact.supportEmail} onChange={(e) => setSettings((s) => ({ ...s, invoiceContact: { ...s.invoiceContact, supportEmail: e.target.value } }))} placeholder="support@company.com" /></FormField>
                  <FormField label="Support Phone"><Input value={settings.invoiceContact.supportPhone} onChange={(e) => setSettings((s) => ({ ...s, invoiceContact: { ...s.invoiceContact, supportPhone: e.target.value } }))} placeholder="+1 555 010 300" /></FormField>
                </div>
              </div>

              <div className="mt-6 border-t border-[var(--border)] pt-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Bank Details For Print Templates</h3>
                  <p className="text-sm text-[var(--text-muted)]">Store default remittance and transfer details once for invoices, quotations, and formal print outputs.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Bank Name"><Input value={settings.bankDetails.bankName} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, bankName: e.target.value } }))} placeholder="Bank name" /></FormField>
                  <FormField label="Account Title"><Input value={settings.bankDetails.accountTitle} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, accountTitle: e.target.value } }))} placeholder="Account title" /></FormField>
                  <FormField label="Account Number"><Input value={settings.bankDetails.accountNumber} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, accountNumber: e.target.value } }))} placeholder="Account number" /></FormField>
                  <FormField label="IBAN"><Input value={settings.bankDetails.iban} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, iban: e.target.value } }))} placeholder="IBAN" /></FormField>
                  <FormField label="SWIFT Code"><Input value={settings.bankDetails.swiftCode} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, swiftCode: e.target.value } }))} placeholder="SWIFT / BIC" /></FormField>
                  <FormField label="Branch Name"><Input value={settings.bankDetails.branchName} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, branchName: e.target.value } }))} placeholder="Branch name" /></FormField>
                  <FormField label="Branch Code"><Input value={settings.bankDetails.branchCode} onChange={(e) => setSettings((s) => ({ ...s, bankDetails: { ...s.bankDetails, branchCode: e.target.value } }))} placeholder="Branch code" /></FormField>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick Access</h2>
                <p className="text-sm text-[var(--text-muted)]">Quick links to deep settings and existing modules.</p>
              </div>
              <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                <div className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Audit, Backup & Export</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" onClick={createInstantBackup} disabled={opsLoading !== null}>{opsLoading === "backup" ? "Creating Backup..." : "Create Instant Backup"}</Button>
                  <Button type="button" variant="secondary" onClick={downloadLatestBackup} disabled={opsLoading !== null}>{opsLoading === "download" ? "Preparing Download..." : "Download Latest Backup"}</Button>
                  <Link href="/dashboard/audit-trail" className="block rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] no-underline transition hover:border-[var(--accent)]">Open Audit Trail</Link>
                  <Link href="/dashboard/backup-restore" className="block rounded-lg border border-[var(--border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] no-underline transition hover:border-[var(--accent)]">Open Backup & Restore</Link>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { href: "/dashboard/users", label: "Users & Invitations", desc: "Add new users and onboard your team." },
                  { href: "/dashboard/roles-permissions", label: "Detailed Roles Screen", desc: "Granular role and permission management." },
                  { href: "/dashboard/company-profile", label: "Company Profile", desc: "View subscription and company summary." },
                  { href: "/dashboard/business-settings", label: "Business Type", desc: "Switch industry-specific modules on or off." },
                  { href: "/dashboard/security-access", label: "Security Access", desc: "Review login sessions, device access, and account safety." },
                  { href: "/dashboard/billing", label: "Billing & Subscription", desc: "Manage plan, invoices, and payment settings." },
                  { href: "/dashboard/reports/compliance", label: "Compliance Reports", desc: "Open tax, compliance, and statutory report views quickly." },
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
                  <div className="md:col-span-2">
                    <FormField label="Branch Address"><Input value={branchForm.address} onChange={(e) => setBranchForm((s) => ({ ...s, address: e.target.value }))} placeholder="Street, building, area" /></FormField>
                  </div>
                  <FormField label="Latitude"><Input value={branchForm.latitude} onChange={(e) => setBranchForm((s) => ({ ...s, latitude: e.target.value }))} placeholder="24.860735" /></FormField>
                  <FormField label="Longitude"><Input value={branchForm.longitude} onChange={(e) => setBranchForm((s) => ({ ...s, longitude: e.target.value }))} placeholder="67.001137" /></FormField>
                </div>
                <FormActions>
                  <Button type="button" variant="secondary" onClick={useCurrentBranchLocation}>Use Current Location</Button>
                  {branchForm.id && <Button type="button" variant="secondary" onClick={() => setBranchForm({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true })}>Cancel Edit</Button>}
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
                      <Button type="button" variant="secondary" onClick={() => setBranchForm({ id: branch.id, code: branch.code, name: branch.name, city: branch.city || "", address: branch.address || "", latitude: typeof branch.latitude === "number" ? branch.latitude.toString() : "", longitude: typeof branch.longitude === "number" ? branch.longitude.toString() : "", isActive: branch.isActive })}>Edit</Button>
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
