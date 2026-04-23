"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV_GROUP_ORDER, ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";

const ICONS: Record<string, ReactNode> = {
  grid: <Svg><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>,
  building: <Svg><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h.01M9 13h.01M9 17h.01M13 13h.01M13 17h.01" /></Svg>,
  users: <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  "credit-card": <Svg><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></Svg>,
  layers: <Svg><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Svg>,
  box: <Svg><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Svg>,
  package: <Svg><path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.29 7 12 12l8.71-5" /><path d="M12 22V12" /></Svg>,
  receipt: <Svg><path d="M4 3v18l3-2 2 2 2-2 2 2 2-2 2 2 3-2V3" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></Svg>,
  coins: <Svg><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Svg>,
  wallet: <Svg><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /><path d="M16 12h6" /><path d="M18 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></Svg>,
  settings: <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></Svg>,
  lock: <Svg><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>,
  mail: <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" /><polyline points="22,6 12,13 2,6" /></Svg>,
  activity: <Svg><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>,
  shield: <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></Svg>,
  database: <Svg><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" /></Svg>,
  flag: <Svg><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></Svg>,
  spark: <Svg><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Svg>,
  globe: <Svg><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></Svg>,
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const QUICK_ACTIONS = [
  { label: "Add Company", href: "/admin/companies" },
  { label: "Add User", href: "/admin/users" },
  { label: "Create Plan", href: "/admin/plans" },
  { label: "Add Module", href: "/admin/business-modules" },
  { label: "System Settings", href: "/admin/settings" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = getCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setQuickOpen(false);
  }, [pathname]);

  const groupedItems = useMemo(
    () =>
      ADMIN_NAV_GROUP_ORDER.map((group) => ({
        group,
        items: ADMIN_NAV_ITEMS.filter((item) => item.group === group),
      })),
    []
  );

  const activeLabel = ADMIN_NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label || "Dashboard";

  const mobilePrimary = ADMIN_NAV_ITEMS.filter((item) => ["dashboard", "companies", "users"].includes(item.id));

  const initials = String(user?.name || "UA")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fin-admin-root">
      <style>{shellStyles}</style>

      {(mobileOpen || quickOpen) ? (
        <button
          type="button"
          aria-label="Close panels"
          className="fin-admin-overlay"
          onClick={() => {
            setMobileOpen(false);
            setQuickOpen(false);
          }}
        />
      ) : null}

      <div className="fin-admin-shell">
        <aside className={`fin-admin-sidebar${mobileOpen ? " is-open" : ""}`}>
          <div className="fin-admin-brandRow">
            <div className="fin-admin-brand">
              <div className="fin-admin-brandBadge">✣</div>
              <div>
                <div className="fin-admin-brandTitle">FinovaOS</div>
                <div className="fin-admin-brandSub">Admin</div>
              </div>
            </div>
            <button type="button" className="fin-admin-closeBtn" onClick={() => setMobileOpen(false)}>
              Close
            </button>
          </div>

          <div className="fin-admin-sidebarScroll">
            {groupedItems.map(({ group, items }) => (
              <section key={group} className="fin-admin-navGroup">
                <div className="fin-admin-navGroupLabel">{group}</div>
                <div className="fin-admin-navItems">
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link key={item.id} href={item.href} className={`fin-admin-navLink${active ? " is-active" : ""}`}>
                        <span className="fin-admin-navIcon">{item.icon ? ICONS[item.icon] : item.short}</span>
                        <span className="fin-admin-navText">{item.label}</span>
                        {item.badge ? <span className="fin-admin-navBadge">{item.badge}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="fin-admin-userCard">
            <div className="fin-admin-avatar">{initials}</div>
            <div className="fin-admin-userMeta">
              <div className="fin-admin-userName">{user?.name || "Usman Ali"}</div>
              <div className="fin-admin-userRole">Super Admin</div>
            </div>
            <div className="fin-admin-userArrow">›</div>
          </div>
        </aside>

        <main className="fin-admin-main">
          <header className="fin-admin-topbar">
            <div className="fin-admin-topbarLeft">
              <button type="button" className="fin-admin-menuBtn" onClick={() => setMobileOpen(true)}>
                <Svg><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Svg>
              </button>

              <div className="fin-admin-search">
                <span className="fin-admin-searchIcon">
                  <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
                </span>
                <span className="fin-admin-searchText">Search anything...</span>
                <span className="fin-admin-searchHint">⌘ K</span>
              </div>
            </div>

            <div className="fin-admin-topbarRight">
              <button type="button" className="fin-admin-iconButton" aria-label="Theme">
                <Svg><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></Svg>
              </button>
              <button type="button" className="fin-admin-iconButton" aria-label="Notifications">
                <Svg><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
                <span className="fin-admin-dot" />
              </button>
              <div className="fin-admin-profile">
                <div className="fin-admin-avatar fin-admin-avatar--small">{initials}</div>
                <div className="fin-admin-profileMeta">
                  <div className="fin-admin-userName">{user?.name || "Usman Ali"}</div>
                  <div className="fin-admin-userRole">{activeLabel}</div>
                </div>
              </div>
            </div>
          </header>

          <div className="fin-admin-page">{children}</div>
        </main>
      </div>

      <nav className="fin-admin-mobileNav">
        {mobilePrimary.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link key={item.id} href={item.href} className={`fin-admin-mobileLink${active ? " is-active" : ""}`}>
              <span className="fin-admin-mobileIcon">{item.icon ? ICONS[item.icon] : item.short}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className="fin-admin-mobileLink" onClick={() => setMobileOpen(true)}>
          <span className="fin-admin-mobileIcon">
            <Svg><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>
          </span>
          <span>More</span>
        </button>
      </nav>

      <div className={`fin-admin-fabWrap${quickOpen ? " is-open" : ""}`}>
        <div className="fin-admin-fabMenu">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} className="fin-admin-fabAction" onClick={() => setQuickOpen(false)}>
              {action.label}
            </Link>
          ))}
        </div>
        <button type="button" className="fin-admin-fab" aria-label="Quick actions" onClick={() => setQuickOpen((value) => !value)}>
          {quickOpen ? "×" : "+"}
        </button>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const shellStyles = `
.fin-admin-root{
  --bg:#070b16;
  --bg-soft:#0d1324;
  --panel:#0f1729;
  --panel-2:#121b31;
  --border:rgba(255,255,255,.08);
  --border-strong:rgba(255,255,255,.12);
  --text:#f8fafc;
  --text-soft:rgba(226,232,240,.72);
  --text-muted:rgba(148,163,184,.68);
  --accent:#7c3aed;
  --accent-2:#8b5cf6;
  --blue:#4f7cff;
  --green:#22c55e;
  --orange:#fb923c;
  --card-shadow:0 24px 70px rgba(3,6,18,.45);
  min-height:100vh;
  color:var(--text);
  background:
    radial-gradient(circle at top left, rgba(124,58,237,.16), transparent 28%),
    radial-gradient(circle at top right, rgba(59,130,246,.11), transparent 24%),
    linear-gradient(180deg, #080d18 0%, #090f1d 100%);
}
.fin-admin-overlay{
  position:fixed;
  inset:0;
  z-index:39;
  border:none;
  background:rgba(6,10,20,.72);
  backdrop-filter:blur(4px);
}
.fin-admin-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:260px minmax(0,1fr);
}
.fin-admin-sidebar{
  position:sticky;
  top:0;
  height:100vh;
  padding:14px 10px 12px;
  display:grid;
  grid-template-rows:auto 1fr auto;
  background:linear-gradient(180deg, rgba(9,14,28,.98), rgba(9,16,31,.94));
  border-right:1px solid var(--border);
  box-shadow:var(--card-shadow);
  z-index:40;
}
.fin-admin-brandRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  padding:8px 8px 14px;
}
.fin-admin-brand{
  display:flex;
  align-items:center;
  gap:11px;
}
.fin-admin-brandBadge{
  width:36px;
  height:36px;
  border-radius:12px;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow:0 16px 30px rgba(124,58,237,.3);
  color:#fff;
  font-size:14px;
}
.fin-admin-brandTitle{
  font-size:28px;
  line-height:1;
  font-weight:800;
  letter-spacing:-.05em;
}
.fin-admin-brandSub{
  margin-top:4px;
  font-size:12px;
  color:var(--text-soft);
}
.fin-admin-closeBtn,.fin-admin-menuBtn{
  display:none;
  align-items:center;
  justify-content:center;
  min-width:40px;
  height:40px;
  padding:0 12px;
  border-radius:12px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.03);
  color:var(--text);
  cursor:pointer;
  font:inherit;
}
.fin-admin-sidebarScroll{
  overflow:auto;
  padding:2px 4px 8px;
}
.fin-admin-navGroup{
  margin-bottom:18px;
}
.fin-admin-navGroupLabel{
  padding:0 10px 8px;
  font-size:10px;
  font-weight:800;
  letter-spacing:.15em;
  text-transform:uppercase;
  color:var(--text-muted);
}
.fin-admin-navItems{
  display:grid;
  gap:5px;
}
.fin-admin-navLink{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid transparent;
  color:var(--text-soft);
  text-decoration:none;
  transition:all .18s ease;
}
.fin-admin-navLink:hover{
  background:rgba(255,255,255,.03);
  border-color:var(--border);
  color:var(--text);
}
.fin-admin-navLink.is-active{
  background:linear-gradient(135deg, rgba(124,58,237,.35), rgba(90,61,248,.18));
  color:#fff;
  border-color:rgba(143,110,255,.34);
}
.fin-admin-navIcon{
  width:30px;
  height:30px;
  border-radius:10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  color:#d8ccff;
  background:rgba(255,255,255,.04);
  flex-shrink:0;
}
.fin-admin-navLink.is-active .fin-admin-navIcon{
  background:rgba(255,255,255,.1);
  color:#fff;
}
.fin-admin-navText{
  flex:1;
  font-size:13px;
  font-weight:600;
}
.fin-admin-navBadge{
  padding:3px 7px;
  border-radius:999px;
  background:rgba(34,197,94,.14);
  color:#86efac;
  font-size:9px;
  font-weight:800;
  letter-spacing:.08em;
}
.fin-admin-userCard{
  display:flex;
  align-items:center;
  gap:12px;
  margin:8px 4px 0;
  padding:12px;
  border-radius:16px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.03);
}
.fin-admin-avatar{
  width:42px;
  height:42px;
  border-radius:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(135deg, #6d28d9, #8b5cf6);
  color:#fff;
  font-size:13px;
  font-weight:800;
  letter-spacing:.06em;
  flex-shrink:0;
}
.fin-admin-avatar--small{
  width:40px;
  height:40px;
}
.fin-admin-userMeta{
  min-width:0;
  flex:1;
}
.fin-admin-userName{
  font-size:13px;
  font-weight:700;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.fin-admin-userRole{
  margin-top:2px;
  font-size:11px;
  color:var(--text-muted);
}
.fin-admin-userArrow{
  color:var(--text-muted);
  font-size:18px;
}
.fin-admin-main{
  min-width:0;
  display:grid;
  grid-template-rows:auto 1fr;
}
.fin-admin-topbar{
  position:sticky;
  top:0;
  z-index:30;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  padding:16px 18px;
  background:rgba(8,12,24,.78);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
}
.fin-admin-topbarLeft,.fin-admin-topbarRight{
  display:flex;
  align-items:center;
  gap:12px;
  min-width:0;
}
.fin-admin-search{
  min-width:280px;
  padding:11px 14px;
  display:flex;
  align-items:center;
  gap:10px;
  border-radius:14px;
  background:rgba(255,255,255,.03);
  border:1px solid var(--border);
  color:var(--text-soft);
}
.fin-admin-searchIcon{
  display:inline-flex;
  color:var(--text-muted);
}
.fin-admin-searchText{
  flex:1;
  font-size:13px;
}
.fin-admin-searchHint{
  padding:3px 6px;
  border-radius:8px;
  border:1px solid var(--border);
  color:var(--text-muted);
  font-size:10px;
}
.fin-admin-iconButton{
  position:relative;
  width:42px;
  height:42px;
  border-radius:14px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.03);
  color:var(--text);
  display:grid;
  place-items:center;
  cursor:pointer;
}
.fin-admin-dot{
  position:absolute;
  top:9px;
  right:11px;
  width:8px;
  height:8px;
  border-radius:999px;
  background:#a855f7;
  box-shadow:0 0 0 4px rgba(168,85,247,.18);
}
.fin-admin-profile{
  display:flex;
  align-items:center;
  gap:10px;
  padding:6px 10px 6px 6px;
  border-radius:16px;
  border:1px solid var(--border);
  background:rgba(255,255,255,.03);
}
.fin-admin-profileMeta{
  min-width:0;
}
.fin-admin-page{
  min-width:0;
  padding:18px 18px 110px;
}
.fin-admin-mobileNav,.fin-admin-fabWrap{
  display:none;
}

@media (max-width: 1120px){
  .fin-admin-shell{
    grid-template-columns:1fr;
  }
  .fin-admin-sidebar{
    position:fixed;
    inset:0 auto 0 0;
    width:min(88vw, 320px);
    transform:translateX(-100%);
    transition:transform .2s ease;
  }
  .fin-admin-sidebar.is-open{
    transform:translateX(0);
  }
  .fin-admin-closeBtn,.fin-admin-menuBtn{
    display:inline-flex;
  }
}

@media (max-width: 768px){
  .fin-admin-topbar{
    padding:14px 14px;
  }
  .fin-admin-search{
    min-width:0;
    width:100%;
  }
  .fin-admin-searchHint,
  .fin-admin-profileMeta{
    display:none;
  }
  .fin-admin-page{
    padding:14px 14px 120px;
  }
  .fin-admin-mobileNav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    z-index:34;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    gap:8px;
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));
    background:rgba(10,14,26,.95);
    border-top:1px solid var(--border);
    backdrop-filter:blur(18px);
  }
  .fin-admin-mobileLink{
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:4px;
    padding:7px 4px;
    color:var(--text-muted);
    text-decoration:none;
    border:none;
    border-radius:14px;
    background:transparent;
    font:inherit;
    font-size:10px;
    font-weight:600;
  }
  .fin-admin-mobileLink.is-active{
    color:#a78bfa;
  }
  .fin-admin-mobileIcon{
    width:18px;
    height:18px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
  }
  .fin-admin-fabWrap{
    position:fixed;
    right:18px;
    bottom:86px;
    z-index:35;
    display:flex;
    flex-direction:column;
    align-items:flex-end;
    gap:12px;
  }
  .fin-admin-fabMenu{
    display:none;
    width:172px;
    padding:10px;
    border-radius:18px;
    background:rgba(18,26,46,.96);
    border:1px solid var(--border-strong);
    box-shadow:var(--card-shadow);
  }
  .fin-admin-fabWrap.is-open .fin-admin-fabMenu{
    display:grid;
    gap:8px;
  }
  .fin-admin-fabAction{
    padding:10px 12px;
    border-radius:12px;
    background:rgba(255,255,255,.03);
    color:var(--text);
    text-decoration:none;
    font-size:13px;
    font-weight:600;
  }
  .fin-admin-fab{
    width:58px;
    height:58px;
    border:none;
    border-radius:999px;
    display:grid;
    place-items:center;
    background:linear-gradient(135deg, #6d28d9, #8b5cf6);
    color:#fff;
    font-size:32px;
    box-shadow:0 18px 35px rgba(109,40,217,.35);
  }
}
`;
