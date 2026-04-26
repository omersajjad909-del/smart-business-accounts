"use client";
import { fmtDate } from "@/lib/dateUtils";
import { useEffect, useState } from "react";
import { getCurrentUser, updateStoredUser } from "@/lib/auth";
import { getMaxUsersForPlan } from "@/lib/planLimits";
import { COUNTRIES as ALL_COUNTRIES, sortCountries } from "@/lib/countries";
import { CURRENCY_LABEL, SUPPORTED_CURRENCIES, currencyByCountry } from "@/lib/currency";
import Link from "next/link";
import ImageAdjusterModal from "@/components/ImageAdjusterModal";
import { dispatchCompanyProfileUpdated, dispatchUserProfileUpdated } from "@/lib/dashboardProfileEvents";

type CompanyData = {
  id: string;
  name: string;
  code?: string | null;
  country: string | null;
  baseCurrency: string;
  plan: string;
  businessType?: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  activeModules: string | null;
  stripeCustomerId: string | null;
  logoUrl?: string | null;
  createdAt?: string;
  totalUsers?: number;
  totalAccounts?: number;
  extraSeats?: number;
  effectiveUserLimit?: number | null;
};

type Branch = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  isActive: boolean;
  createdAt: string;
};

// Business type labels loaded dynamically from API — see useEffect below
const BUSINESS_TYPE_LABELS_FALLBACK: Record<string, string> = {
  trading: "Trading", manufacturing: "Manufacturing", distribution: "Distribution",
  retail: "Retail", service: "Service", restaurant: "Restaurant",
  real_estate: "Real Estate", construction: "Construction",
};

