"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV_GROUP_ORDER, ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";

const ICONS: Record<string, ReactNode> = {
  grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  building: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h.01M9 13h.01M9 17h.01M13 13h.01M13 17h.01"/></svg>,
  users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "credit-card": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  layers: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  box: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  chart: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  pulse: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  list: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  monitor: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  briefcase: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  target: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  megaphone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11v2"/><path d="M6 10v4"/><path d="M20 6v12"/><path d="M6 12h4l10 5V7l-10 5H6z"/><path d="M6 16l1.5 4"/></svg>,
  mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  share: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  message: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  star: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  activity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  flag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
};

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const user = getCurrentUser();

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("admin-theme-v1") as "dark" | "light" | null)
        : null;
    setTheme(saved === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem("admin-theme-v1", theme);
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const groupedItems = useMemo(
    () =>
      ADMIN_NAV_GROUP_ORDER.map((group) => ({
        group,
        items: ADMIN_NAV_ITEMS.filter((item) => item.group === group),
      })),
    []
  );

  const currentTitle =
    ADMIN_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ||
    "Dashboard";

  const initials = String(user?.name || "AD")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const mobilePrimary = ADMIN_NAV_ITEMS.filter((item) => ["dashboard", "companies", "users"].includes(item.id));

  return (
    <div className="admin-shell-root">
      <style>{shellStyles}</style>

      <div className="admin-shell">
        <aside className={`admin-sidebar${mobileOpen ? " open" : ""}`}>
          <div className="admin-sidebar__brand">
            <div className="admin-brand">
              <div className="admin-brand__mark">F</div>
              <div>
                <div className="admin-brand__title">FinovaOS</div>
                <div className="admin-brand__subtitle">Admin Panel</div>
              </div>
            </div>
            <button type="button" className="admin-sidebar__close" onClick={() => setMobileOpen(false)}>
              Close
            </button>
          </div>

          <div className="admin-sidebar__nav">
            {groupedItems.map(({ group, items }) => (
              <div key={group} className="admin-nav-group">
                <div className="admin-nav-group__label">{group}</div>
                <div className="admin-nav-group__items">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link key={item.id} href={item.href} className={`admin-nav-link${active ? " active" : ""}`}>
                        <span className="admin-nav-link__icon">{item.icon ? ICONS[item.icon] : item.short}</span>
                        <span className="admin-nav-link__label">{item.label}</span>
                        {item.badge ? <span className="admin-nav-link__badge">{item.badge}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="admin-sidebar__footer">
            <div className="admin-user-card">
              <div className="admin-user-card__avatar">{initials}</div>
              <div className="admin-user-card__meta">
                <div className="admin-user-card__name">{user?.name || "Admin"}</div>
                <div className="admin-user-card__role">Super Admin</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar__left">
              <button type="button" className="admin-topbar__menu" onClick={() => setMobileOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="admin-topbar__search">
                <span className="admin-topbar__searchLead">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Search anything...</span>
                </span>
                <kbd className="admin-topbar__shortcut">K</kbd>
              </div>

              <div>
                <div className="admin-topbar__eyebrow">Platform Administration</div>
                <div className="admin-topbar__title">{currentTitle}</div>
              </div>
            </div>

            <div className="admin-topbar__right">
              <button type="button" className="admin-icon-btn" aria-label="Theme status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
              <div className="admin-topbar__dot" />
              <button type="button" className="admin-icon-btn" aria-label="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              <button
                type="button"
                className="admin-theme-toggle"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 0 1 11.21 3c0-.34.02-.67.06-1A1 1 0 0 0 10 1 11 11 0 1 0 23 14a1 1 0 0 0-2-.21z" />
                  </svg>
                )}
              </button>
              <div className="admin-topbar__profile">
                <div className="admin-topbar__profileAvatar">{initials}</div>
                <div className="admin-topbar__profileMeta">
                  <div className="admin-topbar__profileName">{user?.name || "Admin"}</div>
                  <div className="admin-topbar__profileRole">Super Admin</div>
                </div>
              </div>
            </div>
          </header>

          <div className="admin-page-wrap">{children}</div>
        </main>
      </div>

      <nav className="admin-mobile-nav">
        {mobilePrimary.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.id} href={item.href} className={`admin-mobile-nav__link${active ? " active" : ""}`}>
              <span className="admin-mobile-nav__icon">{item.icon ? ICONS[item.icon] : item.short}</span>
              <span className="admin-mobile-nav__label">{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className="admin-mobile-nav__link" onClick={() => setMobileOpen(true)}>
          <span className="admin-mobile-nav__icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </span>
          <span className="admin-mobile-nav__label">More</span>
        </button>
      </nav>
      <button type="button" className="admin-mobile-fab" aria-label="Quick add">+</button>
    </div>
  );
}

const shellStyles = `
:root[data-admin-theme="dark"]{
  --admin-bg:#0a1020;
  --admin-bg-soft:#11192d;
  --admin-panel:rgba(14,20,36,.94);
  --admin-panel-2:rgba(18,26,46,.96);
  --admin-text:#f8fafc;
  --admin-text-soft:rgba(203,213,225,.72);
  --admin-text-muted:rgba(148,163,184,.62);
  --admin-border:rgba(255,255,255,.08);
  --admin-accent:#7c3aed;
  --admin-accent-2:#8b5cf6;
  --admin-shadow:0 24px 80px rgba(0,0,0,.28);
}
:root[data-admin-theme="light"]{
  --admin-bg:#f6f8fc;
  --admin-bg-soft:#eef2f8;
  --admin-panel:rgba(255,255,255,.97);
  --admin-panel-2:rgba(255,255,255,.94);
  --admin-text:#0f172a;
  --admin-text-soft:rgba(71,85,105,.78);
  --admin-text-muted:rgba(100,116,139,.72);
  --admin-border:rgba(15,23,42,.08);
  --admin-accent:#7c3aed;
  --admin-accent-2:#8b5cf6;
  --admin-shadow:0 24px 80px rgba(15,23,42,.08);
}
.admin-shell-root{
  min-height:100vh;
  background:
    radial-gradient(circle at top left, rgba(124,58,237,.12), transparent 28%),
    radial-gradient(circle at top right, rgba(59,130,246,.10), transparent 24%),
    var(--admin-bg);
  color:var(--admin-text);
}
.admin-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:270px minmax(0,1fr);
}
.admin-sidebar{
  position:sticky;
  top:0;
  height:100vh;
  display:grid;
  grid-template-rows:auto 1fr auto;
  padding:18px 14px;
  background:linear-gradient(180deg, var(--admin-panel), var(--admin-panel-2));
  border-right:1px solid var(--admin-border);
  backdrop-filter:blur(18px);
  box-shadow:var(--admin-shadow);
}
.admin-sidebar__brand{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  padding:8px 10px 14px;
}
.admin-brand{
  display:flex;
  align-items:center;
  gap:12px;
}
.admin-brand__mark{
  width:36px;
  height:36px;
  border-radius:11px;
  display:grid;
  place-items:center;
  color:#fff;
  background:linear-gradient(135deg, var(--admin-accent), var(--admin-accent-2));
  box-shadow:0 12px 24px rgba(124,58,237,.22);
  font-size:14px;
  font-weight:800;
  letter-spacing:-.05em;
}
.admin-brand__title{
  font-size:22px;
  font-weight:800;
  letter-spacing:-.04em;
}
.admin-brand__subtitle{
  font-size:12px;
  color:var(--admin-text-soft);
}
.admin-sidebar__close,.admin-topbar__menu{
  display:none;
  border:1px solid var(--admin-border);
  background:transparent;
  color:var(--admin-text);
  border-radius:14px;
  padding:10px 12px;
  cursor:pointer;
  font:inherit;
  font-size:11px;
  font-weight:700;
}
.admin-sidebar__nav{
  overflow:auto;
  padding:8px 6px 12px;
  display:grid;
  gap:18px;
}
.admin-nav-group{
  display:grid;
  gap:8px;
}
.admin-nav-group__label{
  padding:0 10px;
  font-size:10px;
  font-weight:800;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--admin-text-soft);
}
.admin-nav-group__items{
  display:grid;
  gap:6px;
}
.admin-nav-link{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:16px;
  text-decoration:none;
  color:var(--admin-text);
  border:1px solid transparent;
  transition:all .18s ease;
}
.admin-nav-link:hover{
  background:rgba(124,58,237,.08);
  border-color:var(--admin-border);
}
.admin-nav-link.active{
  background:linear-gradient(135deg, rgba(124,58,237,.22), rgba(124,58,237,.1));
  border-color:rgba(124,58,237,.3);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}
.admin-nav-link__icon{
  width:30px;
  height:30px;
  border-radius:10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:rgba(124,58,237,.12);
  color:var(--admin-accent);
  flex-shrink:0;
}
.admin-nav-link__label{
  flex:1;
  font-size:13.5px;
  font-weight:600;
}
.admin-nav-link__badge{
  padding:3px 7px;
  border-radius:999px;
  background:rgba(124,58,237,.12);
  color:var(--admin-accent);
  font-size:9px;
  font-weight:800;
  letter-spacing:.08em;
}
.admin-sidebar__footer{
  padding:10px 6px 4px;
}
.admin-user-card{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px;
  border-radius:20px;
  background:rgba(124,58,237,.08);
  border:1px solid var(--admin-border);
}
.admin-user-card__avatar,.admin-topbar__profileAvatar{
  width:42px;
  height:42px;
  border-radius:14px;
  background:linear-gradient(135deg, var(--admin-accent), var(--admin-accent-2));
  color:white;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:13px;
  font-weight:800;
  letter-spacing:.08em;
  flex-shrink:0;
}
.admin-user-card__name,.admin-topbar__profileName{
  font-size:13px;
  font-weight:700;
}
.admin-user-card__role,.admin-topbar__profileRole{
  font-size:11px;
  color:var(--admin-text-soft);
}
.admin-main{
  min-width:0;
  display:grid;
  grid-template-rows:auto 1fr;
}
.admin-topbar{
  position:sticky;
  top:0;
  z-index:20;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  padding:14px 22px;
  backdrop-filter:blur(18px);
  background:color-mix(in srgb, var(--admin-panel) 88%, transparent);
  border-bottom:1px solid var(--admin-border);
}
.admin-topbar__left,.admin-topbar__right{
  display:flex;
  align-items:center;
  gap:12px;
  min-width:0;
}
.admin-topbar__search{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:11px 14px;
  border-radius:16px;
  border:1px solid var(--admin-border);
  background:rgba(255,255,255,.03);
  color:var(--admin-text-soft);
  min-width:250px;
}
.admin-topbar__searchLead{
  display:flex;
  align-items:center;
  gap:8px;
}
.admin-topbar__shortcut{
  border:1px solid var(--admin-border);
  border-radius:8px;
  padding:2px 6px;
  font:inherit;
  font-size:10px;
  line-height:1.4;
  color:var(--admin-text-muted);
  background:rgba(255,255,255,.03);
}
.admin-topbar__eyebrow{
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--admin-text-soft);
}
.admin-topbar__title{
  font-size:18px;
  font-weight:800;
  letter-spacing:-.04em;
}
.admin-theme-toggle,.admin-icon-btn{
  border:1px solid var(--admin-border);
  background:transparent;
  color:var(--admin-text);
  border-radius:14px;
  width:42px;
  height:42px;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  justify-content:center;
}
.admin-topbar__dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#9b5cff;
  box-shadow:0 0 0 4px rgba(155,92,255,.14);
}
.admin-topbar__profile{
  display:flex;
  align-items:center;
  gap:10px;
  padding:6px 10px;
  border-radius:18px;
  border:1px solid var(--admin-border);
  background:rgba(255,255,255,.03);
  min-width:150px;
}
.admin-page-wrap{
  min-width:0;
  padding:18px 22px 90px;
}
.admin-mobile-nav,.admin-mobile-fab{
  display:none;
}
@media (max-width: 1100px){
  .admin-shell{
    grid-template-columns:1fr;
  }
  .admin-sidebar{
    position:fixed;
    inset:0 auto 0 0;
    width:min(88vw, 330px);
    z-index:40;
    transform:translateX(-100%);
    transition:transform .22s ease;
  }
  .admin-sidebar.open{
    transform:translateX(0);
  }
  .admin-sidebar__close,.admin-topbar__menu{
    display:inline-flex;
  }
}
@media (max-width: 768px){
  .admin-topbar{
    padding:14px 16px;
  }
  .admin-topbar__search,.admin-topbar__eyebrow{
    display:none;
  }
  .admin-page-wrap{
    padding:14px 16px 104px;
  }
  .admin-topbar__profileMeta{
    display:none;
  }
  .admin-mobile-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:35;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));
    background:color-mix(in srgb, var(--admin-panel) 92%, transparent);
    backdrop-filter:blur(16px);
    border-top:1px solid var(--admin-border);
  }
  .admin-mobile-nav__link{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    padding:8px 6px;
    text-decoration:none;
    color:var(--admin-text-soft);
    border-radius:16px;
    border:none;
    background:transparent;
    font:inherit;
  }
  .admin-mobile-nav__link.active{
    background:rgba(124,58,237,.12);
    color:var(--admin-accent);
  }
  .admin-mobile-nav__icon{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    width:18px;
    height:18px;
  }
  .admin-mobile-nav__label{
    font-size:11px;
    font-weight:600;
  }
  .admin-mobile-fab{
    display:grid;
    place-items:center;
    position:fixed;
    right:22px;
    bottom:88px;
    width:58px;
    height:58px;
    border:none;
    border-radius:999px;
    background:linear-gradient(135deg, var(--admin-accent), var(--admin-accent-2));
    color:#fff;
    font-size:30px;
    box-shadow:0 18px 34px rgba(124,58,237,.28);
    z-index:36;
  }
}
`;
