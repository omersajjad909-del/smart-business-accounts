"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { COUNTRIES as ALL_COUNTRIES, sortCountries } from "@/lib/countries";
import { CURRENCY_LABEL, SUPPORTED_CURRENCIES, currencyByCountry } from "@/lib/currency";
import Link from "next/link";

/* ─── types ─── */
type Branch = { id: string; code: string; name: string; city?: string | null; isActive: boolean; address?: string; latitude?: number | null; longitude?: number | null; geoSource?: "exact" | "manual" | "country" | "unset" };
type UserRow = { id: string; name: string; email: string; role: string; active: boolean };
type RoleRow = { role: string; permissions: string[] };
type CompanyRow = { name: string; country?: string | null; baseCurrency?: string | null; plan?: string | null };
type PrintPreferences = { paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM"; invoiceTemplate: "classic" | "compact" | "modern"; receiptTemplate: "standard" | "mart" | "restaurant"; defaultOutput: "pdf" | "browser-print"; showLogo: boolean; showPhone: boolean; showAddress: boolean; showTaxNumber: boolean; logoUrl: string; headerNote: string; footerNote: string; thermalFontSize: "sm" | "md" | "lg" };
type TaxProfile = { taxIdLabel: string; taxIdValue: string; vatNumber: string; gstNumber: string; registrationNote: string };
type CompanyIdentityProfile = { legalName: string; legalAddress: string; city: string; state: string; postalCode: string; website: string; latitude: number | null; longitude: number | null; geoSource: "exact" | "manual" | "country" | "unset" };
type InvoiceContactProfile = { contactName: string; email: string; phone: string; supportEmail: string; supportPhone: string };
type BankDetailsProfile = { bankName: string; accountTitle: string; accountNumber: string; iban: string; swiftCode: string; branchName: string; branchCode: string };
type BranchGeoProfile = { address: string; latitude: number | null; longitude: number | null; geoSource: "exact" | "manual" | "country" | "unset" };
type AdminControlSettings = { branchAssignments: Record<string, string[]>; printPreferences: PrintPreferences; taxProfile: TaxProfile; companyIdentity: CompanyIdentityProfile; invoiceContact: InvoiceContactProfile; bankDetails: BankDetailsProfile; branchLocations: Record<string, BranchGeoProfile> };
type BackupRow = { id: string; fileName: string; status: string; createdAt: string };
type TabId = "general" | "print" | "branches" | "team" | "permissions" | "finance";

/* ─── defaults ─── */
const DEFAULT_PRINT: PrintPreferences = { paperSize: "A4", invoiceTemplate: "classic", receiptTemplate: "standard", defaultOutput: "pdf", showLogo: true, showPhone: true, showAddress: true, showTaxNumber: true, logoUrl: "", headerNote: "", footerNote: "Thank you for your business.", thermalFontSize: "md" };
const DEFAULT_TAX: TaxProfile = { taxIdLabel: "NTN / Tax ID", taxIdValue: "", vatNumber: "", gstNumber: "", registrationNote: "" };
const DEFAULT_IDENTITY: CompanyIdentityProfile = { legalName: "", legalAddress: "", city: "", state: "", postalCode: "", website: "", latitude: null, longitude: null, geoSource: "unset" };
const DEFAULT_CONTACT: InvoiceContactProfile = { contactName: "", email: "", phone: "", supportEmail: "", supportPhone: "" };
const DEFAULT_BANK: BankDetailsProfile = { bankName: "", accountTitle: "", accountNumber: "", iban: "", swiftCode: "", branchName: "", branchCode: "" };
const DEFAULT_BRANCH_GEO: BranchGeoProfile = { address: "", latitude: null, longitude: null, geoSource: "unset" };

/* ─── style primitives ─── */
const ff   = "'Outfit','Inter',sans-serif";
const BG   = "rgba(255,255,255,.03)";
const BDR  = "rgba(255,255,255,.08)";
const MUTED = "rgba(255,255,255,.45)";
const ACCENT = "#6366f1";

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)", border: `1px solid ${BDR}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#fff", fontFamily: ff, outline: "none" };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 5 };
const panel: React.CSSProperties = { background: BG, border: `1px solid ${BDR}`, borderRadius: 14, padding: 22 };
const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 4 };
const sectionSub: React.CSSProperties = { fontSize: 12, color: MUTED, marginBottom: 20 };

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: "1 / -1" } : {}}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}
function Btn({ children, onClick, disabled, variant = "primary" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const bg = variant === "primary" ? (disabled ? "rgba(99,102,241,.3)" : ACCENT) : variant === "danger" ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.06)";
  const col = variant === "danger" ? "#f87171" : variant === "secondary" ? MUTED : "#fff";
  const bdr = variant === "secondary" ? `1px solid ${BDR}` : variant === "danger" ? "1px solid rgba(239,68,68,.3)" : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: "9px 20px", borderRadius: 9, border: bdr, background: bg, color: col, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: ff, whiteSpace: "nowrap" as const }}>
      {children}
    </button>
  );
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "general",     icon: "⚙️",  label: "General" },
  { id: "print",       icon: "🖨️",  label: "Print & Branding" },
  { id: "branches",    icon: "🏢",  label: "Branches" },
  { id: "team",        icon: "👥",  label: "Team & Access" },
  { id: "permissions", icon: "🔐",  label: "Permissions" },
  { id: "finance",     icon: "🏦",  label: "Finance" },
];