const PLAN_META: Record<string, { color: string; bg: string; border: string; icon: string; label: string }> = {
  STARTER:           { color: "#818cf8", bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.25)", icon: "🌱", label: "Starter" },
  PROFESSIONAL:      { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)", icon: "⚡", label: "Professional" },
  PRO:               { color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)", icon: "⚡", label: "Professional" },
  ENTERPRISE:        { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.25)", icon: "🏢", label: "Enterprise" },
  CUSTOM:            { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", icon: "⭐", label: "Custom" },
  "ADDON-AUTOMATION":{ color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.25)", icon: "🏢", label: "Enterprise" },
};

const CURRENCIES = [...SUPPORTED_CURRENCIES];

export default function CompanyProfilePage() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", country: "", baseCurrency: "" });
  const [bizTypeLabels, setBizTypeLabels] = useState<Record<string, string>>(BUSINESS_TYPE_LABELS_FALLBACK);
  const countryOptions = sortCountries(ALL_COUNTRIES).map((c) => c.name);

  async function uploadAdjustedLogo(dataUrl: string) {
    setLogoUploading(true);
    setSaveMsg(null);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "company-logo.png", { type: blob.type || "image/png" });
      const fd = new FormData();
      fd.append("logo", file);
      const r = await fetch("/api/company/logo", { method: "POST", body: fd });
      if (r.ok) {
        const d = await r.json();
        setCompany((prev) => prev ? { ...prev, logoUrl: d.logoUrl } : prev);
        dispatchCompanyProfileUpdated({ logoUrl: d.logoUrl });
        if (isAdmin) {
          const avatarForm = new FormData();
          avatarForm.append("avatar", file);
          const avatarRes = await fetch("/api/me/avatar", { method: "POST", body: avatarForm });
          if (avatarRes.ok) {
            const avatarData = await avatarRes.json();
            updateStoredUser((stored: any) => ({
              ...stored,
              avatar: avatarData.avatar || null,
              user: {
                ...(stored?.user || {}),
                avatar: avatarData.avatar || null,
              },
            }));
            dispatchUserProfileUpdated({ avatar: avatarData.avatar || null });
          }
        }
        setSaveMsg({ text: "لوگو کامیابی سے اپڈیٹ ہو گیا", ok: true });
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        const d = await r.json().catch(() => ({}));
        setSaveMsg({ text: d.error || "لوگو اپلوڈ نہیں ہو سکا", ok: false });
        setTimeout(() => setSaveMsg(null), 3000);
      }
    } catch {
      setSaveMsg({ text: "لوگو اپلوڈ نہیں ہو سکا", ok: false });
      setTimeout(() => setSaveMsg(null), 3000);
    } finally {
      setLogoUploading(false);
      setPendingLogoFile(null);
    }
  }

  useEffect(() => {
    // Load business type labels from API
    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => {
        if (d.types) {
          const map: Record<string, string> = {};
          d.types.forEach((t: any) => { map[t.id] = t.label; });
          setBizTypeLabels(map);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/me/company").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/branches").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/public/plan-config").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([companyData, branchData, planConfig]) => {
        if (companyData) {
          setCompany(companyData);
          setForm({
            name: companyData.name || "",
            country: companyData.country || "",
            baseCurrency: companyData.baseCurrency || "USD",
          });
          // max users
          if (companyData?.effectiveUserLimit !== undefined) {
            setMaxUsers(companyData.effectiveUserLimit);
          } else if (planConfig?.planLimits && companyData?.plan) {
            const key = String(companyData.plan).toLowerCase();
            const lim = planConfig.planLimits[key];
            setMaxUsers(lim === undefined ? null : lim);
          } else if (companyData?.plan) {
            setMaxUsers(getMaxUsersForPlan(companyData.plan));
          }
        }
        if (Array.isArray(branchData)) setBranches(branchData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/company/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, country: form.country, baseCurrency: form.baseCurrency }),
      });
      if (res.ok) {
        setCompany((prev) => (prev ? { ...prev, ...form } : prev));
        dispatchCompanyProfileUpdated({ name: form.name, country: form.country, baseCurrency: form.baseCurrency });
        setSaveMsg({ text: "پروفائل کامیابی سے اپڈیٹ ہو گیا", ok: true });
        setEditing(false);
      } else {
        const j = await res.json().catch(() => ({}));
        setSaveMsg({ text: j.error || "محفوظ نہیں ہو سکا", ok: false });
      }
    } catch {
      setSaveMsg({ text: "نیٹ ورک ایرر", ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3500);
    }
  }

  function updateCountry(countryName: string) {
    const match = ALL_COUNTRIES.find((c) => c.name === countryName);
    setForm((f) => ({
      ...f,
      country: countryName,
      baseCurrency: match ? currencyByCountry(match.code) : f.baseCurrency,
    }));
  }

  // ── shared styles ────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "16px",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--app-bg)",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: "6px",
  };

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (!company)
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>کمپنی نہیں ملی۔</div>
    );

  const planCode = String(company.plan || "STARTER").toUpperCase();
  const plan = PLAN_META[planCode] || PLAN_META.STARTER;
  const statusActive =
    String(company.subscriptionStatus || "").toUpperCase() === "ACTIVE" ||
    String(company.subscriptionStatus || "").toUpperCase() === "TRIALING";
  const statusTrialing = String(company.subscriptionStatus || "").toUpperCase() === "TRIALING";
  const periodEnd = company.currentPeriodEnd ? fmtDate(company.currentPeriodEnd) : null;
  const userCount = company.totalUsers ?? 0;
  const accountCount = company.totalAccounts ?? 0;
  const activeBranches = branches.filter((b) => b.isActive).length;

  return (
    <div style={{ maxWidth: 860, padding: "32px" }}>
      <ImageAdjusterModal
        open={!!pendingLogoFile}
        file={pendingLogoFile}
        title="کمپنی فوٹو ایڈجسٹ کریں"
        description="Photo ya logo ko drag aur zoom karke card me sahi framing set karein."
        shape="rounded"
        onCancel={() => setPendingLogoFile(null)}
        onConfirm={uploadAdjustedLogo}
      />
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            کمپنی پروفائل
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            کمپنی کی معلومات، سبسکرپشن اور سیٹنگز
          </p>
        </div>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "9px 18px",
              borderRadius: "9px",
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818cf8",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            پروفائل تبدیل کریں
          </button>
        )}
      </div>

      {/* ── SAVE MESSAGE ── */}
      {saveMsg && (
        <div
          style={{
            marginBottom: "16px",
            padding: "11px 16px",
            borderRadius: "10px",
            background: saveMsg.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${saveMsg.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            fontSize: "13px",
            color: saveMsg.ok ? "#34d399" : "#f87171",
            fontWeight: 500,
          }}
        >
          {saveMsg.ok ? "✓ " : "✗ "}
          {saveMsg.text}
        </div>
      )}

      {/* ── COMPANY IDENTITY ── */}
      <div style={card}>
        <div style={sectionLabel as React.CSSProperties}>
          <span>🏢</span> کمپنی کی پہچان
        </div>

        {/* Top row: avatar + info */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: editing ? "24px" : 0 }}>
          {/* Company logo — clickable upload for admin */}
          <label htmlFor="company-logo-input" style={{ cursor: isAdmin ? "pointer" : "default", flexShrink: 0, position: "relative" }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "18px",
                background: company.logoUrl ? "transparent" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                border: company.logoUrl ? "2px solid var(--border)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                fontWeight: 800,
                color: "#fff",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(99,102,241,0.3)",
              }}
            >
              {logoUploading ? (
                <div style={{ width: 22, height: 22, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
              ) : company.logoUrl ? (
                <img src={company.logoUrl} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                (company.name || "C")[0].toUpperCase()
              )}
            </div>
            {isAdmin && (
              <div style={{
                position: "absolute", bottom: -4, right: -4,
                width: 22, height: 22, borderRadius: "50%",
                background: "#6366f1", border: "2px solid var(--panel-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
              }}>
                📷
              </div>
            )}
          </label>
          {isAdmin && (
            <input
              id="company-logo-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPendingLogoFile(f);
                e.target.value = "";
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-.3px" }}>
              {company.name}
            </div>
            {company.code && (
              <div
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "5px",
                  background: "var(--app-bg)",
                  border: "1px solid var(--border)",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                  marginBottom: "6px",
                }}
              >
                {company.code}
              </div>
            )}
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "8px" }}>
              {company.country && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                  🌍 {company.country}
                </span>
              )}
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                💱 {company.baseCurrency} — {CURRENCY_LABEL[company.baseCurrency] || company.baseCurrency}
              </span>
              {company.businessType && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                  🏭 {bizTypeLabels[company.businessType] || company.businessType}
                </span>
              )}
              {company.createdAt && (
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                  📅 رکنیت: {fmtDate(company.createdAt)}
                </span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "12px", lineHeight: 1.6 }}>
              Yahan upload ki hui photo company card par dikh jayegi, aur admin ke navbar/sidebar preview ko bhi sync kar degi. Personal photo ko baad me{" "}
              <Link href="/dashboard/account-settings" style={{ color: "#a5b4fc", fontWeight: 700, textDecoration: "none" }}>
                Account Settings
              </Link>{" "}
              se change hogi.
            </div>
          </div>

          {/* Plan badge (top-right of identity card) */}
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              background: plan.bg,
              border: `1px solid ${plan.border}`,
              display: "flex",
              alignItems: "center",
              gap: "7px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "14px" }}>{plan.icon}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: plan.color }}>{plan.label}</span>
          </div>
        </div>

        {/* Edit form */}
        {editing && isAdmin && (
          <div>
            <div style={{ height: "1px", background: "var(--border)", marginBottom: "20px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={fieldLabel}>کمپنی کا نام</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="کمپنی کا نام"
                />
              </div>
              <div>
                <label style={fieldLabel}>ملک</label>
                <select
                  style={{ ...inputStyle, paddingRight: 32 }}
                  value={form.country}
                  onChange={(e) => updateCountry(e.target.value)}
                >
                  <option value="">ملک منتخب کریں</option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>بنیادی کرنسی</label>
                <select
                  style={{ ...inputStyle, paddingRight: 32 }}
                  value={form.baseCurrency}
                  onChange={(e) => setForm((f) => ({ ...f, baseCurrency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c} — {CURRENCY_LABEL[c] || c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  padding: "9px 20px",
                  borderRadius: "9px",
                  background: saving ? "var(--border)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                  border: "none",
                  color: saving ? "var(--text-muted)" : "#fff",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "محفوظ ہو رہا ہے…" : "تبدیلیاں محفوظ کریں"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setSaveMsg(null);
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: "9px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                منسوخ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── QUICK STATS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        {[
          { label: "ٹیم ممبرز", value: userCount, icon: "👥", color: "#6366f1" },
          { label: "شاخیں", value: branches.length, sub: `${activeBranches} فعال`, icon: "🏢", color: "#0891b2" },
          { label: "اکاؤنٹس", value: accountCount, icon: "📊", color: "#0d9488" },
          { label: "پلان حد", value: maxUsers === null ? "∞" : maxUsers, sub: "زیادہ سے زیادہ صارفین", icon: "🔢", color: "#d97706" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ fontSize: "18px" }}>{stat.icon}</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{stat.label}</div>
            {stat.sub && <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── PLAN & SUBSCRIPTION ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", marginBottom: "16px" }}>
        {/* Plan card */}
        <div
          style={{
            ...card,
            marginBottom: 0,
            background: plan.bg,
            border: `1px solid ${plan.border}`,
          }}
        >
          <div style={{ ...sectionLabel, color: plan.color } as React.CSSProperties}>
            <span>{plan.icon}</span> موجودہ پلان
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: 900, color: plan.color }}>{plan.label}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                {maxUsers === null ? "لامحدود صارفین" : `زیادہ سے زیادہ ${maxUsers} صارفین`}
              </div>
              {!!company.extraSeats && company.extraSeats > 0 && (
                <div style={{ fontSize: "11px", color: "#34d399", marginTop: "2px" }}>
                  +{company.extraSeats} اضافی سیٹس شامل
                </div>
              )}
              {periodEnd && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  تجدید: {periodEnd}
                </div>
              )}
            </div>
          </div>

          {/* User progress bar */}
          {maxUsers !== null && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginBottom: "6px",
                }}
              >
                <span>
                  {userCount} / {maxUsers} صارفین
                </span>
                <span style={{ color: userCount >= maxUsers ? "#f87171" : "var(--text-muted)" }}>
                  {userCount >= maxUsers ? "حد پہنچ گئی" : `${maxUsers - userCount} جگہیں باقی`}
                </span>
              </div>
              <div
                style={{
                  height: "5px",
                  borderRadius: "10px",
                  background: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "10px",
                    width: `${Math.min(100, (userCount / maxUsers) * 100)}%`,
                    background:
                      userCount >= maxUsers
                        ? "linear-gradient(90deg,#f87171,#ef4444)"
                        : `linear-gradient(90deg,${plan.color},${plan.color}90)`,
                    transition: "width .4s ease",
                  }}
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <Link prefetch={false}
              href="/dashboard/billing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: plan.bg,
                border: `1px solid ${plan.border}`,
                color: plan.color,
                fontSize: "12px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              پلان منیج کریں ←
            </Link>
          )}
        </div>

        {/* Subscription status */}
        <div
          style={{
            ...card,
            marginBottom: 0,
            background: statusActive ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)",
            border: `1px solid ${statusActive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
          }}
        >
          <div
            style={{
              ...sectionLabel,
              color: statusActive ? "#34d399" : "#f87171",
            } as React.CSSProperties}
          >
            <span>💳</span> سبسکرپشن
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: statusActive ? "#34d399" : "#f87171",
                boxShadow: `0 0 8px ${statusActive ? "rgba(52,211,153,0.6)" : "rgba(248,113,113,0.6)"}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: statusActive ? "#34d399" : "#f87171",
              }}
            >
              {statusTrialing ? "TRIALING" : (company.subscriptionStatus || "ACTIVE").toUpperCase()}
            </span>
          </div>

          {statusTrialing && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "rgba(251,191,36,0.1)",
                border: "1px solid rgba(251,191,36,0.25)",
                fontSize: "12px",
                color: "#fbbf24",
                marginBottom: "12px",
              }}
            >
              🔔 ٹرائل پیریڈ جاری ہے۔ ٹرائل ختم ہونے کے بعد رسائی برقرار رکھنے کے لیے اپگریڈ کریں۔
            </div>
          )}

          {!statusActive && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                fontSize: "12px",
                color: "#f87171",
                marginBottom: "12px",
              }}
            >
              ⚠️ سبسکرپشن غیر فعال ہے۔{" "}
              <Link prefetch={false} href="/dashboard/billing" style={{ color: "#f87171", fontWeight: 700 }}>
                ابھی تجدید کریں ←
              </Link>
            </div>
          )}

          {periodEnd && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              مدت ختم: <strong style={{ color: "var(--text-primary)" }}>{periodEnd}</strong>
            </div>
          )}

          {company.stripeCustomerId && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "10px",
                color: "var(--text-muted)",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              کسٹمر: {company.stripeCustomerId}
            </div>
          )}
        </div>
      </div>

      {/* ── BRANCHES ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={sectionLabel as React.CSSProperties}>
            <span>🏢</span> شاخیں{" "}
            <span
              style={{
                padding: "1px 7px",
                borderRadius: "10px",
                background: "var(--app-bg)",
                border: "1px solid var(--border)",
                fontSize: "10px",
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {branches.length}
            </span>
          </div>
          {isAdmin && (
            <Link prefetch={false}
              href="/dashboard/branches"
              style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}
            >
              شاخیں منیج کریں ←
            </Link>
          )}
        </div>

        {branches.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px",
              color: "var(--text-muted)",
              fontSize: "13px",
              border: "1px dashed var(--border)",
              borderRadius: "10px",
            }}
          >
            ابھی تک کوئی شاخ شامل نہیں۔
            {isAdmin && (
              <>
                {" "}
                <Link prefetch={false} href="/dashboard/branches" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                  پہلی شاخ شامل کریں ←
                </Link>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
            {branches.map((branch) => (
              <div
                key={branch.id}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "var(--app-bg)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(99,102,241,0.1)",
                      color: "#818cf8",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    {branch.code}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: branch.isActive ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                      color: branch.isActive ? "#34d399" : "#f87171",
                      border: `1px solid ${branch.isActive ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                    }}
                  >
                    {branch.isActive ? "فعال" : "غیر فعال"}
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{branch.name}</div>
                {branch.city && (
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>📍 {branch.city}</div>
                )}
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                  شامل: {fmtDate(branch.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TEAM MEMBERS ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={sectionLabel as React.CSSProperties}>
            <span>👥</span> ٹیم ممبرز
          </div>
          {isAdmin && (
            <Link prefetch={false}
              href="/dashboard/users"
              style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, textDecoration: "none" }}
            >
              صارفین منیج کریں ←
            </Link>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Count circle */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(99,102,241,0.1)",
              border: "2px solid rgba(99,102,241,0.25)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 800, color: "#6366f1", lineHeight: 1 }}>{userCount}</div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, marginTop: "2px" }}>
              صارفین
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {maxUsers !== null ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  <span>
                    {userCount} میں سے {maxUsers} سیٹس استعمال
                  </span>
                  <span style={{ color: userCount >= maxUsers ? "#f87171" : "var(--text-muted)" }}>
                    {userCount >= maxUsers ? "حد پہنچ گئی" : `${maxUsers - userCount} دستیاب`}
                  </span>
                </div>
                <div style={{ height: "8px", borderRadius: "10px", background: "var(--border)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "10px",
                      width: `${Math.min(100, (userCount / maxUsers) * 100)}%`,
                      background:
                        userCount >= maxUsers
                          ? "linear-gradient(90deg,#f87171,#ef4444)"
                          : "linear-gradient(90deg,#6366f1,#818cf8)",
                      transition: "width .4s ease",
                    }}
                  />
                </div>
                {userCount >= maxUsers && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#f87171" }}>
                    صارف کی حد پہنچ گئی۔{" "}
                    <Link prefetch={false} href="/dashboard/billing" style={{ color: "#f87171", fontWeight: 700 }}>
                      پلان اپگریڈ کریں ←
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {userCount} ٹیم ممبر — {plan.label} پلان پر لامحدود سیٹس
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTIVE MODULES (CUSTOM PLAN) ── */}
      {company.activeModules && planCode === "CUSTOM" && (
        <div style={card}>
          <div style={sectionLabel as React.CSSProperties}>
            <span>⭐</span> فعال ماڈیولز
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {company.activeModules
              .split(",")
              .filter(Boolean)
              .map((m) => (
                <span
                  key={m}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "20px",
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    color: "#fbbf24",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {m.trim()}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* ── QUICK LINKS ── */}
      {isAdmin && (
        <div style={card}>
          <div style={sectionLabel as React.CSSProperties}>
            <span>🔗</span> فوری لنکس
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
            {[
              { href: "/dashboard/users", label: "صارفین منیج کریں", icon: "👥", color: "#6366f1" },
              { href: "/dashboard/branches", label: "شاخیں منیج کریں", icon: "🏢", color: "#0891b2" },
              { href: "/dashboard/billing", label: "بلنگ اور پلان", icon: "💳", color: "#0d9488" },
              { href: "/dashboard/team", label: "ممبر مدعو کریں", icon: "✉️", color: "#d97706" },
              { href: "/dashboard/users/roles", label: "کردار اور رسائی", icon: "🔐", color: "#7c3aed" },
              { href: "/dashboard/users/logs", label: "سرگرمی لاگز", icon: "📋", color: "#64748b" },
            ].map((link) => (
              <Link prefetch={false}
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "var(--app-bg)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  transition: "border-color .15s",
                }}
              >
                <span style={{ fontSize: "16px" }}>{link.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
