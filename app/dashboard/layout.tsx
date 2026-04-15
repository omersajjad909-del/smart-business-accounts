"use client";
import { fmtDate } from "@/lib/dateUtils";

import { useEffect, useState, Suspense, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, setCurrentUser as storeUser, updateStoredUser } from "@/lib/auth";
import { logout } from "@/lib/logout";
import { hasPermission as baseHasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import GlobalSearch from "@/components/GlobalSearch";
import { useGlobalEnterNavigation } from "@/hooks/useGlobalEnterNavigation";
import { ModeToggle } from "@/components/mode-toggle";
import WhatsNew from "@/components/WhatsNew";
import { resolvePlanPermissions } from "@/lib/planPermissions";
import { hasModule as baseHasModule, type BusinessType } from "@/lib/businessModules";
import { findDashboardFeatureByRoute } from "@/lib/dashboardFeatureRegistry";

// Context to pass sidebarCollapsed + expand function to nav components
const SidebarCtx = createContext<{ collapsed: boolean; expand: () => void }>({ collapsed: false, expand: () => {} });

/* ── FinovaOS branded loading screen ─────────────────────── */
function FinovaLoader() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg,#080c1e 0%,#0d1035 50%,#080c1e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Outfit','Inter',sans-serif",
    }}>
      <style>{`
        @keyframes finova-spin { to { transform: rotate(360deg); } }
        @keyframes finova-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.92)} }
        @keyframes finova-fadeup { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes finova-bar { from{width:0} to{width:100%} }
        @keyframes finova-dot { 0%,80%,100%{opacity:.2;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes finova-glow { 0%,100%{box-shadow:0 0 24px rgba(99,102,241,.4)} 50%{box-shadow:0 0 48px rgba(99,102,241,.8),0 0 80px rgba(99,102,241,.3)} }
      `}</style>

      {/* Background grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"48px 48px", pointerEvents:"none" }}/>

      {/* Outer glow ring */}
      <div style={{
        position: "relative",
        width: 120, height: 120,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 32,
      }}>
        {/* Spinning ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2px solid transparent",
          borderTopColor: "#6366f1", borderRightColor: "rgba(99,102,241,.3)",
          animation: "finova-spin 1.2s linear infinite",
        }}/>
        {/* Inner spinning ring (opposite) */}
        <div style={{
          position: "absolute", inset: 8, borderRadius: "50%",
          border: "1.5px solid transparent",
          borderBottomColor: "#818cf8", borderLeftColor: "rgba(129,140,248,.3)",
          animation: "finova-spin 1.8s linear infinite reverse",
        }}/>
        {/* Logo icon */}
        <div style={{
          width: 90, height: 90,
          animation: "finova-glow 2s ease-in-out infinite",
        }}>
          <img src="/icon1.png" alt="FinovaOS" width={90} height={90} style={{objectFit:"contain"}}/>
        </div>
      </div>

      {/* Brand name */}
      <div style={{ animation: "finova-fadeup .5s ease .1s both", textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
          FinovaOS
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>
          Global Accounting & Business Suite
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ animation: "finova-fadeup .5s ease .25s both", width: 200, marginTop: 28 }}>
        <div style={{ height: 3, borderRadius: 8, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 8,
            background: "linear-gradient(90deg,#6366f1,#818cf8,#6366f1)",
            backgroundSize: "200% 100%",
            animation: "finova-bar 2s cubic-bezier(.4,0,.2,1) forwards",
          }}/>
        </div>
        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#6366f1",
              animation: `finova-dot 1.2s ease ${i * 0.18}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

type PermissionEntry = { permission: string } | string;

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  businessType?: string | null;
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

type Branch = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  isActive: boolean;
};

type AdminControlSettings = {
  branchAssignments?: Record<string, string[]>;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const initialUser = getCurrentUser() as CurrentUser;
  const initialDemoBusiness =
    typeof window !== "undefined" && initialUser?.email === "finovaos.app@gmail.com"
      ? (localStorage.getItem("finova_demo_business") as BusinessType | null)
      : null;
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const isAdmin = currentUser?.role?.toUpperCase() === "ADMIN";
  const [ready, setReady] = useState(false);
  const [allowedPlanPerms, setAllowedPlanPerms] = useState<Set<string> | null>(null);
  const [allowedDashboardFeatures, setAllowedDashboardFeatures] = useState<Set<string> | null>(null);

  // SIDEBAR STATES — single accordion state for top-level sections
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection(p => p === id ? null : id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const SW = sidebarCollapsed ? 64 : 260;
  // Sub-group states (independent within their parent section)
  const [openCatalog, setOpenCatalog] = useState(false);
  const [openInventory, setOpenInventory] = useState(false);
  const [openFinReports, setOpenFinReports] = useState(false);
  const [openInvReports, setOpenInvReports] = useState(false);
  const [openPhase1, setOpenPhase1] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [companyName, setCompanyName] = useState("US Traders");
  const [companyDetail, setCompanyDetail] = useState<any>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialDemoBusiness ||
      (initialUser?.businessType as BusinessType) ||
      "trading"
  );
  const [companyPlan, setCompanyPlan] = useState("STARTER");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allowedBranchIds, setAllowedBranchIds] = useState<string[] | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string>("all");
  // Admin-controlled business module enablement
  const [enabledTypes, setEnabledTypes] = useState<Set<string> | null>(null);

  // Force dark body background for dashboard
  useEffect(() => {
    document.documentElement.style.background = "#080c1e";
    document.body.style.background = "#080c1e";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch("/api/me/company");
        if (res.ok) {
          const data = await res.json();
          if (data?.name) setCompanyName(data.name);
          if (data?.plan) setCompanyPlan(String(data.plan));
          const preferredDemoBusiness =
            initialUser?.email === "finovaos.app@gmail.com" && typeof window !== "undefined"
              ? (localStorage.getItem("finova_demo_business") as BusinessType | null)
              : null;
          if (preferredDemoBusiness) {
            setBusinessType(preferredDemoBusiness);
          } else if (data?.businessType) {
            setBusinessType(data.businessType as BusinessType);
            updateStoredUser((parsed) => ({
              ...(parsed || {}),
              businessType: data.businessType,
              user: parsed?.user ? { ...parsed.user, businessType: data.businessType } : undefined,
            }));
          }
          setCompanyDetail(data);
        }
      } catch (err) {}
    }
    fetchCompany();
  }, []);

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

  const normalizedPlanCode =
    String(companyPlan || "STARTER").toUpperCase() === "PROFESSIONAL"
      ? "PRO"
      : String(companyPlan || "STARTER").toUpperCase();
  const isCustomPlan = normalizedPlanCode === "CUSTOM";
  const effectiveBusinessType = (isCustomPlan ? "__custom__" : businessType) as BusinessType;
  const hasModule = (type: BusinessType, module: Parameters<typeof baseHasModule>[1]) =>
    baseHasModule(isCustomPlan ? ("__custom__" as BusinessType) : type, module);
  const customActiveModules = new Set(
    String(companyDetail?.activeModules || "")
      .split(",")
      .map((mod) => String(mod || "").trim().toLowerCase().replace(/-/g, "_"))
      .filter(Boolean)
  );
  const hasCustomActiveModule = (moduleId: string) =>
    customActiveModules.has(String(moduleId || "").trim().toLowerCase().replace(/-/g, "_"));

  useEffect(() => {
    const loadFreshPermissions = async () => {
      let u = getCurrentUser() as CurrentUser;

      // If localStorage is empty but cookie exists, fetch user from server
      if (!u) {
        try {
          const res = await fetch("/api/me", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data?.user) {
              storeUser(data.user);
              u = data.user as CurrentUser;
            }
          }
        } catch {}
      }

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
            const status = String(cj.subscriptionStatus || "").toUpperCase();
            setIsPro(String(cj.plan || "").toUpperCase() === "PRO" && status === "ACTIVE");
            if (cj?.plan) setCompanyPlan(String(cj.plan));
            setSubInfo({ plan: String(cj.plan || "STARTER"), status });
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

  // Load plan-permission allowlist for menu gating
  useEffect(() => {
    (async () => {
      try {
        const c = await fetch("/api/me/company", { cache: "no-store" });
        const cfg = await fetch("/api/public/plan-config", { cache: "no-store" });
        if (c.ok && cfg.ok) {
          const cj = await c.json();
          if (cj?.plan) setCompanyPlan(String(cj.plan));
          const conf = await cfg.json();
          const list = resolvePlanPermissions({
            plan: cj?.plan,
            configuredPlanPermissions: conf?.planPermissions || null,
            activeModules: cj?.activeModules || null,
          });
          const planCode = String(cj?.plan || "STARTER").toUpperCase() === "PROFESSIONAL"
            ? "PRO"
            : String(cj?.plan || "STARTER").toUpperCase();
          const dashboardList =
            conf?.dashboardFeatureFlags?.[planCode] ||
            conf?.dashboardFeatureFlags?.[planCode.toLowerCase()] ||
            conf?.dashboardFeatureFlags?.[planCode.toUpperCase()] ||
            null;
          if (Array.isArray(list) && list.length > 0) {
            setAllowedPlanPerms(new Set(list));
          } else {
            setAllowedPlanPerms(null);
          }
          if (Array.isArray(dashboardList)) {
            setAllowedDashboardFeatures(new Set(dashboardList));
          } else {
            setAllowedDashboardFeatures(null);
          }
        }
      } catch {
        setAllowedPlanPerms(null);
        setAllowedDashboardFeatures(null);
      }
    })();
  }, []);

  const hasPermission = (user: any, perm: string) => {
    if (!allowedPlanPerms) return baseHasPermission(user, perm);
    return baseHasPermission(user, perm) && allowedPlanPerms.has(perm);
  };

  const canShowDashboardUtilities = !isCustomPlan;
  const canShowBranchSelector = branches.length > 0 && (!isCustomPlan || hasCustomActiveModule("multi_branch"));
  const showBankingSection =
    hasPermission(currentUser, PERMISSIONS.BANK_RECONCILIATION) ||
    hasPermission(currentUser, PERMISSIONS.EXPENSE_VOUCHERS) ||
    hasPermission(currentUser, PERMISSIONS.TAX_CONFIGURATION) ||
    (!isCustomPlan && hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD));
  const showSettingsSection =
    hasPermission(currentUser, PERMISSIONS.VIEW_SETTINGS) &&
    (!isCustomPlan ||
      hasCustomActiveModule("multi_branch") ||
      hasCustomActiveModule("whatsapp") ||
      hasCustomActiveModule("api_access"));

  const hasDashboardFeature = (featureId: string) => {
    if (!allowedDashboardFeatures) return true;
    return allowedDashboardFeatures.has(featureId);
  };

  // Load business type and redirect to setup if not done
  useEffect(() => {
    if (!ready || !currentUser?.companyId) return;
    const headers: Record<string, string> = {
      "x-company-id": currentUser.companyId,
      ...(currentUser.id   ? { "x-user-id":   currentUser.id }   : {}),
      ...(currentUser.role ? { "x-user-role": currentUser.role } : {}),
    };
    fetch("/api/company/business-type", { headers, cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const preferredDemoBusiness =
          initialUser?.email === "finovaos.app@gmail.com" && typeof window !== "undefined"
            ? (localStorage.getItem("finova_demo_business") as BusinessType | null)
            : null;
        if (preferredDemoBusiness) {
          setBusinessType(preferredDemoBusiness);
          updateStoredUser((parsed) => ({
            ...(parsed || {}),
            businessType: preferredDemoBusiness,
            user: parsed?.user ? { ...parsed.user, businessType: preferredDemoBusiness } : undefined,
          }));
        } else if (d.businessType) {
          setBusinessType(d.businessType as BusinessType);
          updateStoredUser((parsed) => ({
            ...(parsed || {}),
            businessType: d.businessType,
            user: parsed?.user ? { ...parsed.user, businessType: d.businessType } : undefined,
          }));
        }
        if (!d.businessSetupDone) router.replace("/business-setup");
      })
      .catch(() => {});
  }, [ready, currentUser?.companyId]);

  useEffect(() => {
    if (!ready) return;
    const feature = findDashboardFeatureByRoute(pathname);
    if (!feature) return;
    if (isCustomPlan) {
      router.replace("/dashboard");
      return;
    }
    const allowedBusinessTypes = feature.businessTypes?.length ? feature.businessTypes : [feature.business];
    if (!allowedBusinessTypes.includes(effectiveBusinessType)) {
      router.replace("/dashboard");
      return;
    }
    if (!hasDashboardFeature(feature.id)) {
      router.replace("/dashboard");
    }
  }, [ready, pathname, effectiveBusinessType, isCustomPlan, router, allowedDashboardFeatures]);

  // First-run guard: if logged-in but no company context, send to onboarding choose plan
  useEffect(() => {
    if (!ready) return;
    if (currentUser && !currentUser.companyId) {
      router.replace("/pricing");
    }
  }, [ready, currentUser?.companyId, router]);

  // Paywall: block dashboard until subscription is ACTIVE
  useEffect(() => {
    if (!ready || !subInfo) return;
    const status = subInfo.status.toUpperCase();
    const isActive = status === "ACTIVE";
    const onBilling = pathname.startsWith("/dashboard/billing");
    if (!isActive && !onBilling) {
      router.replace("/dashboard/billing?required=1");
    }
  }, [ready, subInfo, pathname, router]);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    const originalFetch = window.fetch;
    window.fetch = (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      if (!headers.has("x-company-id")) {
        headers.set("x-company-id", currentUser.companyId || "");
      }
      if (currentUser?.id && !headers.has("x-user-id")) {
        headers.set("x-user-id", currentUser.id);
      }
      if (currentUser?.role && !headers.has("x-user-role")) {
        headers.set("x-user-role", currentUser.role);
      }
      if (activeBranchId && !headers.has("x-branch-id")) {
        headers.set("x-branch-id", activeBranchId);
      }
      return originalFetch(input, { ...init, headers });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [currentUser?.companyId, currentUser?.id, currentUser?.role, activeBranchId]);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    const key = `finova_branch_${currentUser.companyId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setActiveBranchId(stored);
    } catch {}
  }, [currentUser?.companyId]);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    const key = `finova_branch_${currentUser.companyId}`;
    try {
      localStorage.setItem(key, activeBranchId);
    } catch {}
  }, [currentUser?.companyId, activeBranchId]);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    if (currentUser.role === "ADMIN") {
      setAllowedBranchIds(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/company/admin-control");
        if (!res.ok) return;
        const data: AdminControlSettings = await res.json();
        const assigned = data?.branchAssignments?.[currentUser.id];
        setAllowedBranchIds(Array.isArray(assigned) && assigned.length > 0 ? assigned : null);
      } catch {}
    })();
  }, [currentUser?.companyId, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.companyId) return;
    (async () => {
      try {
        const res = await fetch("/api/branches", {
          headers: {
            "x-user-id": currentUser.id || "",
            "x-user-role": currentUser.role || "",
            "x-company-id": currentUser.companyId || "",
          },
        });
        const data = await res.json();
        const list: Branch[] = Array.isArray(data) ? data : [];
        const scoped = allowedBranchIds?.length ? list.filter((b) => allowedBranchIds.includes(b.id)) : list;
        const activeOnly = scoped.filter(b => b.isActive !== false);
        setBranches(activeOnly);
        if (activeBranchId !== "all" && activeOnly.length && !activeOnly.some(b => b.id === activeBranchId)) {
          setActiveBranchId("all");
        }
      } catch {
        setBranches([]);
      }
    })();
  }, [activeBranchId, allowedBranchIds, currentUser?.companyId]);

  // Fetch admin-controlled business module enablement status
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/business-module-status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setEnabledTypes(new Set<string>(data.enabledTypes || []));
        }
      } catch {
        setEnabledTypes(null); // null = allow all (fallback)
      }
    })();
  }, []);

  // Returns true if this business type is globally enabled by admin (or status unknown).
  // IMPORTANT: always returns true for the user's OWN business type — existing users
  // should always see their sidebar modules regardless of admin phase-release settings.
  const isBusinessEnabled = (type: string) =>
    !enabledTypes || type === businessType || enabledTypes.has(type);

  if (!ready) {
    return <FinovaLoader />;
  }

  if (!currentUser) {
    return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#080c1e"}}>
        <div style={{color:"#f87171",fontWeight:700,fontSize:18}}>Session expired.</div>
        <button onClick={logout} style={{marginTop:16,color:"#a5b4fc",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontSize:14}}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{display:"flex",minHeight:"100vh",background:"var(--app-bg)",fontSize:13,color:"var(--text-primary)",position:"relative"}}>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:20}}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside style={{
        position:"fixed",
        top:0, left:0, bottom:0,
        width: SW,
        background:"var(--panel-bg)",
        borderRight:"1px solid var(--border)",
        display:"flex",
        flexDirection:"column",
        zIndex:30,
        transform: isMobileMenuOpen ? "translateX(0)" : undefined,
        transition:"width .25s ease, transform .3s ease",
        overflow:"hidden",
      }}
      className={!isMobileMenuOpen ? "max-md:hidden" : ""}
      >

        {/* ---- SIDEBAR HEADER ---- */}
        <div style={{padding: sidebarCollapsed ? "12px 8px" : "16px 16px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", alignItems: sidebarCollapsed ? "center" : "stretch"}}>
          {/* Logo + Brand */}
          <Link
            href="/dashboard"
            style={{
              display:"flex",
              alignItems:"center",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              gap:10,
              marginBottom: sidebarCollapsed ? 0 : 12,
              textDecoration:"none",
              padding: sidebarCollapsed ? "4px" : "6px 4px",
              borderRadius:12,
              background: pathname === "/dashboard" ? "rgba(99,102,241,0.12)" : "transparent",
              border: pathname === "/dashboard" ? "1px solid rgba(99,102,241,0.22)" : "1px solid transparent",
            }}
          >
            {/* Logo icon — always visible */}
            <img src="/icon1.png" alt="FinovaOS" width={42} height={42} style={{flexShrink:0,objectFit:"contain"}}/>
            {!sidebarCollapsed && (
              <div style={{display:"flex",flexDirection:"column",gap:1}}>
                <div style={{fontSize:14,fontWeight:800,color:"white",letterSpacing:"-.3px",lineHeight:1}}>FinovaOS</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",letterSpacing:".04em"}}>Business Suite</div>
              </div>
            )}
          </Link>
          {/* Branch selector removed — use Settings → Branches page */}
        </div>

        {/* ---- NAV ---- */}
        <SidebarCtx.Provider value={{ collapsed: sidebarCollapsed, expand: () => setSidebarCollapsed(false) }}>
        <nav style={{flex:1,overflowY:"auto",padding:"10px 10px",paddingBottom:80}}>

          {/* Dashboard utilities */}
          {canShowDashboardUtilities && hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD) && (
            <div style={{marginBottom:6}}>
              <NavLink href="/dashboard/business-guide" pathname={pathname}>Business Guide</NavLink>
              <NavLink href="/dashboard/owner-dashboard" pathname={pathname}>Owner Dashboard</NavLink>
              <NavLink href="/dashboard/ai" pathname={pathname}>AI Intelligence</NavLink>
              <NavLink href="/dashboard/operator" pathname={pathname}>Business Operator</NavLink>
            </div>
          )}

          {/* ── CRM ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_CRM) && (
            <NavGroup
              title="CRM"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
              open={openSection === "crm"}
              onToggle={() => toggle("crm")}
            >
              <NavLink href="/dashboard/crm" pathname={pathname}>CRM Overview</NavLink>
              <NavLink href="/dashboard/crm/contacts" pathname={pathname}>Contacts</NavLink>
              <NavLink href="/dashboard/crm/opportunities" pathname={pathname}>Opportunities</NavLink>
              <NavLink href="/dashboard/crm/interactions" pathname={pathname}>Interactions</NavLink>
            </NavGroup>
          )}

          {/* ── SALES & PURCHASE ── (hidden for retail which has its own groups) */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && !hasModule(businessType, "pos") && (
            <NavGroup
              title="Sales & Purchase"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>}
              open={openSection === "sales"}
              onToggle={() => toggle("sales")}
            >
              {/* ── Purchase Flow ── */}
              {hasPermission(currentUser, PERMISSIONS.CREATE_PURCHASE_ORDER) && <NavLink href="/dashboard/purchase-order" pathname={pathname}>Purchase Order</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/grn" pathname={pathname}>GRN (Goods Receipt)</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_PURCHASE_INVOICE) && <NavLink href="/dashboard/purchase-invoice" pathname={pathname}>Purchase Invoice</NavLink>}
              {/* ── Sales Flow ── */}
              {hasPermission(currentUser, PERMISSIONS.CREATE_QUOTATION) && <NavLink href="/dashboard/quotation" pathname={pathname}>Quotation / Estimate</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_SALES_INVOICE) && <NavLink href="/dashboard/sales-order" pathname={pathname}>Sales Order</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_DELIVERY_CHALLAN) && <NavLink href="/dashboard/delivery-challan" pathname={pathname}>Delivery Challan</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_SALES_INVOICE) && <NavLink href="/dashboard/sales-invoice" pathname={pathname}>Sales Invoice</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_SALE_RETURN) && <NavLink href="/dashboard/sale-return" pathname={pathname}>Sale Return</NavLink>}
              {/* ── Admin ── */}

              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/credit-limits" pathname={pathname}>Credit Limits</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/payment-receipts" pathname={pathname}>Payment Receipts</NavLink>}
            </NavGroup>
          )}

          {/* ── INVENTORY ── (hidden for retail which has its own inventory group) */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_CATALOG) && !hasModule(businessType, "pos") && (
            <NavGroup
              title="Inventory"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              open={openSection === "inventory"}
              onToggle={() => toggle("inventory")}
            >
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/inventory" pathname={pathname}>Inventory Overview</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_ITEMS) && <NavLink href="/dashboard/items-new" pathname={pathname}>Inventory Items</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/warehouses" pathname={pathname}>Warehouses</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_INVENTORY) && <NavLink href="/dashboard/price-lists" pathname={pathname}>Price Lists</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_STOCK_RATE) && <NavLink href="/dashboard/stock-rate" pathname={pathname}>Stock Rates</NavLink>}
              <NavLink href="/dashboard/barcode" pathname={pathname}>Barcode</NavLink>
            </NavGroup>
          )}

          {/* ── BANKING & PAYMENTS ── */}
          {showBankingSection && (
            <NavGroup
              title="Banking & Payments"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
              open={openSection === "banking"}
              onToggle={() => toggle("banking")}
            >
              {hasPermission(currentUser, PERMISSIONS.BANK_RECONCILIATION) && <NavLink href="/dashboard/bank-reconciliation" pathname={pathname}>Bank Reconciliation</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.EXPENSE_VOUCHERS) && <NavLink href="/dashboard/expense-vouchers" pathname={pathname}>Expense Vouchers</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.TAX_CONFIGURATION) && <NavLink href="/dashboard/tax-configuration" pathname={pathname}>Tax Configuration</NavLink>}
              {!isCustomPlan && hasPermission(currentUser, PERMISSIONS.VIEW_DASHBOARD) && <NavLink href="/dashboard/bulk-payments" pathname={pathname}>Bulk Payments</NavLink>}
            </NavGroup>
          )}

          {/* ── ACCOUNTING ── */}
          {(hasPermission(currentUser, PERMISSIONS.VIEW_ACCOUNTS) || hasPermission(currentUser, PERMISSIONS.VIEW_ACCOUNTING)) && (
            <NavGroup
              title="Accounting"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>}
              open={openSection === "accounting"}
              onToggle={() => toggle("accounting")}
            >
              {hasPermission(currentUser, PERMISSIONS.CREATE_ACCOUNTS) && <NavLink href="/dashboard/accounts" pathname={pathname}>Chart of Accounts</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_CPV) && <NavLink href="/dashboard/cpv" pathname={pathname}>CPV (Cash Payment)</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_CRV) && <NavLink href="/dashboard/crv" pathname={pathname}>CRV (Cash Receipt)</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.CREATE_CPV) && <NavLink href="/dashboard/jv" pathname={pathname}>Journal Voucher (JV)</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_ACCOUNTING) && <NavLink href="/dashboard/opening-balances" pathname={pathname}>Opening Balances</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_ACCOUNTING) && <NavLink href="/dashboard/advance-payment" pathname={pathname}>Advance Payment</NavLink>}
            </NavGroup>
          )}

          {/* ── HR & PAYROLL ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_HR_PAYROLL) && (
            <NavGroup
              title="HR & Payroll"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>}
              open={openSection === "hr"}
              onToggle={() => toggle("hr")}
            >
              <NavLink href="/dashboard/employees" pathname={pathname}>Employees</NavLink>
              <NavLink href="/dashboard/attendance" pathname={pathname}>Attendance</NavLink>
              <NavLink href="/dashboard/payroll" pathname={pathname}>Payroll</NavLink>
              <NavLink href="/dashboard/advance-salary" pathname={pathname}>Advance Salary</NavLink>
            </NavGroup>
          )}

          {/* ── FINANCIAL REPORTS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Financial Reports"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              open={openSection === "reports"}
              onToggle={() => toggle("reports")}
            >
              {hasPermission(currentUser, PERMISSIONS.VIEW_TRIAL_BALANCE_REPORT) && <NavLink href="/dashboard/reports/trial-balance" pathname={pathname}>Trial Balance</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_PROFIT_LOSS_REPORT) && <NavLink href="/dashboard/reports/profit-loss" pathname={pathname}>Profit & Loss</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_BALANCE_SHEET_REPORT) && <NavLink href="/dashboard/reports/balance-sheet" pathname={pathname}>Balance Sheet</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_LEDGER_REPORT) && <NavLink href="/dashboard/reports/ledger" pathname={pathname}>Ledger</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/reports/cash-flow" pathname={pathname}>Cash Flow</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/reports/tax-summary" pathname={pathname}>Tax Summary</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/customer-statement" pathname={pathname}>Customer Statement</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/supplier-statement" pathname={pathname}>Supplier Statement</NavLink>}
            </NavGroup>
          )}

          {/* ── ACTIVITY REPORTS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Activity Reports"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
              open={openSection === "activityReports"}
              onToggle={() => toggle("activityReports")}
            >
              {hasPermission(currentUser, PERMISSIONS.VIEW_AGEING_REPORT) && <NavLink href="/dashboard/reports/ageing" pathname={pathname}>Ageing Report</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/payment-followup" pathname={pathname}>Payment Follow-up</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_STOCK_SUMMARY) && <NavLink href="/dashboard/reports/stock" pathname={pathname}>Stock Report</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_SALES_REPORT) && <NavLink href="/dashboard/reports/sales" pathname={pathname}>Sales Report</NavLink>}
              {hasPermission(currentUser, PERMISSIONS.VIEW_FINANCIAL_REPORTS) && <NavLink href="/dashboard/audit-trail" pathname={pathname}>Audit Trail</NavLink>}
            </NavGroup>
          )}

          {/* ── ADVANCED FINANCIAL REPORTS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Advanced Financial"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
              open={openSection === "advancedFinancial"}
              onToggle={() => toggle("advancedFinancial")}
            >
              <NavLink href="/dashboard/reports/budget-vs-actual" pathname={pathname}>Budget vs Actual</NavLink>
              <NavLink href="/dashboard/reports/cogs" pathname={pathname}>COGS Report</NavLink>
              <NavLink href="/dashboard/reports/gross-margin" pathname={pathname}>Gross Margin</NavLink>
              <NavLink href="/dashboard/reports/expense-breakdown" pathname={pathname}>Expense Breakdown</NavLink>
              <NavLink href="/dashboard/reports/breakeven" pathname={pathname}>Breakeven Analysis</NavLink>
              <NavLink href="/dashboard/reports/tax-forecast" pathname={pathname}>Tax Forecast</NavLink>
              <NavLink href="/dashboard/reports/audit-exception" pathname={pathname}>Audit & Exceptions</NavLink>
            </NavGroup>
          )}

          {/* ── INVENTORY INTELLIGENCE ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Inventory Intelligence"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              open={openSection === "inventoryIntelligence"}
              onToggle={() => toggle("inventoryIntelligence")}
            >
              <NavLink href="/dashboard/reports/stock/movement" pathname={pathname}>Stock Movement</NavLink>
              <NavLink href="/dashboard/reports/stock/dead" pathname={pathname}>Dead Stock</NavLink>
              <NavLink href="/dashboard/reports/stock/turnover" pathname={pathname}>Stock Turnover</NavLink>
              <NavLink href="/dashboard/reports/stock/expiry" pathname={pathname}>Expiry Tracking</NavLink>
              <NavLink href="/dashboard/reports/stock/valuation" pathname={pathname}>Stock Valuation</NavLink>
              <NavLink href="/dashboard/reports/stock/warehouse" pathname={pathname}>Warehouse Stock</NavLink>
            </NavGroup>
          )}

          {/* ── SALES & CUSTOMER ANALYTICS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Sales Analytics"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
              open={openSection === "salesAnalytics"}
              onToggle={() => toggle("salesAnalytics")}
            >
              <NavLink href="/dashboard/reports/customer-profitability" pathname={pathname}>Customer Profitability</NavLink>
              <NavLink href="/dashboard/reports/salesman-performance" pathname={pathname}>Salesman Performance</NavLink>
              <NavLink href="/dashboard/reports/discount-analysis" pathname={pathname}>Discount Analysis</NavLink>
              <NavLink href="/dashboard/reports/sales-region" pathname={pathname}>Sales by Region</NavLink>
              <NavLink href="/dashboard/reports/product-profitability" pathname={pathname}>Product Profitability</NavLink>
              <NavLink href="/dashboard/reports/returns-analysis" pathname={pathname}>Returns Analysis</NavLink>
            </NavGroup>
          )}

          {/* ── RECEIVABLES & PAYABLES ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Receivables & Payables"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
              open={openSection === "receivablesPayables"}
              onToggle={() => toggle("receivablesPayables")}
            >
              <NavLink href="/dashboard/reports/supplier-ageing" pathname={pathname}>Supplier Ageing (AP)</NavLink>
              <NavLink href="/dashboard/reports/payment-history" pathname={pathname}>Payment History</NavLink>
              <NavLink href="/dashboard/reports/bad-debts" pathname={pathname}>Bad Debts</NavLink>
              <NavLink href="/dashboard/reports/credit-analysis" pathname={pathname}>Credit Analysis</NavLink>
            </NavGroup>
          )}

          {/* ── OPERATIONS REPORTS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Operations Reports"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
              open={openSection === "operationsReports"}
              onToggle={() => toggle("operationsReports")}
            >
              <NavLink href="/dashboard/reports/order-fulfillment" pathname={pathname}>Order Fulfillment</NavLink>
              <NavLink href="/dashboard/reports/delivery-performance" pathname={pathname}>Delivery Performance</NavLink>
              <NavLink href="/dashboard/reports/po-tracking" pathname={pathname}>PO Tracking</NavLink>
              <NavLink href="/dashboard/reports/supplier-performance" pathname={pathname}>Supplier Performance</NavLink>
            </NavGroup>
          )}

          {/* ── STRATEGIC REPORTS ── */}
          {hasPermission(currentUser, PERMISSIONS.VIEW_REPORTS) && (
            <NavGroup
              title="Strategic Reports"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
              open={openSection === "strategicReports"}
              onToggle={() => toggle("strategicReports")}
            >
              <NavLink href="/dashboard/reports/forecast" pathname={pathname}>Sales Forecast</NavLink>
              <NavLink href="/dashboard/reports/scenario" pathname={pathname}>Scenario Planning</NavLink>
            </NavGroup>
          )}

          {/* ── MANUFACTURING ── */}
          {businessType === "food_processing" && hasModule(businessType, "bom") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Food Processing"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 3h10v4H7z"/><path d="M6 7h12v5a6 6 0 01-6 6 6 6 0 01-6-6V7z"/><path d="M9 12h6"/><path d="M10 16h4"/></svg>}
              open={openSection === "food_processing"}
              onToggle={() => toggle("food_processing")}
            >
              {hasDashboardFeature("FOOD_PROCESSING_OVERVIEW") && <NavLink href="/dashboard/food-processing" pathname={pathname}>Overview</NavLink>}
              {hasDashboardFeature("FOOD_PROCESSING_RECIPE") && <NavLink href="/dashboard/food-processing/recipe-costing" pathname={pathname}>Recipe Costing</NavLink>}
              {hasDashboardFeature("MANUFACTURING_BOM") && <NavLink href="/dashboard/manufacturing/bom" pathname={pathname}>Recipe BOM</NavLink>}
              {hasDashboardFeature("MANUFACTURING_PRODUCTION_ORDERS") && <NavLink href="/dashboard/manufacturing/production-orders" pathname={pathname}>Production Orders</NavLink>}
              {hasDashboardFeature("MANUFACTURING_RAW_MATERIALS") && <NavLink href="/dashboard/manufacturing/raw-materials" pathname={pathname}>Raw Materials</NavLink>}
              {hasDashboardFeature("MANUFACTURING_FINISHED_GOODS") && <NavLink href="/dashboard/manufacturing/finished-goods" pathname={pathname}>Finished Goods</NavLink>}
              {hasDashboardFeature("FOOD_PROCESSING_ANALYTICS") && <NavLink href="/dashboard/food-processing/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}
          {businessType !== "food_processing" && hasModule(businessType, "bom") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Manufacturing"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
              open={openSection === "manufacturing"}
              onToggle={() => toggle("manufacturing")}
            >
              {hasDashboardFeature("MANUFACTURING_OVERVIEW") && <NavLink href="/dashboard/manufacturing" pathname={pathname}>Manufacturing Overview</NavLink>}
              {hasDashboardFeature("MANUFACTURING_BOM") && <NavLink href="/dashboard/manufacturing/bom" pathname={pathname}>Bill of Materials</NavLink>}
              {hasDashboardFeature("MANUFACTURING_PRODUCTION_ORDERS") && <NavLink href="/dashboard/manufacturing/production-orders" pathname={pathname}>Production Orders</NavLink>}
              {hasDashboardFeature("MANUFACTURING_WORK_ORDERS") && <NavLink href="/dashboard/manufacturing/work-orders" pathname={pathname}>Work Orders</NavLink>}
              {hasDashboardFeature("MANUFACTURING_RAW_MATERIALS") && <NavLink href="/dashboard/manufacturing/raw-materials" pathname={pathname}>Raw Materials</NavLink>}
              {hasDashboardFeature("MANUFACTURING_FINISHED_GOODS") && <NavLink href="/dashboard/manufacturing/finished-goods" pathname={pathname}>Finished Goods</NavLink>}
              {hasDashboardFeature("MANUFACTURING_QUALITY") && <NavLink href="/dashboard/manufacturing/quality" pathname={pathname}>Quality Control</NavLink>}
            </NavGroup>
          )}
          {hasModule(businessType, "restaurant_tables") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Restaurant"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>}
              open={openSection === "restaurant"}
              onToggle={() => toggle("restaurant")}
            >
              {hasDashboardFeature("RESTAURANT_OVERVIEW") && <NavLink href="/dashboard/restaurant" pathname={pathname}>Restaurant Overview</NavLink>}
              {hasDashboardFeature("RESTAURANT_ORDER_BOARD") && <NavLink href="/dashboard/restaurant/orders" pathname={pathname}>Order Board</NavLink>}
              {hasDashboardFeature("RESTAURANT_RESERVATIONS") && <NavLink href="/dashboard/restaurant/reservations" pathname={pathname}>Reservations</NavLink>}
              {hasDashboardFeature("RESTAURANT_TABLES") && <NavLink href="/dashboard/restaurant/tables" pathname={pathname}>Table Management</NavLink>}
              {hasDashboardFeature("RESTAURANT_MENU") && <NavLink href="/dashboard/restaurant/menu" pathname={pathname}>Menu Items</NavLink>}
              {hasDashboardFeature("RESTAURANT_KITCHEN") && <NavLink href="/dashboard/restaurant/kitchen" pathname={pathname}>Kitchen Orders</NavLink>}
              {hasDashboardFeature("RESTAURANT_RECIPE_COSTING") && <NavLink href="/dashboard/restaurant/recipe-costing" pathname={pathname}>Recipe Costing</NavLink>}
              {hasDashboardFeature("RESTAURANT_ANALYTICS") && <NavLink href="/dashboard/restaurant/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── REAL ESTATE ── */}
          {hasModule(businessType, "re_properties") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Real Estate"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
              open={openSection === "realEstate"}
              onToggle={() => toggle("realEstate")}
            >
              {hasDashboardFeature("REAL_ESTATE_OVERVIEW") && <NavLink href="/dashboard/real-estate" pathname={pathname}>Real Estate Overview</NavLink>}
              {hasDashboardFeature("REAL_ESTATE_PROPERTIES") && <NavLink href="/dashboard/real-estate/properties" pathname={pathname}>Properties</NavLink>}
              {hasDashboardFeature("REAL_ESTATE_TENANTS") && <NavLink href="/dashboard/real-estate/tenants" pathname={pathname}>Tenants</NavLink>}
              {hasDashboardFeature("REAL_ESTATE_RENT") && <NavLink href="/dashboard/real-estate/rent" pathname={pathname}>Rent Collection</NavLink>}
              {hasDashboardFeature("REAL_ESTATE_LEASES") && <NavLink href="/dashboard/real-estate/leases" pathname={pathname}>Lease Agreements</NavLink>}
              {hasDashboardFeature("REAL_ESTATE_ANALYTICS") && <NavLink href="/dashboard/real-estate/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── CONSTRUCTION ── */}
          {hasModule(businessType, "projects") && !hasModule(businessType, "re_properties") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Construction"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
              open={openSection === "construction"}
              onToggle={() => toggle("construction")}
            >
              {hasDashboardFeature("CONSTRUCTION_OVERVIEW") && <NavLink href="/dashboard/construction" pathname={pathname}>Construction Overview</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_PROJECTS") && <NavLink href="/dashboard/construction/projects" pathname={pathname}>Projects</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_SITES") && <NavLink href="/dashboard/construction/sites" pathname={pathname}>Site Management</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_MATERIALS") && <NavLink href="/dashboard/construction/materials" pathname={pathname}>Material Control</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_BOQ") && <NavLink href="/dashboard/construction/boq" pathname={pathname}>BOQ Control</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_BILLING") && <NavLink href="/dashboard/construction/billing" pathname={pathname}>Progress Billing</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_EXPENSES") && <NavLink href="/dashboard/construction/expenses" pathname={pathname}>Site Expenses</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_SUBCONTRACTORS") && <NavLink href="/dashboard/construction/subcontractors" pathname={pathname}>Subcontractors</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_CONTRACTOR_PAYMENTS") && <NavLink href="/dashboard/construction/contractor-payments" pathname={pathname}>Contractor Payments</NavLink>}
              {hasDashboardFeature("CONSTRUCTION_ANALYTICS") && <NavLink href="/dashboard/construction/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── DISTRIBUTION ── */}
          {hasModule(businessType, "routes") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Distribution"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
              open={openSection === "distribution"}
              onToggle={() => toggle("distribution")}
            >
              {hasDashboardFeature("DISTRIBUTION_ROUTES") && <NavLink href="/dashboard/distribution/routes" pathname={pathname}>Routes</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_DELIVERY") && <NavLink href="/dashboard/distribution/delivery" pathname={pathname}>Delivery Tracking</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_VAN_SALES") && <NavLink href="/dashboard/distribution/van-sales" pathname={pathname}>Van Sales</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_STOCK_ON_VAN") && <NavLink href="/dashboard/distribution/stock-on-van" pathname={pathname}>Stock On Van</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_COLLECTIONS") && <NavLink href="/dashboard/distribution/collections" pathname={pathname}>Collections</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_ANALYTICS") && <NavLink href="/dashboard/distribution/analytics" pathname={pathname}>Analytics</NavLink>}
              {hasDashboardFeature("DISTRIBUTION_TRIP_SHEET") && <NavLink href="/dashboard/distribution/trip-sheet" pathname={pathname}>Trip Sheet</NavLink>}
            </NavGroup>
          )}

          {/* ══════════════════════════════════════════
              RETAIL & MULTI-STORE MODULES
              (visible when businessType === "retail")
          ══════════════════════════════════════════ */}
          {hasModule(businessType, "pos") && isBusinessEnabled(businessType) && (<>

            {/* ── 1. POS ── */}
            <NavGroup
              title="🖥️ Point of Sale"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
              open={openSection === "retailPos"}
              onToggle={() => toggle("retailPos")}
            >
              {hasDashboardFeature("RETAIL_POS") && <NavLink href="/dashboard/retail/pos" pathname={pathname}>POS Terminal</NavLink>}
              {hasDashboardFeature("RETAIL_POS_SESSIONS") && <NavLink href="/dashboard/retail/pos-sessions" pathname={pathname}>POS Sessions</NavLink>}
              {hasDashboardFeature("RETAIL_DISCOUNTS") && <NavLink href="/dashboard/retail/discounts" pathname={pathname}>Discounts & Promotions</NavLink>}
              {hasDashboardFeature("RETAIL_LOYALTY") && <NavLink href="/dashboard/retail/loyalty" pathname={pathname}>Loyalty Points</NavLink>}
              {hasDashboardFeature("RETAIL_STOCK_TRANSFER") && <NavLink href="/dashboard/retail/stock-transfer" pathname={pathname}>Stock Transfer</NavLink>}
              {hasDashboardFeature("RETAIL_ONLINE_SYNC") && <NavLink href="/dashboard/retail/online-sync" pathname={pathname}>Online Store Sync</NavLink>}
              {hasDashboardFeature("RETAIL_SUPPLIER_PORTAL") && <NavLink href="/dashboard/retail/supplier-portal" pathname={pathname}>Supplier Portal</NavLink>}
            </NavGroup>

            {/* ── 2. Sales ── */}
            <NavGroup
              title="📋 Sales"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
              open={openSection === "retailSales"}
              onToggle={() => toggle("retailSales")}
            >
              <NavLink href="/dashboard/sales-invoice" pathname={pathname}>🧾 Sales Invoices</NavLink>
              <NavLink href="/dashboard/sale-return" pathname={pathname}>↩️ Sales Returns</NavLink>
              <NavLink href="/dashboard/quotation" pathname={pathname}>📄 Quotations</NavLink>
              <NavLink href="/dashboard/delivery-challan" pathname={pathname}>🚚 Delivery Challan</NavLink>
              <NavLink href="/dashboard/payment-receipts" pathname={pathname}>💳 Payment Collection</NavLink>
            </NavGroup>

            {/* ── 3. Purchases ── */}
            <NavGroup
              title="🛒 Purchases"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
              open={openSection === "retailPurchases"}
              onToggle={() => toggle("retailPurchases")}
            >
              <NavLink href="/dashboard/purchase-order" pathname={pathname}>📦 Purchase Orders</NavLink>
              <NavLink href="/dashboard/grn" pathname={pathname}>📥 GRN (Goods Receipt)</NavLink>
              <NavLink href="/dashboard/purchase-invoice" pathname={pathname}>🧾 Purchase Invoices</NavLink>
              <NavLink href="/dashboard/purchase-return" pathname={pathname}>↩️ Purchase Returns</NavLink>
              <NavLink href="/dashboard/expense-vouchers" pathname={pathname}>💸 Supplier Payments</NavLink>
            </NavGroup>

            {/* ── 4. Inventory ── */}
            <NavGroup
              title="📦 Inventory"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              open={openSection === "retailInventory"}
              onToggle={() => toggle("retailInventory")}
            >
              <NavLink href="/dashboard/items-new" pathname={pathname}>📋 Item Master</NavLink>
              {hasDashboardFeature("RETAIL_CATALOG") && <NavLink href="/dashboard/retail/catalog" pathname={pathname}>Product Catalog</NavLink>}
              <NavLink href="/dashboard/barcode" pathname={pathname}>🔲 Barcode Management</NavLink>
              {hasDashboardFeature("RETAIL_STOCK_TRANSFER") && <NavLink href="/dashboard/retail/stock-transfer" pathname={pathname}>Stock Transfer</NavLink>}
              {hasDashboardFeature("RETAIL_STOCK_ADJUSTMENT") && <NavLink href="/dashboard/retail/stock-adjustment" pathname={pathname}>Stock Adjustment</NavLink>}
              {hasDashboardFeature("RETAIL_BATCH_EXPIRY") && <NavLink href="/dashboard/retail/batch-expiry" pathname={pathname}>Batch & Expiry</NavLink>}
              <NavLink href="/dashboard/inventory" pathname={pathname}>📊 Inventory Overview</NavLink>
              <NavLink href="/dashboard/stock-rate" pathname={pathname}>💰 Stock Rates</NavLink>
              <NavLink href="/dashboard/reports/stock/low" pathname={pathname}>🚨 Reorder Alerts</NavLink>
            </NavGroup>

            {/* ── 5. Customers ── */}
            <NavGroup
              title="👥 Customers"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
              open={openSection === "retailCustomers"}
              onToggle={() => toggle("retailCustomers")}
            >
              {hasDashboardFeature("RETAIL_CUSTOMERS") && <NavLink href="/dashboard/retail/customers" pathname={pathname}>Customer List</NavLink>}
              <NavLink href="/dashboard/credit-limits" pathname={pathname}>Credit Limits</NavLink>
              <NavLink href="/dashboard/reports/ledger" pathname={pathname}>📒 Customer Ledger</NavLink>
              <NavLink href="/dashboard/reports/ageing" pathname={pathname}>📅 Ageing Report</NavLink>
              {hasDashboardFeature("RETAIL_LOYALTY") && <NavLink href="/dashboard/retail/loyalty" pathname={pathname}>Loyalty Points</NavLink>}
              <NavLink href="/dashboard/crm/contacts" pathname={pathname}>🤝 CRM Contacts</NavLink>
            </NavGroup>

            {/* ── 6. Suppliers ── */}
            <NavGroup
              title="🏭 Suppliers"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>}
              open={openSection === "retailSuppliers"}
              onToggle={() => toggle("retailSuppliers")}
            >
              {hasDashboardFeature("RETAIL_SUPPLIERS") && <NavLink href="/dashboard/retail/suppliers" pathname={pathname}>Supplier List</NavLink>}
              <NavLink href="/dashboard/reports/ageing" pathname={pathname}>📅 Supplier Ageing</NavLink>
            </NavGroup>

            {/* ── 11. Multi-Store ── */}
            <NavGroup
              title="🏪 Multi-Store"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
              open={openSection === "multiStore"}
              onToggle={() => toggle("multiStore")}
            >
              {hasDashboardFeature("RETAIL_BRANCHES") && <NavLink href="/dashboard/retail/branches" pathname={pathname}>Branches</NavLink>}
              {hasDashboardFeature("RETAIL_STOCK_TRANSFER") && <NavLink href="/dashboard/retail/stock-transfer" pathname={pathname}>Inter-Branch Transfer</NavLink>}
              {hasDashboardFeature("RETAIL_BRANCH_USERS") && <NavLink href="/dashboard/retail/branch-users" pathname={pathname}>Branch Users</NavLink>}
              {hasDashboardFeature("RETAIL_BRANCH_REPORTS") && <NavLink href="/dashboard/retail/branch-reports" pathname={pathname}>Branch Reports</NavLink>}
            </NavGroup>

          </>)}

          {/* ── SCHOOL ── */}
          {hasModule(businessType, "student_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup title="School" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>} open={openSection === "school"} onToggle={() => toggle("school")}>
              {hasDashboardFeature("SCHOOL_OVERVIEW") && <NavLink href="/dashboard/school" pathname={pathname}>School Overview</NavLink>}
              {hasDashboardFeature("SCHOOL_ADMISSIONS") && <NavLink href="/dashboard/school/admissions" pathname={pathname}>Admissions</NavLink>}
              {hasDashboardFeature("SCHOOL_STUDENTS") && <NavLink href="/dashboard/school/students" pathname={pathname}>Students</NavLink>}
              {hasDashboardFeature("SCHOOL_ATTENDANCE") && <NavLink href="/dashboard/school/attendance" pathname={pathname}>Attendance</NavLink>}
              {hasDashboardFeature("SCHOOL_TEACHERS") && <NavLink href="/dashboard/school/teachers" pathname={pathname}>Teachers & Rooms</NavLink>}
              {hasDashboardFeature("SCHOOL_FEES") && <NavLink href="/dashboard/school/fees" pathname={pathname}>Fee Collection</NavLink>}
              {hasDashboardFeature("SCHOOL_SCHEDULE") && <NavLink href="/dashboard/school/schedule" pathname={pathname}>Class Schedule</NavLink>}
              {hasDashboardFeature("SCHOOL_EXAMS") && <NavLink href="/dashboard/school/exams" pathname={pathname}>Exam Results</NavLink>}
              {hasDashboardFeature("SCHOOL_ANALYTICS") && <NavLink href="/dashboard/school/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Hospital / Clinic */}
          {hasModule(businessType, "patient_records") && isBusinessEnabled(businessType) && (
            <NavGroup title="Hospital / Clinic" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} open={openSection === "hospital"} onToggle={() => toggle("hospital")}>
              {hasDashboardFeature("HEALTHCARE_OVERVIEW") && <NavLink href="/dashboard/hospital" pathname={pathname}>Healthcare Overview</NavLink>}
              {hasDashboardFeature("HEALTHCARE_PATIENTS") && <NavLink href="/dashboard/hospital/patients" pathname={pathname}>Patients</NavLink>}
              {hasDashboardFeature("HEALTHCARE_APPOINTMENTS") && <NavLink href="/dashboard/hospital/appointments" pathname={pathname}>Appointments</NavLink>}
              {hasDashboardFeature("HEALTHCARE_PRESCRIPTIONS") && <NavLink href="/dashboard/hospital/prescriptions" pathname={pathname}>Prescriptions</NavLink>}
              {hasDashboardFeature("HEALTHCARE_LAB") && <NavLink href="/dashboard/hospital/lab" pathname={pathname}>Lab Tests</NavLink>}
              {hasDashboardFeature("HEALTHCARE_ANALYTICS") && <NavLink href="/dashboard/hospital/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── HOTEL ── */}
          {hasModule(businessType, "room_booking") && isBusinessEnabled(businessType) && (
            <NavGroup title="Hotel" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>} open={openSection === "hotel"} onToggle={() => toggle("hotel")}>
              {hasDashboardFeature("HOTEL_OVERVIEW") && <NavLink href="/dashboard/hotel" pathname={pathname}>Hotel Overview</NavLink>}
              {hasDashboardFeature("HOTEL_ROOMS") && <NavLink href="/dashboard/hotel/rooms" pathname={pathname}>Room Booking</NavLink>}
              {hasDashboardFeature("HOTEL_FRONT_DESK") && <NavLink href="/dashboard/hotel/front-desk" pathname={pathname}>Front Desk</NavLink>}
              {hasDashboardFeature("HOTEL_HOUSEKEEPING") && <NavLink href="/dashboard/hotel/housekeeping" pathname={pathname}>Housekeeping</NavLink>}
              {hasDashboardFeature("HOTEL_ROOM_SERVICE") && <NavLink href="/dashboard/hotel/room-service" pathname={pathname}>Room Service</NavLink>}
              {hasDashboardFeature("HOTEL_FOLIOS") && <NavLink href="/dashboard/hotel/folios" pathname={pathname}>Billing Folios</NavLink>}
              {hasDashboardFeature("HOTEL_GUEST_HISTORY") && <NavLink href="/dashboard/hotel/guest-history" pathname={pathname}>Guest History</NavLink>}
              {hasDashboardFeature("HOTEL_ANALYTICS") && <NavLink href="/dashboard/hotel/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── PHARMACY ── */}
          {hasModule(businessType, "drug_inventory") && isBusinessEnabled(businessType) && (
            <NavGroup title="Pharmacy" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.5 20H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v3"/><circle cx="18" cy="18" r="3"/><path d="M18 15v6M15 18h6"/></svg>} open={openSection === "pharmacy"} onToggle={() => toggle("pharmacy")}>
              <NavLink href="/dashboard/pharmacy/inventory" pathname={pathname}>💊 Drug Inventory</NavLink>
              <NavLink href="/dashboard/pharmacy/prescriptions" pathname={pathname}>📋 Prescriptions</NavLink>
              <NavLink href="/dashboard/pharmacy/expiry" pathname={pathname}>⚠️ Expiry Tracking</NavLink>
            </NavGroup>
          )}

          {/* ── SALON ── */}
          {hasModule(businessType, "appointments_salon") && isBusinessEnabled(businessType) && (
            <NavGroup title="Salon" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>} open={openSection === "salon"} onToggle={() => toggle("salon")}>
              {hasDashboardFeature("SALON_OVERVIEW") && <NavLink href="/dashboard/salon" pathname={pathname}>Salon Overview</NavLink>}
              {hasDashboardFeature("SALON_APPOINTMENTS") && <NavLink href="/dashboard/salon/appointments" pathname={pathname}>Appointments</NavLink>}
              {hasDashboardFeature("SALON_STYLISTS") && <NavLink href="/dashboard/salon/stylists" pathname={pathname}>Stylists</NavLink>}
              {hasDashboardFeature("SALON_SERVICES") && <NavLink href="/dashboard/salon/services" pathname={pathname}>Service Menu</NavLink>}
              {hasDashboardFeature("SALON_PACKAGES") && <NavLink href="/dashboard/salon/packages" pathname={pathname}>Beauty Packages</NavLink>}
              {hasDashboardFeature("SALON_CLIENT_HISTORY") && <NavLink href="/dashboard/salon/client-history" pathname={pathname}>Client History</NavLink>}
              {hasDashboardFeature("SALON_ANALYTICS") && <NavLink href="/dashboard/salon/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Gym */}
          {hasModule(businessType, "memberships") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Gym"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8v8"/><path d="M18 8v8"/><path d="M2 10h4"/><path d="M18 10h4"/><path d="M2 14h4"/><path d="M18 14h4"/><path d="M8 12h8"/></svg>}
              open={openSection === "gym"}
              onToggle={() => toggle("gym")}
            >
              {hasDashboardFeature("GYM_OVERVIEW") && <NavLink href="/dashboard/gym" pathname={pathname}>Gym Overview</NavLink>}
              {hasDashboardFeature("GYM_MEMBERSHIPS") && <NavLink href="/dashboard/gym/memberships" pathname={pathname}>Memberships</NavLink>}
              {hasDashboardFeature("GYM_CLASSES") && <NavLink href="/dashboard/gym/classes" pathname={pathname}>Classes</NavLink>}
              {hasDashboardFeature("GYM_TRAINERS") && <NavLink href="/dashboard/gym/trainers" pathname={pathname}>Trainers</NavLink>}
              {hasDashboardFeature("GYM_ANALYTICS") && <NavLink href="/dashboard/gym/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── TRANSPORT ── */}
          {hasModule(businessType, "fleet_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup title="Transport" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>} open={openSection === "transport"} onToggle={() => toggle("transport")}>
              {hasDashboardFeature("TRANSPORT_OVERVIEW") && <NavLink href="/dashboard/transport" pathname={pathname}>Transport Overview</NavLink>}
              {hasDashboardFeature("TRANSPORT_FLEET") && <NavLink href="/dashboard/transport/fleet" pathname={pathname}>Fleet</NavLink>}
              {hasDashboardFeature("TRANSPORT_TRIPS") && <NavLink href="/dashboard/transport/trips" pathname={pathname}>Trips</NavLink>}
              {hasDashboardFeature("TRANSPORT_DISPATCH") && <NavLink href="/dashboard/transport/dispatch" pathname={pathname}>Dispatch Board</NavLink>}
              {hasDashboardFeature("TRANSPORT_DRIVERS") && <NavLink href="/dashboard/transport/drivers" pathname={pathname}>Drivers</NavLink>}
              {hasDashboardFeature("TRANSPORT_FUEL") && <NavLink href="/dashboard/transport/fuel" pathname={pathname}>Fuel Tracking</NavLink>}
              {hasDashboardFeature("TRANSPORT_MAINTENANCE") && <NavLink href="/dashboard/transport/maintenance" pathname={pathname}>Maintenance</NavLink>}
              {hasDashboardFeature("TRANSPORT_EXPENSES") && <NavLink href="/dashboard/transport/expenses" pathname={pathname}>Trip Expenses</NavLink>}
              {hasDashboardFeature("TRANSPORT_ANALYTICS") && <NavLink href="/dashboard/transport/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Agriculture */}
          {hasModule(businessType, "crop_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Agriculture"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-11V3l-8 4-8-4v8c0 7 8 11 8 11z"/><path d="M12 7v15"/></svg>}
              open={openSection === "agriculture"}
              onToggle={() => toggle("agriculture")}
            >
              {hasDashboardFeature("AGRICULTURE_OVERVIEW") && <NavLink href="/dashboard/agriculture" pathname={pathname}>Farm Overview</NavLink>}
              {hasDashboardFeature("AGRICULTURE_CROPS") && <NavLink href="/dashboard/agriculture/crops" pathname={pathname}>Crops</NavLink>}
              {hasDashboardFeature("AGRICULTURE_LIVESTOCK") && <NavLink href="/dashboard/agriculture/livestock" pathname={pathname}>Livestock</NavLink>}
              {hasDashboardFeature("AGRICULTURE_FIELDS") && <NavLink href="/dashboard/agriculture/fields" pathname={pathname}>Fields</NavLink>}
              {hasDashboardFeature("AGRICULTURE_HARVEST") && <NavLink href="/dashboard/agriculture/harvest" pathname={pathname}>Harvest</NavLink>}
              {hasDashboardFeature("AGRICULTURE_ANALYTICS") && <NavLink href="/dashboard/agriculture/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* NGO */}
          {hasModule(businessType, "donor_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="NGO"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 11c0 5.65-7 10-7 10z"/><path d="M12 7v8"/><path d="M8 11h8"/></svg>}
              open={openSection === "ngo"}
              onToggle={() => toggle("ngo")}
            >
              {hasDashboardFeature("NGO_OVERVIEW") && <NavLink href="/dashboard/ngo" pathname={pathname}>NGO Overview</NavLink>}
              {hasDashboardFeature("NGO_DONORS") && <NavLink href="/dashboard/ngo/donors" pathname={pathname}>Donors</NavLink>}
              {hasDashboardFeature("NGO_GRANTS") && <NavLink href="/dashboard/ngo/grants" pathname={pathname}>Grants</NavLink>}
              {hasDashboardFeature("NGO_BENEFICIARIES") && <NavLink href="/dashboard/ngo/beneficiaries" pathname={pathname}>Beneficiaries</NavLink>}
              {hasDashboardFeature("NGO_FUNDS") && <NavLink href="/dashboard/ngo/funds" pathname={pathname}>Fund Accounting</NavLink>}
              {hasDashboardFeature("NGO_ANALYTICS") && <NavLink href="/dashboard/ngo/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── E-COMMERCE ── */}
          {hasModule(businessType, "product_listings") && isBusinessEnabled(businessType) && (
            <NavGroup title="E-Commerce" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57l1.65-7.43H6"/></svg>} open={openSection === "ecommerce"} onToggle={() => toggle("ecommerce")}>
              {hasDashboardFeature("ECOMMERCE_OVERVIEW") && <NavLink href="/dashboard/ecommerce" pathname={pathname}>Ecommerce Overview</NavLink>}
              {hasDashboardFeature("ECOMMERCE_PRODUCTS") && <NavLink href="/dashboard/ecommerce/products" pathname={pathname}>Product Listings</NavLink>}
              {hasDashboardFeature("ECOMMERCE_ORDERS") && <NavLink href="/dashboard/ecommerce/orders" pathname={pathname}>Orders</NavLink>}
              {hasDashboardFeature("ECOMMERCE_RETURNS") && <NavLink href="/dashboard/ecommerce/returns" pathname={pathname}>Returns</NavLink>}
              {hasDashboardFeature("ECOMMERCE_SHIPPING") && <NavLink href="/dashboard/ecommerce/shipping" pathname={pathname}>Shipping</NavLink>}
              {hasDashboardFeature("ECOMMERCE_ANALYTICS") && <NavLink href="/dashboard/ecommerce/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Law Firm */}
          {hasModule(businessType, "case_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Law Firm"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z"/><path d="M9 12h6"/><path d="M10.5 9.5h3"/><path d="M10.5 14.5h3"/></svg>}
              open={openSection === "law"}
              onToggle={() => toggle("law")}
            >
              {hasDashboardFeature("LAW_OVERVIEW") && <NavLink href="/dashboard/law-firm" pathname={pathname}>Law Overview</NavLink>}
              {hasDashboardFeature("LAW_CASES") && <NavLink href="/dashboard/law-firm/cases" pathname={pathname}>Cases</NavLink>}
              {hasDashboardFeature("LAW_CLIENTS") && <NavLink href="/dashboard/law-firm/clients" pathname={pathname}>Clients</NavLink>}
              {hasDashboardFeature("LAW_BILLING") && <NavLink href="/dashboard/law-firm/billing" pathname={pathname}>Legal Billing</NavLink>}
              {hasDashboardFeature("LAW_TIME_BILLING") && <NavLink href="/dashboard/law-firm/time-billing" pathname={pathname}>Time Billing</NavLink>}
              {hasDashboardFeature("LAW_ANALYTICS") && <NavLink href="/dashboard/law-firm/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* IT Company */}
          {hasModule(businessType, "project_mgmt") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="IT Projects"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>}
              open={openSection === "it"}
              onToggle={() => toggle("it")}
            >
              {hasDashboardFeature("IT_OVERVIEW") && <NavLink href="/dashboard/it" pathname={pathname}>IT Overview</NavLink>}
              {hasDashboardFeature("IT_PROJECTS") && <NavLink href="/dashboard/it/projects" pathname={pathname}>Projects</NavLink>}
              {hasDashboardFeature("IT_SPRINTS") && <NavLink href="/dashboard/it/sprints" pathname={pathname}>Sprints</NavLink>}
              {hasDashboardFeature("IT_CONTRACTS") && <NavLink href="/dashboard/it/contracts" pathname={pathname}>Contracts</NavLink>}
              {hasDashboardFeature("IT_SUPPORT") && <NavLink href="/dashboard/it/support" pathname={pathname}>Support Tickets</NavLink>}
              {hasDashboardFeature("IT_ANALYTICS") && <NavLink href="/dashboard/it/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Automotive */}
          {hasModule(businessType, "vehicle_inventory") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Showroom"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17h14l-1-5H6l-1 5z"/><path d="M7 12l1.5-4h7L17 12"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/></svg>}
              open={openSection === "showroom"}
              onToggle={() => toggle("showroom")}
            >
              {hasDashboardFeature("AUTOMOTIVE_OVERVIEW") && <NavLink href="/dashboard/automotive" pathname={pathname}>Showroom Overview</NavLink>}
              {hasDashboardFeature("AUTOMOTIVE_VEHICLES") && <NavLink href="/dashboard/automotive/vehicles" pathname={pathname}>Vehicle Stock</NavLink>}
              {hasDashboardFeature("AUTOMOTIVE_TEST_DRIVES") && <NavLink href="/dashboard/automotive/test-drives" pathname={pathname}>Test Drives</NavLink>}
              {hasDashboardFeature("AUTOMOTIVE_DEALS") && <NavLink href="/dashboard/automotive/deals" pathname={pathname}>Deals & Finance</NavLink>}
              {hasDashboardFeature("AUTOMOTIVE_ANALYTICS") && <NavLink href="/dashboard/automotive/analytics" pathname={pathname}>Analytics</NavLink>}
              <NavLink href="/dashboard/crm/contacts" pathname={pathname}>Customers</NavLink>
            </NavGroup>
          )}

            {hasModule(businessType, "service_jobs") && (
              <NavGroup
                title="Workshop / Jobs"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 01-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-3 3-2-2 3-3z"/></svg>}
              open={openSection === "workshop"}
              onToggle={() => toggle("workshop")}
              >
               {hasDashboardFeature("WORKSHOP_OVERVIEW") && <NavLink href="/dashboard/workshop" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("WORKSHOP_JOBS") && <NavLink href="/dashboard/workshop/jobs" pathname={pathname}>Job Cards</NavLink>}
               {hasDashboardFeature("WORKSHOP_PARTS") && <NavLink href="/dashboard/workshop/parts" pathname={pathname}>Parts Used</NavLink>}
               {hasDashboardFeature("WORKSHOP_MECHANICS") && <NavLink href="/dashboard/workshop/mechanics" pathname={pathname}>Mechanics</NavLink>}
               {hasDashboardFeature("WORKSHOP_WARRANTY") && <NavLink href="/dashboard/workshop/warranty" pathname={pathname}>Warranty</NavLink>}
               {hasDashboardFeature("WORKSHOP_ANALYTICS") && <NavLink href="/dashboard/workshop/analytics" pathname={pathname}>Analytics</NavLink>}
              </NavGroup>
            )}

          {hasModule(businessType, "vehicle_rental") && (
            <NavGroup title="Vehicle Rental" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} open={openSection === "carRental"} onToggle={() => toggle("carRental")}>
              <NavLink href="/dashboard/rental/bookings" pathname={pathname}>Bookings</NavLink>
              <NavLink href="/dashboard/transport/fleet" pathname={pathname}>Fleet Status</NavLink>
              <NavLink href="/dashboard/rental/agreements" pathname={pathname}>Agreements</NavLink>
              <NavLink href="/dashboard/transport/fuel" pathname={pathname}>Fuel Log</NavLink>
            </NavGroup>
          )}

          {/* Repair & Maintenance */}
            {hasModule(businessType, "repair_jobs") && (
              <NavGroup
                title="Repair Jobs"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7.5l-4.5 4.5-4-4L17 3.5A5 5 0 009.5 10L3 16.5V21h4.5l6.5-6.5A5 5 0 0021 7.5z"/></svg>}
              open={openSection === "repair"}
              onToggle={() => toggle("repair")}
              >
               {hasDashboardFeature("REPAIR_OVERVIEW") && <NavLink href="/dashboard/repair" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("REPAIR_JOBS") && <NavLink href="/dashboard/repair/jobs" pathname={pathname}>Job Cards</NavLink>}
               {hasDashboardFeature("REPAIR_PARTS") && <NavLink href="/dashboard/repair/parts" pathname={pathname}>Spare Parts</NavLink>}
               {hasDashboardFeature("REPAIR_WARRANTY") && <NavLink href="/dashboard/repair/warranty" pathname={pathname}>Warranty</NavLink>}
               {hasDashboardFeature("REPAIR_TECHNICIANS") && <NavLink href="/dashboard/repair/technicians" pathname={pathname}>Technicians</NavLink>}
               {hasDashboardFeature("REPAIR_ANALYTICS") && <NavLink href="/dashboard/repair/analytics" pathname={pathname}>Analytics</NavLink>}
              </NavGroup>
            )}

            {hasModule(businessType, "maintenance_schedule") && (
              <NavGroup
                title="Maintenance"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l2.2 4.8L19 9l-4.8 2.2L12 16l-2.2-4.8L5 9l4.8-2.2L12 2z"/><path d="M4 20l4-4"/><path d="M16 16l4 4"/></svg>}
              open={openSection === "maintenance"}
              onToggle={() => toggle("maintenance")}
              >
               {hasDashboardFeature("MAINTENANCE_OVERVIEW") && <NavLink href="/dashboard/maintenance" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("MAINTENANCE_CONTRACTS") && <NavLink href="/dashboard/maintenance/contracts" pathname={pathname}>AMC Contracts</NavLink>}
               {hasDashboardFeature("MAINTENANCE_SCHEDULE") && <NavLink href="/dashboard/maintenance/schedule" pathname={pathname}>Service Schedule</NavLink>}
               {hasDashboardFeature("MAINTENANCE_JOBS") && <NavLink href="/dashboard/maintenance/jobs" pathname={pathname}>Service Jobs</NavLink>}
               {hasDashboardFeature("MAINTENANCE_PARTS") && <NavLink href="/dashboard/maintenance/parts" pathname={pathname}>Parts & Stock</NavLink>}
               {hasDashboardFeature("MAINTENANCE_ANALYTICS") && <NavLink href="/dashboard/maintenance/analytics" pathname={pathname}>Analytics</NavLink>}
              </NavGroup>
            )}

          {/* Media & Advertising */}
            {hasModule(businessType, "ad_campaigns") && (
              <NavGroup
                title="Campaigns"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11v2"/><path d="M7 9v6"/><path d="M11 6v12"/><path d="M15 9v6"/><path d="M19 4v16"/></svg>}
              open={openSection === "media"}
              onToggle={() => toggle("media")}
              >
               {hasDashboardFeature("MEDIA_OVERVIEW") && <NavLink href="/dashboard/media" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("MEDIA_CAMPAIGNS") && <NavLink href="/dashboard/media/campaigns" pathname={pathname}>Campaigns</NavLink>}
               {hasDashboardFeature("MEDIA_CLIENTS") && <NavLink href="/dashboard/media/clients" pathname={pathname}>Clients</NavLink>}
               {hasDashboardFeature("MEDIA_PLAN") && <NavLink href="/dashboard/media/media-plan" pathname={pathname}>Media Plan</NavLink>}
               {hasDashboardFeature("MEDIA_ANALYTICS") && <NavLink href="/dashboard/media/analytics" pathname={pathname}>Analytics</NavLink>}
                <NavLink href="/dashboard/quotation" pathname={pathname}>Quotations</NavLink>
              </NavGroup>
            )}

          {hasModule(businessType, "print_jobs") && (
            <NavGroup title="Print Jobs" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>} open={openSection === "printJobs"} onToggle={() => toggle("printJobs")}>
              <NavLink href="/dashboard/printing/orders" pathname={pathname}>Print Orders</NavLink>
              <NavLink href="/dashboard/printing/paper-stock" pathname={pathname}>Paper & Ink Stock</NavLink>
              <NavLink href="/dashboard/printing/delivery" pathname={pathname}>Delivery</NavLink>
              <NavLink href="/dashboard/quotation" pathname={pathname}>Quotations</NavLink>
            </NavGroup>
          )}

          {/* Subscriptions / SaaS / ISP */}
          {hasModule(businessType, "subscriptions") && (
            <NavGroup
              title="Subscriptions"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>}
              open={openSection === "subscriptions"}
              onToggle={() => toggle("subscriptions")}
            >
              {hasDashboardFeature("SUBSCRIPTIONS_OVERVIEW") && <NavLink href="/dashboard/subscriptions" pathname={pathname}>SaaS Overview</NavLink>}
              {hasDashboardFeature("SUBSCRIPTIONS_PLANS") && <NavLink href="/dashboard/subscriptions/plans" pathname={pathname}>Plans</NavLink>}
              {hasDashboardFeature("SUBSCRIPTIONS_SUBSCRIBERS") && <NavLink href="/dashboard/subscriptions/subscribers" pathname={pathname}>Subscribers</NavLink>}
              {hasDashboardFeature("SUBSCRIPTIONS_BILLING") && <NavLink href="/dashboard/subscriptions/billing" pathname={pathname}>Recurring Billing</NavLink>}
              {hasDashboardFeature("SUBSCRIPTIONS_MRR") && <NavLink href="/dashboard/subscriptions/mrr" pathname={pathname}>MRR / ARR</NavLink>}
              {businessType === "membership_website" && hasDashboardFeature("MEMBERSHIP_CONTENT_TIERS") && <NavLink href="/dashboard/subscriptions/content-tiers" pathname={pathname}>Content Tiers</NavLink>}
              {businessType === "membership_website" && hasDashboardFeature("MEMBERSHIP_MEMBER_ACCESS") && <NavLink href="/dashboard/subscriptions/member-access" pathname={pathname}>Member Access</NavLink>}
              {businessType === "subscription_box" && hasDashboardFeature("BOX_CATALOG") && <NavLink href="/dashboard/subscriptions/box-catalog" pathname={pathname}>Box Catalog</NavLink>}
              {businessType === "subscription_box" && hasDashboardFeature("BOX_FULFILLMENT") && <NavLink href="/dashboard/subscriptions/fulfillment" pathname={pathname}>Fulfillment Cycles</NavLink>}
            </NavGroup>
          )}

          {hasModule(businessType, "bandwidth_mgmt") && (
            <NavGroup
              title="ISP Management"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.5a10 10 0 0114 0"/><path d="M8.5 16a5 5 0 017 0"/><path d="M12 20h.01"/></svg>}
              open={openSection === "isp"}
              onToggle={() => toggle("isp")}
            >
              {hasDashboardFeature("ISP_OVERVIEW") && <NavLink href="/dashboard/isp" pathname={pathname}>ISP Overview</NavLink>}
              {hasDashboardFeature("ISP_CONNECTIONS") && <NavLink href="/dashboard/isp/connections" pathname={pathname}>Connections</NavLink>}
              {hasDashboardFeature("ISP_BILLING") && <NavLink href="/dashboard/isp/billing" pathname={pathname}>Monthly Bills</NavLink>}
              {hasDashboardFeature("ISP_PACKAGES") && <NavLink href="/dashboard/isp/packages" pathname={pathname}>Packages</NavLink>}
              {hasDashboardFeature("ISP_SUPPORT") && <NavLink href="/dashboard/isp/support" pathname={pathname}>Support Tickets</NavLink>}
            </NavGroup>
          )}

          {/* Energy / Solar */}
          {(businessType === "electric_company" || businessType === "gas_distribution" || businessType === "water_supply") && isBusinessEnabled(businessType) && (
            <NavGroup
              title="Utilities"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L6 14h5l-1 8 7-12h-5l1-8z"/></svg>}
              open={openSection === "utilities"}
              onToggle={() => toggle("utilities")}
            >
              {hasDashboardFeature("UTILITIES_OVERVIEW") && <NavLink href="/dashboard/utilities" pathname={pathname}>Overview</NavLink>}
              {hasDashboardFeature("UTILITIES_CONNECTIONS") && <NavLink href="/dashboard/utilities/connections" pathname={pathname}>Connections</NavLink>}
              {hasDashboardFeature("UTILITIES_BILLING") && <NavLink href="/dashboard/utilities/billing" pathname={pathname}>Utility Billing</NavLink>}
              {hasDashboardFeature("UTILITIES_METERS") && <NavLink href="/dashboard/utilities/meters" pathname={pathname}>Meter Readings</NavLink>}
              {hasDashboardFeature("UTILITIES_ANALYTICS") && <NavLink href="/dashboard/utilities/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}
            {hasModule(businessType, "solar_projects") && (
              <NavGroup
                title="Solar Projects"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>}
              open={openSection === "solar"}
              onToggle={() => toggle("solar")}
              >
               {hasDashboardFeature("SOLAR_OVERVIEW") && <NavLink href="/dashboard/solar" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("SOLAR_PROJECTS") && <NavLink href="/dashboard/solar/projects" pathname={pathname}>Projects</NavLink>}
               {hasDashboardFeature("SOLAR_EQUIPMENT") && <NavLink href="/dashboard/solar/equipment" pathname={pathname}>Equipment Stock</NavLink>}
               {hasDashboardFeature("SOLAR_AMC") && <NavLink href="/dashboard/solar/amc" pathname={pathname}>AMC Schedule</NavLink>}
               {hasDashboardFeature("SOLAR_ANALYTICS") && <NavLink href="/dashboard/solar/analytics" pathname={pathname}>Analytics</NavLink>}
                <NavLink href="/dashboard/quotation" pathname={pathname}>Quotations</NavLink>
              </NavGroup>
            )}

          {/* ── IMPORT / EXPORT ── */}
          {hasModule(businessType, "shipments") && (
            <NavGroup title="Import / Export" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} open={openSection === "shipments"} onToggle={() => toggle("shipments")}>
              {hasDashboardFeature("TRADE_OVERVIEW") && <NavLink href="/dashboard/trade" pathname={pathname}>Trade Overview</NavLink>}
              {hasDashboardFeature("TRADE_SHIPMENTS") && <NavLink href="/dashboard/trade/shipments" pathname={pathname}>Shipments</NavLink>}
              {hasDashboardFeature("TRADE_COMMERCIAL_INVOICE") && <NavLink href="/dashboard/commercial-invoice" pathname={pathname}>Commercial Invoice</NavLink>}
              {hasDashboardFeature("TRADE_PACKING_LIST") && <NavLink href="/dashboard/packing-list" pathname={pathname}>Packing List</NavLink>}
              {hasDashboardFeature("TRADE_LC") && <NavLink href="/dashboard/trade/lc" pathname={pathname}>LC / TT</NavLink>}
              {hasDashboardFeature("TRADE_CUSTOMS") && <NavLink href="/dashboard/trade/customs" pathname={pathname}>Customs</NavLink>}
              {hasDashboardFeature("TRADE_IMPORT_COSTING") && <NavLink href="/dashboard/trade/costing" pathname={pathname}>Import Costing</NavLink>}
              {hasDashboardFeature("TRADE_REBATE") && <NavLink href="/dashboard/trade/rebate" pathname={pathname}>Rebate / Drawback</NavLink>}
              {hasDashboardFeature("TRADE_ANALYTICS") && <NavLink href="/dashboard/trade/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* Event Management */}
            {hasModule(businessType, "event_bookings") && (
              <NavGroup
                title="Events"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/></svg>}
              open={openSection === "events"}
              onToggle={() => toggle("events")}
              >
               {hasDashboardFeature("EVENTS_OVERVIEW") && <NavLink href="/dashboard/events" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("EVENTS_BOOKINGS") && <NavLink href="/dashboard/events/bookings" pathname={pathname}>Bookings</NavLink>}
               {hasDashboardFeature("EVENTS_VENDORS") && <NavLink href="/dashboard/events/vendors" pathname={pathname}>Vendors</NavLink>}
               {hasDashboardFeature("EVENTS_BUDGET") && <NavLink href="/dashboard/events/budget" pathname={pathname}>Event Budget</NavLink>}
               {hasDashboardFeature("EVENTS_ANALYTICS") && <NavLink href="/dashboard/events/analytics" pathname={pathname}>Analytics</NavLink>}
                <NavLink href="/dashboard/quotation" pathname={pathname}>Quotations</NavLink>
              </NavGroup>
            )}

          {/* Rental Business */}
            {hasModule(businessType, "rental_items") && (
              <NavGroup
                title="Rentals"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 18v3"/><path d="M17 18v3"/><path d="M8 10h8"/></svg>}
              open={openSection === "rentals"}
              onToggle={() => toggle("rentals")}
              >
               {hasDashboardFeature("RENTALS_OVERVIEW") && <NavLink href="/dashboard/rentals" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("RENTALS_ITEMS") && <NavLink href="/dashboard/rentals/items" pathname={pathname}>Rental Items</NavLink>}
               {hasDashboardFeature("RENTALS_BOOKINGS") && <NavLink href="/dashboard/rentals/bookings" pathname={pathname}>Bookings</NavLink>}
               {hasDashboardFeature("RENTALS_AGREEMENTS") && <NavLink href="/dashboard/rentals/agreements" pathname={pathname}>Agreements</NavLink>}
               {hasDashboardFeature("RENTALS_MAINTENANCE") && <NavLink href="/dashboard/rentals/maintenance" pathname={pathname}>Maintenance</NavLink>}
               {hasDashboardFeature("RENTALS_ANALYTICS") && <NavLink href="/dashboard/rentals/analytics" pathname={pathname}>Analytics</NavLink>}
              </NavGroup>
            )}

          {/* Franchise */}
            {hasModule(businessType, "franchise_outlets") && (
              <NavGroup
                title="Franchise"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>}
              open={openSection === "franchise"}
              onToggle={() => toggle("franchise")}
              >
               {hasDashboardFeature("FRANCHISE_OVERVIEW") && <NavLink href="/dashboard/franchise" pathname={pathname}>Overview</NavLink>}
               {hasDashboardFeature("FRANCHISE_OUTLETS") && <NavLink href="/dashboard/franchise/outlets" pathname={pathname}>Outlets</NavLink>}
               {hasDashboardFeature("FRANCHISE_ROYALTY") && <NavLink href="/dashboard/franchise/royalty" pathname={pathname}>Royalty</NavLink>}
               {hasDashboardFeature("FRANCHISE_ANALYTICS") && <NavLink href="/dashboard/franchise/analytics" pathname={pathname}>Analytics</NavLink>}
               {hasDashboardFeature("RETAIL_BRANCH_REPORTS") && <NavLink href="/dashboard/retail/branch-reports" pathname={pathname}>Branch Reports</NavLink>}
               {hasDashboardFeature("RETAIL_STOCK_TRANSFER") && <NavLink href="/dashboard/retail/stock-transfer" pathname={pathname}>Stock Transfer</NavLink>}
              </NavGroup>
          )}

          {/* Professional Firms */}
          {hasModule(businessType, "audit_files") && (
            <NavGroup
              title="Audit / Accounting"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></svg>}
              open={openSection === "firm"}
              onToggle={() => toggle("firm")}
            >
              {hasDashboardFeature("FIRM_OVERVIEW") && <NavLink href="/dashboard/firm" pathname={pathname}>Firm Overview</NavLink>}
              {hasDashboardFeature("FIRM_CLIENTS") && <NavLink href="/dashboard/firm/clients" pathname={pathname}>Clients</NavLink>}
              {hasDashboardFeature("FIRM_PROJECTS") && <NavLink href="/dashboard/firm/projects" pathname={pathname}>Engagements</NavLink>}
              {hasDashboardFeature("FIRM_BILLING") && <NavLink href="/dashboard/firm/billing" pathname={pathname}>Fee Billing</NavLink>}
              {hasDashboardFeature("FIRM_TIMESHEETS") && <NavLink href="/dashboard/firm/timesheets" pathname={pathname}>Timesheets</NavLink>}
              {hasDashboardFeature("AUDIT_PLANNING") && <NavLink href="/dashboard/firm/audit-planning" pathname={pathname}>Audit Planning</NavLink>}
              {hasDashboardFeature("AUDIT_FINDINGS") && <NavLink href="/dashboard/firm/findings" pathname={pathname}>Audit Findings</NavLink>}
              {hasDashboardFeature("FIRM_ANALYTICS") && <NavLink href="/dashboard/firm/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {hasModule(businessType, "consulting_projects") && (
            <NavGroup
              title="Consultancy"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/></svg>}
              open={openSection === "consultancy"}
              onToggle={() => toggle("consultancy")}
            >
              {hasDashboardFeature("FIRM_OVERVIEW") && <NavLink href="/dashboard/firm" pathname={pathname}>Firm Overview</NavLink>}
              {hasDashboardFeature("FIRM_CLIENTS") && <NavLink href="/dashboard/firm/clients" pathname={pathname}>Clients</NavLink>}
              {hasDashboardFeature("FIRM_PROJECTS") && <NavLink href="/dashboard/firm/projects" pathname={pathname}>Engagements</NavLink>}
              {hasDashboardFeature("CONSULTANCY_PROPOSALS") && <NavLink href="/dashboard/firm/proposals" pathname={pathname}>Proposals</NavLink>}
              {hasDashboardFeature("CONSULTANCY_DELIVERABLES") && <NavLink href="/dashboard/firm/deliverables" pathname={pathname}>Deliverables</NavLink>}
              {hasDashboardFeature("FIRM_BILLING") && <NavLink href="/dashboard/firm/billing" pathname={pathname}>Fee Billing</NavLink>}
              {hasDashboardFeature("FIRM_TIMESHEETS") && <NavLink href="/dashboard/firm/timesheets" pathname={pathname}>Timesheets</NavLink>}
              {hasDashboardFeature("FIRM_ANALYTICS") && <NavLink href="/dashboard/firm/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {hasModule(businessType, "architectural_drawings") && (
            <NavGroup
              title="Architecture"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>}
              open={openSection === "architecture"}
              onToggle={() => toggle("architecture")}
            >
              {hasDashboardFeature("FIRM_OVERVIEW") && <NavLink href="/dashboard/firm" pathname={pathname}>Firm Overview</NavLink>}
              {hasDashboardFeature("FIRM_CLIENTS") && <NavLink href="/dashboard/firm/clients" pathname={pathname}>Clients</NavLink>}
              {hasDashboardFeature("FIRM_PROJECTS") && <NavLink href="/dashboard/firm/projects" pathname={pathname}>Projects</NavLink>}
              {hasDashboardFeature("ARCH_DESIGN_BRIEFS") && <NavLink href="/dashboard/firm/design-briefs" pathname={pathname}>Design Briefs</NavLink>}
              {hasDashboardFeature("ARCH_DRAWINGS") && <NavLink href="/dashboard/firm/drawings" pathname={pathname}>Drawings</NavLink>}
              {hasDashboardFeature("ARCH_MILESTONES") && <NavLink href="/dashboard/firm/milestones" pathname={pathname}>Milestones</NavLink>}
              {hasDashboardFeature("FIRM_BILLING") && <NavLink href="/dashboard/firm/billing" pathname={pathname}>Fee Billing</NavLink>}
              {hasDashboardFeature("FIRM_TIMESHEETS") && <NavLink href="/dashboard/firm/timesheets" pathname={pathname}>Timesheets</NavLink>}
              {hasDashboardFeature("FIRM_ANALYTICS") && <NavLink href="/dashboard/firm/analytics" pathname={pathname}>Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── SERVICES / AGENCY ── */}
          {businessType === "service" && (
            <NavGroup
              title="Services & Agency"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>}
              open={openSection === "services"}
              onToggle={() => toggle("services")}
            >
              {hasDashboardFeature("SERVICE_OVERVIEW") && <NavLink href="/dashboard/services" pathname={pathname}>Service Overview</NavLink>}
              {hasDashboardFeature("SERVICE_CATALOG") && <NavLink href="/dashboard/services/catalog" pathname={pathname}>Service Catalog</NavLink>}
              {hasDashboardFeature("SERVICE_PROJECTS") && <NavLink href="/dashboard/services/projects" pathname={pathname}>Client Projects</NavLink>}
              {hasDashboardFeature("SERVICE_DELIVERY") && <NavLink href="/dashboard/services/delivery" pathname={pathname}>Delivery Tracker</NavLink>}
              {hasDashboardFeature("SERVICE_TIME_BILLING") && <NavLink href="/dashboard/services/time-billing" pathname={pathname}>Time Billing</NavLink>}
              <NavLink href="/dashboard/quotation" pathname={pathname}>📋 Quotations</NavLink>
              <NavLink href="/dashboard/crm/contacts" pathname={pathname}>🤝 Clients</NavLink>
              <NavLink href="/dashboard/crm/opportunities" pathname={pathname}>📈 Pipeline</NavLink>
            </NavGroup>
          )}

          {/* ── WHOLESALE / TRADING ── */}
          {!isCustomPlan && businessType === "trading" && (
            <NavGroup
              title="Trading Control"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
              open={openSection === "wholesale"}
              onToggle={() => toggle("wholesale")}
            >
              {hasDashboardFeature("TRADING_OVERVIEW") && <NavLink href="/dashboard/trading" pathname={pathname}>Trading Overview</NavLink>}
              {hasDashboardFeature("TRADING_ORDER_DESK") && <NavLink href="/dashboard/trading/order-desk" pathname={pathname}>Order Desk</NavLink>}
              {hasDashboardFeature("TRADING_PROCUREMENT") && <NavLink href="/dashboard/trading/procurement" pathname={pathname}>Procurement</NavLink>}
              {hasDashboardFeature("TRADING_STOCK_CONTROL") && <NavLink href="/dashboard/trading/stock-control" pathname={pathname}>Stock Control</NavLink>}
              {hasDashboardFeature("TRADING_OUTSTANDINGS") && <NavLink href="/dashboard/trading/outstandings" pathname={pathname}>Outstandings</NavLink>}
              {hasDashboardFeature("TRADING_DISPATCH_BOARD") && <NavLink href="/dashboard/trading/dispatch-board" pathname={pathname}>Dispatch Board</NavLink>}
              {hasDashboardFeature("TRADING_CONVERSION_CENTER") && <NavLink href="/dashboard/trading/conversion-center" pathname={pathname}>Conversion Center</NavLink>}
              {hasDashboardFeature("TRADING_ANALYTICS") && <NavLink href="/dashboard/trading/analytics" pathname={pathname}>Trading Analytics</NavLink>}
            </NavGroup>
          )}

          {/* ── ADMIN ── */}
          {hasPermission(currentUser, PERMISSIONS.MANAGE_USERS) && (
            <NavGroup
              title="Admin"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              open={openSection === "admin"}
              onToggle={() => toggle("admin")}
            >
              <NavLink href="/dashboard/admin-control" pathname={pathname}>Admin Control Center</NavLink>
              <NavLink href="/dashboard/users" pathname={pathname}>Users & Permissions</NavLink>
              <NavLink href="/dashboard/roles-permissions" pathname={pathname}>Roles & Permissions</NavLink>
              <NavLink href="/dashboard/team" pathname={pathname}>Team</NavLink>
              {hasPermission(currentUser, PERMISSIONS.VIEW_LOGS) && <NavLink href="/dashboard/users/logs" pathname={pathname}>System Logs</NavLink>}
            </NavGroup>
          )}

          {/* ── SETTINGS ── */}
          {showSettingsSection && (
            <NavGroup
              title="Settings"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>}
              open={openSection === "settings"}
              onToggle={() => toggle("settings")}
            >
              {(!isCustomPlan || hasCustomActiveModule("multi_branch")) && <NavLink href="/dashboard/branches" pathname={pathname}>Branches</NavLink>}
              {(!isCustomPlan || hasCustomActiveModule("multi_branch")) && <NavLink href="/dashboard/cost-centers" pathname={pathname}>Cost Centers</NavLink>}
              {!isCustomPlan && hasPermission(currentUser, PERMISSIONS.FINANCIAL_YEAR) && <NavLink href="/dashboard/financial-year" pathname={pathname}>Financial Year</NavLink>}
              {!isCustomPlan && hasPermission(currentUser, PERMISSIONS.BUDGET_PLANNING) && <NavLink href="/dashboard/budget" pathname={pathname}>Budget Planning</NavLink>}
              {!isCustomPlan && hasPermission(currentUser, PERMISSIONS.BACKUP_RESTORE) && <NavLink href="/dashboard/backup-restore" pathname={pathname}>Backup & Restore</NavLink>}
              {/* {(!isCustomPlan || hasCustomActiveModule("whatsapp")) && <NavLink href="/dashboard/notifications" pathname={pathname}>Notifications & SMS</NavLink>} */}
              {!isCustomPlan && <NavLink href="/dashboard/security-access" pathname={pathname}>Security & Access</NavLink>}
              {(!isCustomPlan || hasCustomActiveModule("api_access")) && <NavLink href="/dashboard/integrations" pathname={pathname}>Integrations</NavLink>}
            </NavGroup>
          )}

        </nav>
        </SidebarCtx.Provider>

        {/* ---- SIDEBAR FOOTER ---- */}
        <div style={{borderTop:"1px solid var(--border)",background:"var(--panel-bg-2)",position:"relative"}}>

          {/* Collapse Toggle Button */}
          <div style={{borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              style={{
                display:"flex", alignItems:"center", gap:8,
                width:"100%", padding:"10px 14px",
                background:"transparent", border:"none", cursor:"pointer",
                color:"rgba(255,255,255,0.4)", fontFamily:"inherit", fontSize:12,
                transition:"background .15s, color .15s",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
              }}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.4)";}}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{flexShrink:0, transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)", transition:"transform .25s"}}>
                <path d="M11 19l-7-7 7-7"/><path d="M21 19l-7-7 7-7"/>
              </svg>
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>

          {/* ── User Menu Popup ── */}
          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setShowUserMenu(false)}/>
              {/* Popup panel — slides up from footer */}
              <div style={{
                position:"absolute",bottom:"100%",left:12,right:12,marginBottom:8,
                background:"#0e1120",border:"1px solid rgba(255,255,255,0.12)",
                borderRadius:14,padding:"6px",zIndex:50,
                boxShadow:"0 -20px 60px rgba(0,0,0,0.6)",
              }}>
                {/* Company info at top */}
                <div style={{padding:"12px 12px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🏢</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{companyName}</div>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginTop:1,textTransform:"capitalize"}}>
                        {companyDetail?.businessType ? companyDetail.businessType.replace(/_/g," ") : "Business"} · {companyDetail?.plan || "STARTER"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                {[
                  { icon:"🏢", label:"Company Profile",    href:"/dashboard/company-profile" },
                  { icon:"👥", label:"Team Members",        href:"/dashboard/team" },
                  { icon:"🔔", label:"Notifications",       href:"/dashboard/notifications" },
                  { icon:"🎁", label:"Refer & Earn",        href:"/dashboard/referrals" },
                  { icon:"⭐", label:"Share Your Review",   href:"/dashboard/feedback" },
                ].map(item => (
                  <a key={item.href} href={item.href} onClick={()=>setShowUserMenu(false)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,color:"rgba(255,255,255,0.65)",fontSize:12,fontWeight:500,textDecoration:"none",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.65)";}}>
                    <span style={{fontSize:14,width:18,textAlign:"center"}}>{item.icon}</span>
                    {item.label}
                  </a>
                ))}

                <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",marginTop:4,paddingTop:4}}>
                  <button onClick={logout}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,background:"transparent",border:"none",color:"#f87171",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s",textAlign:"left"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.1)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Clickable User Row ── */}
          <div
            onClick={()=>setShowUserMenu(v=>!v)}
            style={{
              display:"flex",alignItems:"center",gap:10,
              padding: sidebarCollapsed ? "12px 0" : "12px 14px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              cursor:"pointer",
              transition:"background .15s",
              background: showUserMenu ? "rgba(255,255,255,0.05)" : "transparent",
            }}
            onMouseEnter={e=>{if(!showUserMenu)e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
            onMouseLeave={e=>{if(!showUserMenu)e.currentTarget.style.background="transparent";}}
          >
            {/* Avatar */}
            <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>
              {(currentUser.name || currentUser.email || "U")[0].toUpperCase()}
            </div>
            {/* Name + company */}
            {!sidebarCollapsed && (
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.85)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.name || "User"}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{companyName}</div>
              </div>
            )}
            {/* Chevron up/down */}
            {!sidebarCollapsed && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" style={{flexShrink:0,transform:showUserMenu?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            )}
          </div>
        </div>

      </aside>

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",minWidth:0,marginLeft:SW,transition:"margin-left .25s ease"}} className="max-md:ml-0">

        {/* ---- TOPBAR ---- */}
        <div style={{background:"var(--panel-bg)",borderBottom:"1px solid var(--border)",padding:"0 16px",height:56,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:10}} className="print:hidden">

          {/* HAMBURGER */}
          <button
            style={{display:"none",padding:"6px",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",borderRadius:8}}
            className="max-md:flex"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Global Search */}
          <Suspense fallback={<div style={{width:"100%",maxWidth:340,height:36,background:"rgba(255,255,255,0.04)",borderRadius:8,animation:"pulse 1.5s infinite"}} />}>
            <GlobalSearch />
          </Suspense>

          {/* Branch switcher */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:8}}>
            <select
              style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"5px 10px",fontSize:12,background:"#0d1430",color:"rgba(255,255,255,0.85)",outline:"none",cursor:"pointer",minWidth:120,colorScheme:"dark"}}
              value={activeBranchId}
              onChange={(e) => {
                const val = e.target.value;
                setActiveBranchId(val);
                localStorage.setItem("activeBranchId", val);
              }}
            >
              <option value="all" style={{background:"#0d1430",color:"#e8ecf5"}}>All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} style={{background:"#0d1430",color:"#e8ecf5"}}>{b.name || b.code}</option>
              ))}
            </select>
            <span style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>Branch</span>
          </div>

          {/* Right side */}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            {/* Affiliate link */}
            <Link
              href="/affiliate"
              style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,background:"rgba(251,191,36,0.08)",border:"1px solid rgba(251,191,36,0.2)",color:"#fbbf24",textDecoration:"none",fontSize:11,fontWeight:700,letterSpacing:".04em"}}
              className="hidden sm:flex"
            >
              <span>💰</span>
              <span>Refer &amp; Earn</span>
            </Link>

            <WhatsNew />
            <ModeToggle />

            {/* Subscription badge — only for ADMIN */}
            {subInfo && currentUser?.role === "ADMIN" && (
              <div style={{
                fontSize:11,padding:"4px 10px",borderRadius:6,fontWeight:600,
                border: subInfo.status === "ACTIVE" ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(248,113,113,0.3)",
                color: subInfo.status === "ACTIVE" ? "#34d399" : "#f87171",
                background: subInfo.status === "ACTIVE" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
              }}>
                {subInfo.plan} · {subInfo.status}
              </div>
            )}

            {/* User name */}
            <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontWeight:500}}>
              {currentUser.name || currentUser.email}
            </div>
          </div>
        </div>

        {/* ---- PAGE CONTENT ---- */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          <div style={{width:"100%",maxWidth:1280,margin:"0 auto"}}>
            {currentUser?.email === "finovaos.app@gmail.com" && (
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                background:"linear-gradient(135deg,rgba(251,191,36,.12),rgba(245,158,11,.08))",
                border:"1px solid rgba(251,191,36,.3)", borderRadius:12,
                padding:"10px 18px", marginBottom:20, gap:12, flexWrap:"wrap",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>🎮</span>
                  <div>
                    <span style={{fontSize:13,fontWeight:700,color:"#fbbf24"}}>Demo Mode</span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,.45)",marginLeft:10}}>
                      You&apos;re viewing a demo account with sample data. Nothing here is real.
                    </span>
                  </div>
                </div>
                <Link href="/pricing" style={{
                  padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700,
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff",
                  textDecoration:"none", whiteSpace:"nowrap",
                }}>
                  Get Started →
                </Link>
              </div>
            )}
            {children}
          </div>
        </div>

      </main>

      {/* ── Company Details Modal ── */}
      {showCompanyModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowCompanyModal(false); }}
          style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.75)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Outfit','Inter',sans-serif" }}
        >
          <div style={{ width:"100%",maxWidth:560,background:"#0e1120",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"28px 32px",boxShadow:"0 40px 100px rgba(0,0,0,.7)",maxHeight:"88vh",overflowY:"auto",position:"relative" }}>
            <button onClick={()=>setShowCompanyModal(false)} style={{ position:"absolute",top:16,right:20,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:22,lineHeight:1 }}>✕</button>

            {/* Header */}
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:24 }}>
              <div style={{ width:50,height:50,borderRadius:13,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🏢</div>
              <div>
                <div style={{ fontSize:18,fontWeight:800,color:"white" }}>{companyDetail?.name || companyName}</div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,.35)",marginTop:3 }}>
                  {companyDetail?.businessType ? `${companyDetail.businessType.replace(/_/g," ")} Business` : "Business Account"}
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
              {[
                { label: companyDetail?.plan || "STARTER", color: companyDetail?.plan==="ENTERPRISE"?"#fbbf24":companyDetail?.plan==="PRO"?"#34d399":"#818cf8" },
                { label: companyDetail?.subscriptionStatus || "ACTIVE", color: companyDetail?.subscriptionStatus==="ACTIVE"?"#34d399":"#f87171" },
              ].map(b => (
                <span key={b.label} style={{ padding:"4px 14px",borderRadius:20,background:`${b.color}15`,border:`1px solid ${b.color}30`,color:b.color,fontSize:12,fontWeight:700 }}>{b.label}</span>
              ))}
            </div>

            {/* Info grid */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
              {[
                { icon:"🌍", label:"Country",       value: companyDetail?.country || "—" },
                { icon:"💱", label:"Currency",      value: companyDetail?.baseCurrency || "—" },
                { icon:"👥", label:"Total Users",   value: companyDetail?.totalUsers ?? "—" },
                { icon:"📊", label:"Accounts",      value: companyDetail?.totalAccounts ?? "—" },
                { icon:"📅", label:"Joined",        value: companyDetail?.createdAt ? fmtDate(companyDetail.createdAt) : "—" },
                { icon:"🔄", label:"Renews",        value: companyDetail?.currentPeriodEnd ? fmtDate(companyDetail.currentPeriodEnd) : "—" },
              ].map(row => (
                <div key={row.label} style={{ padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5 }}>{row.icon} {row.label}</div>
                  <div style={{ fontSize:14,fontWeight:700,color:"white" }}>{String(row.value)}</div>
                </div>
              ))}
            </div>

            {/* Active Modules */}
            {companyDetail?.activeModules && (
              <div style={{ padding:"14px 16px",borderRadius:12,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",marginBottom:16 }}>
                <div style={{ fontSize:10,fontWeight:700,color:"rgba(99,102,241,.7)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:10 }}>Active Modules</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {String(companyDetail.activeModules).split(",").filter(Boolean).map((m:string) => (
                    <span key={m} style={{ padding:"3px 10px",borderRadius:12,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.25)",fontSize:11,color:"#a5b4fc",fontWeight:600 }}>{m.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:"flex",gap:10,marginTop:4 }}>
              <a href="/dashboard/company-profile" onClick={()=>setShowCompanyModal(false)} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer",textDecoration:"none",textAlign:"center",display:"block",boxShadow:"0 4px 16px rgba(99,102,241,.3)" }}>
                🏢 Company Profile
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper nav components ────────────────────────────────────────────────────

function cleanNavLabel(value: string) {
  return value.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trim();
}

function NavGroup({ title, icon, open, onToggle, children }: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { collapsed, expand } = useContext(SidebarCtx);
  const displayTitle = cleanNavLabel(title);

  // Collapsed mode: show only icon, centered, with tooltip
  if (collapsed) {
    return (
      <div
        title={displayTitle}
        onClick={() => { expand(); onToggle(); }}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:44, height:36, borderRadius:8, margin:"1px auto", cursor:"pointer",
          color: open ? "#818cf8" : "rgba(255,255,255,0.4)",
          background: open ? "rgba(99,102,241,0.15)" : "transparent",
          transition:"all .15s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.8)";}}
        onMouseLeave={e=>{e.currentTarget.style.background=open?"rgba(99,102,241,0.15)":"transparent";e.currentTarget.style.color=open?"#818cf8":"rgba(255,255,255,0.4)";}}
      >
        <span style={{display:"flex",fontSize:16}}>{icon}</span>
      </div>
    );
  }

  return (
    <div style={{marginBottom:1}}>
      {/* Section header button */}
      <div
        onClick={onToggle}
        style={{
          display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
          borderRadius:8,cursor:"pointer",userSelect:"none",transition:"all .15s",
          background: open ? "rgba(99,102,241,0.1)" : "transparent",
          borderLeft: open ? "2px solid rgba(99,102,241,0.6)" : "2px solid transparent",
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderLeft="2px solid rgba(255,255,255,0.1)"; }}}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background="transparent"; e.currentTarget.style.borderLeft="2px solid transparent"; }}}
      >
        <span style={{color: open ? "#818cf8" : "rgba(255,255,255,0.35)",display:"flex",transition:"color .15s"}}>{icon}</span>
        <span style={{flex:1,fontSize:11,fontWeight:700,color: open ? "#a5b4fc" : "rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".07em",transition:"color .15s"}}>{displayTitle}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={open ? "rgba(165,180,252,0.6)" : "rgba(255,255,255,0.25)"} strokeWidth="2.5" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s, stroke .15s",flexShrink:0}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {/* Children — indented with left guide line */}
      {open && (
        <div style={{
          marginTop:2,marginBottom:4,
          marginLeft:14,
          paddingLeft:10,
          borderLeft:"1px solid rgba(99,102,241,0.2)",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function NavSubGroup({ title, open, onToggle, children }: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const displayTitle = cleanNavLabel(title);
  return (
    <div style={{marginBottom:2}}>
      <div
        onClick={onToggle}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",borderRadius:6,cursor:"pointer",userSelect:"none",transition:"background .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.04)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}
      >
        <span style={{fontSize:10,fontWeight:700,color:"rgba(99,102,241,0.7)",letterSpacing:".06em",textTransform:"uppercase"}}>{displayTitle}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.4)" strokeWidth="2.5" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .15s"}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{marginLeft:8,borderLeft:"1px solid rgba(99,102,241,0.15)",paddingLeft:8,marginTop:1}}>
          {children}
        </div>
      )}
    </div>
  );
}

function NavLink({ href, children, pathname }: {
  href: string;
  children: React.ReactNode;
  pathname: string;
}) {
  const { collapsed } = useContext(SidebarCtx);
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const displayChildren = typeof children === "string" ? cleanNavLabel(children) : children;
  const isAiAssistant = displayChildren === "AI Intelligence" || displayChildren === "AI Assistant";
  const isBusinessGuide = displayChildren === "Business Guide";
  const isOwnerDashboard = displayChildren === "Owner Dashboard";
  const isBusinessOperator = displayChildren === "Business Operator";
  const showUtilityIcon = isAiAssistant || isBusinessGuide || isOwnerDashboard || isBusinessOperator;

  // Collapsed mode: show icon-only for utility links, hide regular sub-links
  if (collapsed) {
    if (!showUtilityIcon) return null;
    const collapsedIcon = isAiAssistant ? (
      // Sparkles / AI icon
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
      </svg>
    ) : isBusinessGuide ? (
      // Compass / guide icon
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    ) : isOwnerDashboard ? (
      // Layout dashboard icon
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ) : (
      // Operator / lightning bolt icon
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    );
    return (
      <Link
        href={href}
        title={typeof displayChildren === "string" ? displayChildren : ""}
        style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          width:44, height:36, borderRadius:8, margin:"1px auto", cursor:"pointer",
          color: active ? "#818cf8" : "rgba(255,255,255,0.4)",
          background: active ? "rgba(99,102,241,0.15)" : "transparent",
          textDecoration:"none", transition:"all .15s",
        }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.8)";}}
        onMouseLeave={e=>{e.currentTarget.style.background=active?"rgba(99,102,241,0.15)":"transparent";e.currentTarget.style.color=active?"#818cf8":"rgba(255,255,255,0.4)";}}
      >
        <span style={{display:"flex",fontSize:16}}>{collapsedIcon}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      style={{
        display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,fontSize:isAiAssistant ? 13 : 12,
        color: active ? "#c7d2fe" : "rgba(255,255,255,0.5)",
        background: active ? "rgba(99,102,241,0.15)" : "transparent",
        fontWeight: active || isAiAssistant ? 600 : 400,
        textDecoration:"none",transition:"all .15s",
        marginBottom:1,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = "rgba(255,255,255,0.45)";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {showUtilityIcon && (
        <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",color:"inherit",flexShrink:0}}>
          {isAiAssistant ? (
            // Sparkles / AI
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          ) : isBusinessGuide ? (
            // Compass
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          ) : isOwnerDashboard ? (
            // 4-grid layout
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          ) : (
            // Lightning bolt (operator)
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          )}
        </span>
      )}
      <span>{displayChildren}</span>
    </Link>
  );
}