/* ══════════════════════════════════════ PAGE ══════════════════════════════════════ */
export default function AdminControlPage() {
  const me = getCurrentUser();
  const isAdmin = me?.role === "ADMIN";

  const [tab, setTab]           = useState<TabId>("general");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [company, setCompany]   = useState<CompanyRow | null>(null);
  const [companyForm, setCompanyForm] = useState({ companyName: "", country: "", baseCurrency: "" });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true });
  const [branchSaving, setBranchSaving] = useState(false);
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [roles, setRoles]       = useState<RoleRow[]>([]);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [settings, setSettings] = useState<AdminControlSettings>({ branchAssignments: {}, printPreferences: DEFAULT_PRINT, taxProfile: DEFAULT_TAX, companyIdentity: DEFAULT_IDENTITY, invoiceContact: DEFAULT_CONTACT, bankDetails: DEFAULT_BANK, branchLocations: {} });
  const [opsLoading, setOpsLoading] = useState<null | "backup" | "download">(null);

  const availablePermissions = useMemo(() => Object.values(PERMISSIONS), []);
  const countryOptions = useMemo(() => sortCountries(ALL_COUNTRIES).map(c => c.name), []);
  const CURRENCIES = [...SUPPORTED_CURRENCIES];

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    window.setTimeout(() => setMsg(null), 3500);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [companyRes, branchRes, userRes, roleRes, settingsRes] = await Promise.all([
        fetch("/api/me/company"), fetch("/api/branches"), fetch("/api/users"), fetch("/api/admin/roles"), fetch("/api/company/admin-control"),
      ]);
      const companyData  = companyRes.ok  ? await companyRes.json()  : null;
      const branchData   = branchRes.ok   ? await branchRes.json()   : [];
      const userData     = userRes.ok     ? await userRes.json()     : [];
      const roleData     = roleRes.ok     ? await roleRes.json()     : [];
      const settingsData = settingsRes.ok ? await settingsRes.json() : null;

      setCompany(companyData);
      setCompanyForm({ companyName: companyData?.name || "", country: companyData?.country || "", baseCurrency: companyData?.baseCurrency || "USD" });
      const locMap = settingsData?.branchLocations || {};
      setBranches(Array.isArray(branchData) ? branchData.map((b: Branch) => ({ ...b, address: locMap[b.id]?.address || "", latitude: typeof locMap[b.id]?.latitude === "number" ? locMap[b.id].latitude : null, longitude: typeof locMap[b.id]?.longitude === "number" ? locMap[b.id].longitude : null, geoSource: locMap[b.id]?.geoSource || "unset" })) : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setRoles(Array.isArray(roleData) ? roleData : []);
      setSettings({ branchAssignments: settingsData?.branchAssignments || {}, printPreferences: { ...DEFAULT_PRINT, ...(settingsData?.printPreferences || {}) }, taxProfile: { ...DEFAULT_TAX, ...(settingsData?.taxProfile || {}) }, companyIdentity: { ...DEFAULT_IDENTITY, ...(settingsData?.companyIdentity || {}) }, invoiceContact: { ...DEFAULT_CONTACT, ...(settingsData?.invoiceContact || {}) }, bankDetails: { ...DEFAULT_BANK, ...(settingsData?.bankDetails || {}) }, branchLocations: settingsData?.branchLocations || {} });
      const firstRole = Array.isArray(roleData) && roleData.length > 0 ? roleData[0] : null;
      if (firstRole?.role) { setSelectedRole(firstRole.role); setRolePermissions(firstRole.permissions || []); }
    } finally { setLoading(false); }
  }

  useEffect(() => { if (isAdmin) loadAll(); else setLoading(false); }, [isAdmin]);
  useEffect(() => { const found = roles.find(r => r.role === selectedRole); setRolePermissions(found?.permissions || []); }, [roles, selectedRole]);

  function updateCompanyCountry(name: string) {
    const match = ALL_COUNTRIES.find(c => c.name === name);
    setCompanyForm(s => ({ ...s, country: name, baseCurrency: match ? currencyByCountry(match.code) : s.baseCurrency }));
  }

  async function getBrowserLocation() {
    return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => reject(new Error("Unable to read current location.")), { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  async function saveGeneral() {
    setSaving(true);
    try {
      const [pr, sr] = await Promise.all([
        fetch("/api/company/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(companyForm) }),
        fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyIdentity: settings.companyIdentity, invoiceContact: settings.invoiceContact }) }),
      ]);
      if (!pr.ok || !sr.ok) throw new Error();
      flash("General settings saved.");
      await loadAll();
    } catch { flash("Failed to save.", false); } finally { setSaving(false); }
  }

  async function savePrint() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ printPreferences: settings.printPreferences }) });
      if (!res.ok) throw new Error();
      flash("Print settings saved.");
    } catch { flash("Failed to save.", false); } finally { setSaving(false); }
  }

  async function saveFinance() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taxProfile: settings.taxProfile, bankDetails: settings.bankDetails }) });
      if (!res.ok) throw new Error();
      flash("Finance settings saved.");
    } catch { flash("Failed to save.", false); } finally { setSaving(false); }
  }

  async function saveBranchAssignments() {
    try {
      await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchAssignments: settings.branchAssignments }) });
      flash("Branch access updated.");
    } catch { flash("Failed to save.", false); }
  }

  async function saveRolePermissions() {
    try {
      const res = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: selectedRole, permissions: rolePermissions }) });
      if (!res.ok) throw new Error();
      flash(`${selectedRole} permissions saved.`);
      await loadAll();
    } catch { flash("Failed to save.", false); }
  }

  async function saveBranch(e: React.FormEvent) {
    e.preventDefault();
    setBranchSaving(true);
    try {
      const res = await fetch("/api/branches", { method: branchForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(branchForm.id ? branchForm : { code: branchForm.code, name: branchForm.name, city: branchForm.city, isActive: branchForm.isActive }) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      const lat = branchForm.latitude.trim() ? Number(branchForm.latitude) : null;
      const lon = branchForm.longitude.trim() ? Number(branchForm.longitude) : null;
      if (saved?.id) {
        await fetch("/api/company/admin-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchLocations: { [saved.id]: { ...DEFAULT_BRANCH_GEO, address: branchForm.address.trim(), latitude: Number.isFinite(lat) ? lat : null, longitude: Number.isFinite(lon) ? lon : null, geoSource: Number.isFinite(lat) && Number.isFinite(lon) ? "manual" : "unset" } } }) });
      }
      setBranchForm({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true });
      flash(branchForm.id ? "Branch updated." : "Branch created.");
      await loadAll();
    } catch { flash("Failed to save branch.", false); } finally { setBranchSaving(false); }
  }

  async function deleteBranch(id: string) {
    if (!await confirmToast("Delete this branch?")) return;
    const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE" });
    if (res.ok) { flash("Branch deleted."); await loadAll(); }
    else flash("Failed to delete.", false);
  }

  async function handleLogoUpload(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: reader.result as string } })); };
    reader.readAsDataURL(file);
  }

  async function createInstantBackup() {
    setOpsLoading("backup");
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json", "x-user-role": "ADMIN", ...(me?.id ? { "x-user-id": me.id } : {}) }, body: JSON.stringify({ backupType: "FULL" }) });
      if (!res.ok) throw new Error();
      flash("Backup created successfully.");
    } catch { flash("Backup failed.", false); } finally { setOpsLoading(null); }
  }

  async function downloadLatestBackup() {
    setOpsLoading("download");
    try {
      const listRes = await fetch("/api/backup", { headers: { "x-user-role": "ADMIN" } });
      if (!listRes.ok) throw new Error();
      const backups = (await listRes.json()) as BackupRow[];
      const latest = backups.find(b => String(b.status).toUpperCase() === "COMPLETED");
      if (!latest) throw new Error("No completed backup available.");
      const dlRes = await fetch(`/api/backup/download?id=${latest.id}`, { headers: { "x-user-role": "ADMIN" } });
      if (!dlRes.ok) throw new Error();
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = latest.fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: unknown) { flash(e instanceof Error ? e.message : "Download failed.", false); } finally { setOpsLoading(null); }
  }

  if (!isAdmin) return (
    <div style={{ padding: 40, textAlign: "center", color: "#f87171", fontFamily: ff }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Admin Only</div>
      <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>This page is only accessible to account owners and admins.</div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 900 }}>⚙️ Admin Control Center</h1>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>Manage company settings, branding, team, permissions and finance in one place.</p>
      </div>

      {/* ── KPI strip ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Plan",           value: company?.plan || "STARTER",     color: "#818cf8" },
            { label: "Branches",       value: branches.length,                color: "#34d399" },
            { label: "Team Members",   value: users.length,                   color: "#38bdf8" },
            { label: "Assigned Users", value: Object.values(settings.branchAssignments).filter(a => a.length > 0).length, color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Flash message ── */}
      {msg && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: msg.ok ? "rgba(52,211,153,.08)" : "rgba(248,113,113,.08)", border: `1px solid ${msg.ok ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`, color: msg.ok ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>Loading…</div>
      ) : (
        <>
          {/* ── Tab bar ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === t.id ? ACCENT : "rgba(255,255,255,.06)", color: tab === t.id ? "#fff" : MUTED, transition: "background .15s" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ══════════════ TAB: GENERAL ══════════════ */}
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div style={panel}>
                <div style={sectionTitle}>Company Identity</div>
                <div style={sectionSub}>Name, country and base currency shown on all invoices and reports.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <Field label="Company Name"><input style={inp} value={companyForm.companyName} onChange={e => setCompanyForm(s => ({ ...s, companyName: e.target.value }))} /></Field>
                  <Field label="Country">
                    <select style={inp} value={companyForm.country} onChange={e => updateCompanyCountry(e.target.value)}>
                      <option value="">Select country</option>
                      {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Base Currency">
                    <select style={inp} value={companyForm.baseCurrency} onChange={e => setCompanyForm(s => ({ ...s, baseCurrency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c} — {CURRENCY_LABEL[c] || c}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <Field label="Legal Name"><input style={inp} value={settings.companyIdentity.legalName} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, legalName: e.target.value } }))} placeholder="Registered company name" /></Field>
                  <Field label="Website"><input style={inp} value={settings.companyIdentity.website} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, website: e.target.value } }))} placeholder="https://yourcompany.com" /></Field>
                  <Field label="Postal Code"><input style={inp} value={settings.companyIdentity.postalCode} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, postalCode: e.target.value } }))} /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Legal Address" span2><input style={inp} value={settings.companyIdentity.legalAddress} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, legalAddress: e.target.value } }))} placeholder="Street, building, full legal address" /></Field>
                  <Field label="City"><input style={inp} value={settings.companyIdentity.city} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, city: e.target.value } }))} /></Field>
                  <Field label="State / Region"><input style={inp} value={settings.companyIdentity.state} onChange={e => setSettings(s => ({ ...s, companyIdentity: { ...s.companyIdentity, state: e.target.value } }))} /></Field>
                </div>
              </div>

              <div style={panel}>
                <div style={sectionTitle}>Invoice Contact Details</div>
                <div style={sectionSub}>Shown on customer-facing documents and support sections.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <Field label="Contact Name"><input style={inp} value={settings.invoiceContact.contactName} onChange={e => setSettings(s => ({ ...s, invoiceContact: { ...s.invoiceContact, contactName: e.target.value } }))} /></Field>
                  <Field label="Invoice Email"><input style={inp} value={settings.invoiceContact.email} onChange={e => setSettings(s => ({ ...s, invoiceContact: { ...s.invoiceContact, email: e.target.value } }))} /></Field>
                  <Field label="Invoice Phone"><input style={inp} value={settings.invoiceContact.phone} onChange={e => setSettings(s => ({ ...s, invoiceContact: { ...s.invoiceContact, phone: e.target.value } }))} /></Field>
                  <Field label="Support Email"><input style={inp} value={settings.invoiceContact.supportEmail} onChange={e => setSettings(s => ({ ...s, invoiceContact: { ...s.invoiceContact, supportEmail: e.target.value } }))} /></Field>
                  <Field label="Support Phone"><input style={inp} value={settings.invoiceContact.supportPhone} onChange={e => setSettings(s => ({ ...s, invoiceContact: { ...s.invoiceContact, supportPhone: e.target.value } }))} /></Field>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={saveGeneral} disabled={saving}>{saving ? "Saving…" : "💾 Save General Settings"}</Btn>
              </div>
            </div>
          )}

          {/* ══════════════ TAB: PRINT & BRANDING ══════════════ */}
          {tab === "print" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div style={panel}>
                <div style={sectionTitle}>Logo & Branding</div>
                <div style={sectionSub}>Your logo and notes shown on all printed documents.</div>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 18 }}>
                  <div style={{ width: 90, height: 90, borderRadius: 14, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                    {settings.printPreferences.logoUrl ? <img src={settings.printPreferences.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 11, color: MUTED }}>No logo</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Upload Logo</label>
                    <input type="file" accept="image/*" onChange={e => void handleLogoUpload(e.target.files?.[0] || null)} style={{ ...inp, padding: "7px 10px" }} />
                    <div style={{ marginTop: 5, fontSize: 11, color: MUTED }}>PNG, JPG or SVG. Or paste a direct URL below.</div>
                    <input style={{ ...inp, marginTop: 8 }} value={settings.printPreferences.logoUrl} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: e.target.value } }))} placeholder="https://…" />
                    {settings.printPreferences.logoUrl && <button onClick={() => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, logoUrl: "" } }))} style={{ marginTop: 6, background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: ff }}>✕ Clear logo</button>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <Field label="Header Note"><input style={inp} value={settings.printPreferences.headerNote} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, headerNote: e.target.value } }))} placeholder="Short note at top of invoice" /></Field>
                  <Field label="Footer Note"><input style={inp} value={settings.printPreferences.footerNote} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, footerNote: e.target.value } }))} placeholder="Thank you note / bank details" /></Field>
                </div>
              </div>

              <div style={panel}>
                <div style={sectionTitle}>Templates & Format</div>
                <div style={sectionSub}>Controls how invoices and receipts are generated.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 14 }}>
                  <Field label="Invoice Template">
                    <select style={inp} value={settings.printPreferences.invoiceTemplate} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, invoiceTemplate: e.target.value as PrintPreferences["invoiceTemplate"] } }))}>
                      <option value="classic">Classic</option><option value="compact">Compact</option><option value="modern">Modern</option>
                    </select>
                  </Field>
                  <Field label="Receipt Template">
                    <select style={inp} value={settings.printPreferences.receiptTemplate} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, receiptTemplate: e.target.value as PrintPreferences["receiptTemplate"] } }))}>
                      <option value="standard">Standard</option><option value="mart">Mart / POS</option><option value="restaurant">Restaurant</option>
                    </select>
                  </Field>
                  <Field label="Default Output">
                    <select style={inp} value={settings.printPreferences.defaultOutput} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, defaultOutput: e.target.value as PrintPreferences["defaultOutput"] } }))}>
                      <option value="pdf">PDF</option><option value="browser-print">Browser Print</option>
                    </select>
                  </Field>
                  <Field label="Paper Size">
                    <select style={inp} value={settings.printPreferences.paperSize} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, paperSize: e.target.value as PrintPreferences["paperSize"] } }))}>
                      <option value="A4">A4</option><option value="THERMAL_80MM">Thermal 80mm</option><option value="THERMAL_58MM">Thermal 58mm</option>
                    </select>
                  </Field>
                  <Field label="Thermal Font Size">
                    <select style={inp} value={settings.printPreferences.thermalFontSize} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, thermalFontSize: e.target.value as PrintPreferences["thermalFontSize"] } }))}>
                      <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                    </select>
                  </Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                  {([["showLogo","Show logo on print"],["showPhone","Show phone number"],["showAddress","Show address"],["showTaxNumber","Show Tax / NTN label"]] as [keyof PrintPreferences, string][]).map(([key, label]) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 9, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.02)", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={Boolean(settings.printPreferences[key])} onChange={e => setSettings(s => ({ ...s, printPreferences: { ...s.printPreferences, [key]: e.target.checked } }))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={savePrint} disabled={saving}>{saving ? "Saving…" : "💾 Save Print Settings"}</Btn>
              </div>
            </div>
          )}

          {/* ══════════════ TAB: BRANCHES ══════════════ */}
          {tab === "branches" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={panel}>
                <div style={sectionTitle}>{branchForm.id ? "Edit Branch" : "Add Branch"}</div>
                <div style={sectionSub}>Manage head office, outlets and warehouses.</div>
                <form onSubmit={saveBranch}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <Field label="Branch Code *"><input required style={inp} value={branchForm.code} onChange={e => setBranchForm(s => ({ ...s, code: e.target.value }))} /></Field>
                    <Field label="Branch Name *"><input required style={inp} value={branchForm.name} onChange={e => setBranchForm(s => ({ ...s, name: e.target.value }))} /></Field>
                    <Field label="City"><input style={inp} value={branchForm.city} onChange={e => setBranchForm(s => ({ ...s, city: e.target.value }))} /></Field>
                    <Field label="Status">
                      <select style={inp} value={branchForm.isActive ? "active" : "inactive"} onChange={e => setBranchForm(s => ({ ...s, isActive: e.target.value === "active" }))}>
                        <option value="active">Active</option><option value="inactive">Inactive</option>
                      </select>
                    </Field>
                    <Field label="Address" span2><input style={inp} value={branchForm.address} onChange={e => setBranchForm(s => ({ ...s, address: e.target.value }))} placeholder="Street, building, area" /></Field>
                    <Field label="Latitude"><input style={inp} value={branchForm.latitude} onChange={e => setBranchForm(s => ({ ...s, latitude: e.target.value }))} placeholder="24.860735" /></Field>
                    <Field label="Longitude"><input style={inp} value={branchForm.longitude} onChange={e => setBranchForm(s => ({ ...s, longitude: e.target.value }))} placeholder="67.001137" /></Field>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="secondary" onClick={async () => { try { const c = await getBrowserLocation(); setBranchForm(s => ({ ...s, latitude: c.latitude.toFixed(6), longitude: c.longitude.toFixed(6) })); } catch { flash("Cannot get location.", false); } }}>📍 Use Location</Btn>
                    {branchForm.id && <Btn variant="secondary" onClick={() => setBranchForm({ id: "", code: "", name: "", city: "", address: "", latitude: "", longitude: "", isActive: true })}>Cancel</Btn>}
                    <Btn disabled={branchSaving}>{branchSaving ? "Saving…" : branchForm.id ? "Update" : "Add Branch"}</Btn>
                  </div>
                </form>
              </div>

              <div style={panel}>
                <div style={sectionTitle}>Branch List</div>
                <div style={sectionSub}>{branches.length} branch{branches.length !== 1 ? "es" : ""} configured.</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {branches.length === 0 ? <div style={{ textAlign: "center", padding: 32, color: MUTED }}>No branches yet.</div> : branches.map(b => (
                    <div key={b.id} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BDR}`, background: "rgba(255,255,255,.02)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{b.code} · {b.name}</div>
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.city || "No city"} · <span style={{ color: b.isActive ? "#34d399" : "#f87171" }}>{b.isActive ? "Active" : "Inactive"}</span></div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn variant="secondary" onClick={() => setBranchForm({ id: b.id, code: b.code, name: b.name, city: b.city || "", address: b.address || "", latitude: typeof b.latitude === "number" ? b.latitude.toString() : "", longitude: typeof b.longitude === "number" ? b.longitude.toString() : "", isActive: b.isActive })}>Edit</Btn>
                        <Btn variant="danger" onClick={() => deleteBranch(b.id)}>Delete</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB: TEAM & ACCESS ══════════════ */}
          {tab === "team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={sectionTitle}>Branch Access per User</div>
                  <div style={{ fontSize: 12, color: MUTED }}>Assign which branches each team member can access. Admin always has full access.</div>
                </div>
                <Btn onClick={saveBranchAssignments}>💾 Save Access</Btn>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {users.map(user => {
                  const assigned = settings.branchAssignments[user.id] || [];
                  return (
                    <div key={user.id} style={panel}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                          <div style={{ fontSize: 12, color: MUTED }}>{user.email} · <span style={{ color: "#818cf8" }}>{user.role}</span> · <span style={{ color: user.active ? "#34d399" : "#f87171" }}>{user.active ? "Active" : "Inactive"}</span></div>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED }}>{user.role === "ADMIN" ? "Full access" : `${assigned.length} branch(es)`}</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {branches.map(b => {
                          const checked = user.role === "ADMIN" ? true : assigned.includes(b.id);
                          return (
                            <label key={b.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 20, border: `1px solid ${checked ? ACCENT : BDR}`, background: checked ? "rgba(99,102,241,.12)" : "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              <input type="checkbox" disabled={user.role === "ADMIN"} checked={checked} onChange={() => setSettings(s => { const ex = s.branchAssignments[user.id] || []; return { ...s, branchAssignments: { ...s.branchAssignments, [user.id]: ex.includes(b.id) ? ex.filter(x => x !== b.id) : [...ex, b.id] } }; })} />
                              {b.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════ TAB: PERMISSIONS ══════════════ */}
          {tab === "permissions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={sectionTitle}>Role Permissions</div>
                  <div style={{ fontSize: 12, color: MUTED }}>Set default permissions per role for the entire company.</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn variant="secondary" onClick={() => setRolePermissions(availablePermissions)}>Select All</Btn>
                  <Btn variant="secondary" onClick={() => setRolePermissions([])}>Clear</Btn>
                  <Btn onClick={saveRolePermissions}>💾 Save Role</Btn>
                </div>
              </div>

              {/* Dynamic role tabs */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(() => {
                  const fromUsers = [...new Set(users.map(u => u.role.toUpperCase()))];
                  const fromRoles = roles.map(r => r.role.toUpperCase());
                  const all = [...new Set([...fromUsers, ...fromRoles])];
                  const display = all.length > 0 ? all : ["ADMIN", "ACCOUNTANT", "VIEWER"];
                  return display.map(r => (
                    <button key={r} onClick={() => setSelectedRole(r)} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${selectedRole === r ? ACCENT : BDR}`, background: selectedRole === r ? "rgba(99,102,241,.14)" : "transparent", color: selectedRole === r ? "#fff" : MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      {r}
                    </button>
                  ));
                })()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {availablePermissions.map(p => (
                  <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, border: `1px solid ${rolePermissions.includes(p) ? "rgba(99,102,241,.35)" : BDR}`, background: rolePermissions.includes(p) ? "rgba(99,102,241,.07)" : "rgba(255,255,255,.02)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={rolePermissions.includes(p)} onChange={() => setRolePermissions(c => c.includes(p) ? c.filter(x => x !== p) : [...c, p])} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════ TAB: FINANCE ══════════════ */}
          {tab === "finance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div style={panel}>
                <div style={sectionTitle}>Tax & Registration Profile</div>
                <div style={sectionSub}>Tax details reused across invoices, compliance docs and print layouts.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  <Field label="Primary Tax Label"><input style={inp} value={settings.taxProfile.taxIdLabel} onChange={e => setSettings(s => ({ ...s, taxProfile: { ...s.taxProfile, taxIdLabel: e.target.value } }))} placeholder="NTN / Tax ID / TRN" /></Field>
                  <Field label="Primary Tax Number"><input style={inp} value={settings.taxProfile.taxIdValue} onChange={e => setSettings(s => ({ ...s, taxProfile: { ...s.taxProfile, taxIdValue: e.target.value } }))} /></Field>
                  <Field label="VAT Number"><input style={inp} value={settings.taxProfile.vatNumber} onChange={e => setSettings(s => ({ ...s, taxProfile: { ...s.taxProfile, vatNumber: e.target.value } }))} /></Field>
                  <Field label="GST / Sales Tax No"><input style={inp} value={settings.taxProfile.gstNumber} onChange={e => setSettings(s => ({ ...s, taxProfile: { ...s.taxProfile, gstNumber: e.target.value } }))} /></Field>
                  <Field label="Registration Note" span2><input style={inp} value={settings.taxProfile.registrationNote} onChange={e => setSettings(s => ({ ...s, taxProfile: { ...s.taxProfile, registrationNote: e.target.value } }))} placeholder="Optional note for invoices or filings" /></Field>
                </div>
              </div>

              <div style={panel}>
                <div style={sectionTitle}>Bank Details for Print Templates</div>
                <div style={sectionSub}>Remittance and transfer details shown on invoices and quotations.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  <Field label="Bank Name"><input style={inp} value={settings.bankDetails.bankName} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, bankName: e.target.value } }))} /></Field>
                  <Field label="Account Title"><input style={inp} value={settings.bankDetails.accountTitle} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, accountTitle: e.target.value } }))} /></Field>
                  <Field label="Account Number"><input style={inp} value={settings.bankDetails.accountNumber} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, accountNumber: e.target.value } }))} /></Field>
                  <Field label="IBAN"><input style={inp} value={settings.bankDetails.iban} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, iban: e.target.value } }))} /></Field>
                  <Field label="SWIFT Code"><input style={inp} value={settings.bankDetails.swiftCode} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, swiftCode: e.target.value } }))} /></Field>
                  <Field label="Branch Name"><input style={inp} value={settings.bankDetails.branchName} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, branchName: e.target.value } }))} /></Field>
                  <Field label="Branch Code"><input style={inp} value={settings.bankDetails.branchCode} onChange={e => setSettings(s => ({ ...s, bankDetails: { ...s.bankDetails, branchCode: e.target.value } }))} /></Field>
                </div>
              </div>

              <div style={panel}>
                <div style={sectionTitle}>Backup & Data</div>
                <div style={sectionSub}>Create or download a full backup of all company data.</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn onClick={createInstantBackup} disabled={opsLoading !== null}>{opsLoading === "backup" ? "Creating…" : "📦 Create Backup"}</Btn>
                  <Btn variant="secondary" onClick={downloadLatestBackup} disabled={opsLoading !== null}>{opsLoading === "download" ? "Downloading…" : "⬇ Download Latest"}</Btn>
                  <Link href="/dashboard/backup-restore" style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${BDR}`, background: "transparent", color: MUTED, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open Backup & Restore →</Link>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={saveFinance} disabled={saving}>{saving ? "Saving…" : "💾 Save Finance Settings"}</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
