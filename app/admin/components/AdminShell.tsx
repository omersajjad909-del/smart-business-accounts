"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV_GROUP_ORDER, ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";

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
    "Admin";

  const initials = String(user?.name || "AD")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const mobilePrimary = ADMIN_NAV_ITEMS.slice(0, 4);

  return (
    <div className="admin-shell-root">
      <style>{shellStyles}</style>

      <div className="admin-shell">
        <aside className={`admin-sidebar${mobileOpen ? " open" : ""}`}>
          <div className="admin-sidebar__brand">
            <div>
              <div className="admin-brand__title">FinovaOS</div>
              <div className="admin-brand__subtitle">Admin Panel</div>
            </div>
            <button type="button" className="admin-sidebar__close" onClick={() => setMobileOpen(false)}>
              X
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
                        <span className="admin-nav-link__icon">{item.short}</span>
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
                Menu
              </button>
              <div>
                <div className="admin-topbar__eyebrow">Platform Administration</div>
                <div className="admin-topbar__title">{currentTitle}</div>
              </div>
            </div>

            <div className="admin-topbar__right">
              <button
                type="button"
                className="admin-theme-toggle"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
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
              <span className="admin-mobile-nav__icon">{item.short}</span>
              <span className="admin-mobile-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const shellStyles = `
:root[data-admin-theme="dark"]{
  --admin-bg: #0a1020;
  --admin-bg-soft: #11192d;
  --admin-panel: rgba(14,20,36,.92);
  --admin-panel-2: rgba(18,26,46,.94);
  --admin-text: #f8fafc;
  --admin-text-soft: rgba(203,213,225,.72);
  --admin-border: rgba(255,255,255,.08);
  --admin-accent: #7c3aed;
  --admin-accent-2: #8b5cf6;
  --admin-shadow: 0 24px 80px rgba(0,0,0,.28);
}
:root[data-admin-theme="light"]{
  --admin-bg: #f4f7fb;
  --admin-bg-soft: #eef2f8;
  --admin-panel: rgba(255,255,255,.96);
  --admin-panel-2: rgba(255,255,255,.92);
  --admin-text: #0f172a;
  --admin-text-soft: rgba(71,85,105,.78);
  --admin-border: rgba(15,23,42,.08);
  --admin-accent: #7c3aed;
  --admin-accent-2: #8b5cf6;
  --admin-shadow: 0 24px 80px rgba(15,23,42,.08);
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
  grid-template-columns:290px minmax(0,1fr);
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
.admin-brand__title{
  font-size:24px;
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
}
.admin-sidebar__nav{
  overflow:auto;
  padding:8px 4px 12px;
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
  padding:12px 12px;
  border-radius:18px;
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
  background:linear-gradient(135deg, rgba(124,58,237,.18), rgba(124,58,237,.08));
  border-color:rgba(124,58,237,.25);
}
.admin-nav-link__icon{
  width:34px;
  height:34px;
  border-radius:12px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:rgba(124,58,237,.12);
  color:var(--admin-accent);
  font-size:11px;
  font-weight:800;
  letter-spacing:.08em;
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
  padding:18px 22px;
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
.admin-topbar__eyebrow{
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--admin-text-soft);
}
.admin-topbar__title{
  font-size:24px;
  font-weight:800;
  letter-spacing:-.04em;
}
.admin-theme-toggle{
  border:1px solid var(--admin-border);
  background:transparent;
  color:var(--admin-text);
  border-radius:14px;
  padding:11px 14px;
  cursor:pointer;
  font:inherit;
  font-weight:600;
}
.admin-topbar__profile{
  display:flex;
  align-items:center;
  gap:10px;
  padding:6px 10px;
  border-radius:18px;
  border:1px solid var(--admin-border);
  background:rgba(255,255,255,.03);
}
.admin-page-wrap{
  min-width:0;
  padding:18px 22px 90px;
}
.admin-mobile-nav{
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
  .admin-page-wrap{
    padding:14px 16px 100px;
  }
  .admin-theme-toggle{
    padding:10px 12px;
    font-size:12px;
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
  }
  .admin-mobile-nav__link.active{
    background:rgba(124,58,237,.12);
    color:var(--admin-accent);
  }
  .admin-mobile-nav__icon{
    font-size:10px;
    font-weight:800;
    letter-spacing:.08em;
  }
  .admin-mobile-nav__label{
    font-size:11px;
    font-weight:600;
  }
}
`;
