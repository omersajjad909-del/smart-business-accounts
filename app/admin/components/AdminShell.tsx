"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearCurrentUser, getCurrentUser } from "@/lib/auth";
import { ADMIN_NAV_GROUP_ORDER, ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";

type AdminNotification = {
  id: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
};

type AdminProfile = {
  name?: string;
  email?: string;
  role?: string;
  joined?: string;
};

const ICONS: Record<string, ReactNode> = {
  grid: <Svg><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>,
  building: <Svg><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h.01M9 13h.01M9 17h.01M13 13h.01M13 17h.01" /></Svg>,
  users: <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  "credit-card": <Svg><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></Svg>,
  layers: <Svg><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Svg>,
  box: <Svg><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Svg>,
  chart: <Svg><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></Svg>,
  globe: <Svg><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>,
  pulse: <Svg><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>,
  list: <Svg><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Svg>,
  monitor: <Svg><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></Svg>,
  briefcase: <Svg><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></Svg>,
  target: <Svg><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>,
  megaphone: <Svg><path d="M3 11v2" /><path d="M6 10v4" /><path d="M20 6v12" /><path d="M6 12h4l10 5V7l-10 5H6z" /><path d="M6 16l1.5 4" /></Svg>,
  mail: <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Svg>,
  share: <Svg><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Svg>,
  message: <Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>,
  star: <Svg><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>,
  lock: <Svg><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>,
  shield: <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
  activity: <Svg><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>,
  flag: <Svg><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></Svg>,
  alert: <Svg><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
  code: <Svg><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Svg>,
  spark: <Svg><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Svg>,
  archive: <Svg><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" rx="1" /><line x1="10" y1="12" x2="14" y2="12" /></Svg>,
};

function Svg({ children }: { children: ReactNode }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

const QUICK_ACTIONS = [
  { label: "Add Company",    href: "/admin/companies" },
  { label: "Add User",       href: "/admin/users" },
  { label: "Create Plan",    href: "/admin/plans" },
  { label: "Add Module",     href: "/admin/business-modules" },
  { label: "System Settings", href: "/admin/settings" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = getCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("admin-theme-v2") === "light" ? "light" : "dark";
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem("admin-theme-v2", theme);
  }, [theme]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (user?.role) headers["x-user-role"] = user.role;
    if (user?.id) headers["x-user-id"] = user.id;

    (async () => {
      try {
        const [notifRes, profileRes] = await Promise.all([
          fetch("/api/admin/notifications", { cache: "no-store", headers, credentials: "include" as RequestCredentials }),
          fetch("/api/admin/profile", { cache: "no-store", headers, credentials: "include" as RequestCredentials }),
        ]);
        if (notifRes.ok) {
          const notifJson = await notifRes.json();
          setNotifications(Array.isArray(notifJson.notifications) ? notifJson.notifications : []);
        }
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setProfile(profileJson);
        }
      } catch {}
    })();
  }, [user?.id, user?.role]);

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
  const initials = String(profile?.name || user?.name || "AD")
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  async function markAllRead() {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.role) headers["x-user-role"] = user.role;
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers,
        credentials: "include" as RequestCredentials,
        body: JSON.stringify({ action: "MARK_READ", id: "ALL" }),
      });
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch {}
  }

  return (
    <div className="fin-admin-root">
      <style>{shellStyles}</style>

      {(mobileOpen || quickOpen) ? <button type="button" aria-label="Close panels" className="fin-admin-overlay" onClick={() => { setMobileOpen(false); setQuickOpen(false); }} /> : null}

      <div className="fin-admin-shell">
        <aside className={`fin-admin-sidebar${mobileOpen ? " is-open" : ""}`}>
          <div className="fin-admin-brandRow">
            <div className="fin-admin-brand">
              <div className="fin-admin-brandBadge">F</div>
              <div>
                <div className="fin-admin-brandTitle">FinovaOS</div>
                <div className="fin-admin-brandSub">Admin</div>
              </div>
            </div>
            <button type="button" className="fin-admin-closeBtn" onClick={() => setMobileOpen(false)}>Close</button>
          </div>

          <div className="fin-admin-sidebarScroll">
            {groupedItems.map(({ group, items }) => (
              <section key={group} className="fin-admin-navGroup">
                <div className="fin-admin-navGroupLabel">{group}</div>
                <div className="fin-admin-navItems">
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link key={item.id} href={item.href} className={`fin-admin-navLink${active ? " is-active" : ""}`} onClick={() => { setMobileOpen(false); setQuickOpen(false); }}>
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

          <button type="button" className="fin-admin-userCard" onClick={() => setProfileOpen((value) => !value)}>
            <div className="fin-admin-avatar">{initials}</div>
            <div className="fin-admin-userMeta">
              <div className="fin-admin-userName">{profile?.name || user?.name || "Admin"}</div>
              <div className="fin-admin-userRole">Super Admin</div>
            </div>
            <div className="fin-admin-userArrow">{">"}</div>
          </button>
        </aside>

        <main className="fin-admin-main">
          <header className="fin-admin-topbar">
            <div className="fin-admin-topbarLeft">
              <button type="button" className="fin-admin-menuBtn" onClick={() => setMobileOpen(true)}>
                <Svg><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Svg>
              </button>

              <div className="fin-admin-mobileBrand">
                <div className="fin-admin-mobileBrandTitle">FinovaOS</div>
                <div className="fin-admin-mobileBrandSub">Admin</div>
              </div>

              <div className="fin-admin-search">
                <span className="fin-admin-searchIcon"><Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg></span>
                <span className="fin-admin-searchText">Search anything...</span>
                <span className="fin-admin-searchHint">Ctrl K</span>
              </div>
            </div>

            <div className="fin-admin-topbarRight">
              <button type="button" className="fin-admin-iconButton" aria-label="Toggle theme" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? (
                  <Svg><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></Svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 0 1 11.21 3c0-.34.02-.67.06-1A1 1 0 0 0 10 1 11 11 0 1 0 23 14a1 1 0 0 0-2-.21z" /></svg>
                )}
              </button>

              <div className="fin-admin-menuWrap" ref={notifRef}>
                <button type="button" className="fin-admin-iconButton" aria-label="Notifications" onClick={() => setNotifOpen((value) => !value)}>
                  <Svg><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
                  {unreadCount > 0 ? <span className="fin-admin-dot">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
                </button>
                {notifOpen ? (
                  <div className="fin-admin-dropdown">
                    <div className="fin-admin-dropdownHead">
                      <strong>Notifications</strong>
                      <button type="button" onClick={markAllRead}>Mark all read</button>
                    </div>
                    <div className="fin-admin-dropdownList">
                      {notifications.length ? notifications.map((item) => (
                        <div key={item.id} className={`fin-admin-dropdownItem${item.isRead ? "" : " is-unread"}`}>
                          <strong>{item.title || item.type || "Admin update"}</strong>
                          <p>{item.message || "New activity available in admin panel."}</p>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
                        </div>
                      )) : <div className="fin-admin-emptyState">No notifications yet.</div>}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="fin-admin-menuWrap" ref={profileRef}>
                <button type="button" className="fin-admin-profile" onClick={() => setProfileOpen((value) => !value)}>
                  <div className="fin-admin-avatar fin-admin-avatar--small">{initials}</div>
                  <div className="fin-admin-profileMeta">
                    <div className="fin-admin-userName">{profile?.name || user?.name || "Admin"}</div>
                    <div className="fin-admin-userRole">{activeLabel}</div>
                  </div>
                </button>
                {profileOpen ? (
                  <div className="fin-admin-dropdown fin-admin-dropdown--profile">
                    <div className="fin-admin-profileCard">
                      <div className="fin-admin-avatar">{initials}</div>
                      <div>
                        <strong>{profile?.name || user?.name || "Admin"}</strong>
                        <p>{profile?.email || user?.email || "admin@finovaos.com"}</p>
                        <span>{profile?.role || "ADMIN"}</span>
                      </div>
                    </div>
                    <div className="fin-admin-dropdownList">
                      <Link href="/admin" className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Dashboard</Link>
                      <Link href="/admin/settings" className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Settings</Link>
                      <Link href="/admin/permissions" className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Roles & Permissions</Link>
                      <Link href="/admin/system" className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>System Health</Link>
                      <button type="button" className="fin-admin-linkRow fin-admin-linkRow--danger" onClick={() => { clearCurrentUser(); window.location.href = "/admin/login"; }}>Sign Out</button>
                    </div>
                  </div>
                ) : null}
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
            <Link key={item.id} href={item.href} className={`fin-admin-mobileLink${active ? " is-active" : ""}`} onClick={() => { setMobileOpen(false); setQuickOpen(false); }}>
              <span className="fin-admin-mobileIcon">{item.icon ? ICONS[item.icon] : item.short}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" className="fin-admin-mobileLink" onClick={() => setMobileOpen(true)}>
          <span className="fin-admin-mobileIcon"><Svg><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg></span>
          <span>More</span>
        </button>
      </nav>

      <div className={`fin-admin-fabWrap${quickOpen ? " is-open" : ""}`}>
        <div className="fin-admin-fabMenu">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} className="fin-admin-fabAction" onClick={() => setQuickOpen(false)}>{action.label}</Link>
          ))}
        </div>
        <button type="button" className="fin-admin-fab" aria-label="Quick actions" onClick={() => setQuickOpen((value) => !value)}>{quickOpen ? "x" : "+"}</button>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const shellStyles = `
:root[data-admin-theme="dark"]{
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
  --card-shadow:0 24px 70px rgba(3,6,18,.45);
}
:root[data-admin-theme="light"]{
  --bg:#eff4fb;
  --bg-soft:#ffffff;
  --panel:rgba(255,255,255,.96);
  --panel-2:rgba(247,250,255,.98);
  --border:rgba(15,23,42,.08);
  --border-strong:rgba(15,23,42,.12);
  --text:#0f172a;
  --text-soft:rgba(51,65,85,.78);
  --text-muted:rgba(100,116,139,.82);
  --accent:#7c3aed;
  --accent-2:#8b5cf6;
  --card-shadow:0 24px 70px rgba(15,23,42,.12);
}
.fin-admin-root{
  min-height:100vh;
  color:var(--text);
  background:
    radial-gradient(circle at top left, rgba(124,58,237,.16), transparent 28%),
    radial-gradient(circle at top right, rgba(59,130,246,.11), transparent 24%),
    linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, #030712 8%) 100%);
}
.fin-admin-overlay{position:fixed;inset:0;z-index:39;border:none;background:rgba(6,10,20,.52);backdrop-filter:blur(4px)}
.fin-admin-shell{min-height:100vh;display:grid;grid-template-columns:260px minmax(0,1fr)}
.fin-admin-sidebar{position:sticky;top:0;height:100vh;padding:14px 10px 12px;display:grid;grid-template-rows:auto 1fr auto;background:linear-gradient(180deg,var(--panel),var(--panel-2));border-right:1px solid var(--border);box-shadow:var(--card-shadow);z-index:40}
.fin-admin-brandRow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 8px 14px}
.fin-admin-brand{display:flex;align-items:center;gap:11px}
.fin-admin-brandBadge{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 16px 30px rgba(124,58,237,.3);color:#fff;font-size:14px;font-weight:800}
.fin-admin-brandTitle{font-size:28px;line-height:1;font-weight:800;letter-spacing:-.05em}
.fin-admin-brandSub{margin-top:4px;font-size:12px;color:var(--text-soft)}
.fin-admin-closeBtn,.fin-admin-menuBtn{display:none;align-items:center;justify-content:center;min-width:40px;height:40px;padding:0 12px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--text);cursor:pointer;font:inherit}
.fin-admin-sidebarScroll{overflow:auto;padding:2px 4px 8px}
.fin-admin-navGroup{margin-bottom:18px}
.fin-admin-navGroupLabel{padding:0 10px 8px;font-size:10px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted)}
.fin-admin-navItems{display:grid;gap:5px}
.fin-admin-navLink{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;border:1px solid transparent;color:var(--text-soft);text-decoration:none;transition:all .18s ease}
.fin-admin-navLink:hover{background:rgba(255,255,255,.03);border-color:var(--border);color:var(--text)}
.fin-admin-navLink.is-active{background:linear-gradient(135deg, rgba(124,58,237,.35), rgba(90,61,248,.18));color:#fff;border-color:rgba(143,110,255,.34)}
.fin-admin-navIcon{width:30px;height:30px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;color:#d8ccff;background:rgba(255,255,255,.04);flex-shrink:0}
.fin-admin-navLink.is-active .fin-admin-navIcon{background:rgba(255,255,255,.1);color:#fff}
.fin-admin-navText{flex:1;font-size:13px;font-weight:600}
.fin-admin-navBadge{padding:3px 7px;border-radius:999px;background:rgba(34,197,94,.14);color:#86efac;font-size:9px;font-weight:800;letter-spacing:.08em}
.fin-admin-userCard{display:flex;align-items:center;gap:12px;margin:8px 4px 0;padding:12px;border-radius:16px;border:1px solid var(--border);background:rgba(255,255,255,.03);cursor:pointer;color:inherit}
.fin-admin-avatar{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #6d28d9, #8b5cf6);color:#fff;font-size:13px;font-weight:800;letter-spacing:.06em;flex-shrink:0}
.fin-admin-avatar--small{width:40px;height:40px}
.fin-admin-userMeta{min-width:0;flex:1}
.fin-admin-userName{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fin-admin-userRole{margin-top:2px;font-size:11px;color:var(--text-muted)}
.fin-admin-userArrow{color:var(--text-muted);font-size:18px}
.fin-admin-main{min-width:0;display:grid;grid-template-rows:auto 1fr}
.fin-admin-topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;background:color-mix(in srgb, var(--panel) 84%, transparent);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.fin-admin-topbarLeft,.fin-admin-topbarRight{display:flex;align-items:center;gap:12px;min-width:0}
.fin-admin-mobileBrand{display:none}
.fin-admin-search{min-width:280px;padding:11px 14px;display:flex;align-items:center;gap:10px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--border);color:var(--text-soft)}
.fin-admin-searchIcon{display:inline-flex;color:var(--text-muted)}
.fin-admin-searchText{flex:1;font-size:13px}
.fin-admin-searchHint{padding:3px 6px;border-radius:8px;border:1px solid var(--border);color:var(--text-muted);font-size:10px}
.fin-admin-iconButton{position:relative;width:42px;height:42px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--text);display:grid;place-items:center;cursor:pointer}
.fin-admin-dot{position:absolute;top:6px;right:6px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:#a855f7;color:#fff;font-size:10px;display:grid;place-items:center}
.fin-admin-profile{display:flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;border-radius:16px;border:1px solid var(--border);background:rgba(255,255,255,.03);cursor:pointer;color:inherit}
.fin-admin-profileMeta{min-width:0}
.fin-admin-page{min-width:0;padding:18px 18px 110px}
.fin-admin-menuWrap{position:relative}
.fin-admin-dropdown{position:absolute;right:0;top:calc(100% + 10px);width:320px;max-height:420px;overflow:auto;border-radius:18px;border:1px solid var(--border-strong);background:linear-gradient(180deg,var(--panel),var(--panel-2));box-shadow:var(--card-shadow);padding:10px;z-index:50}
.fin-admin-dropdown--profile{width:280px}
.fin-admin-dropdownHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 8px 12px}
.fin-admin-dropdownHead strong{font-size:14px}
.fin-admin-dropdownHead button{border:none;background:transparent;color:#bca9ff;cursor:pointer;font:inherit;font-size:12px;font-weight:700}
.fin-admin-dropdownList{display:grid;gap:8px}
.fin-admin-dropdownItem{padding:12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--border)}
.fin-admin-dropdownItem.is-unread{border-color:rgba(124,58,237,.25);background:rgba(124,58,237,.08)}
.fin-admin-dropdownItem strong{display:block;font-size:13px}
.fin-admin-dropdownItem p{margin:6px 0;color:var(--text-soft);font-size:12px;line-height:1.45}
.fin-admin-dropdownItem span{font-size:11px;color:var(--text-muted)}
.fin-admin-emptyState{padding:20px 14px;color:var(--text-muted);font-size:13px;text-align:center}
.fin-admin-profileCard{display:flex;align-items:center;gap:12px;padding:10px 10px 14px;border-bottom:1px solid var(--border)}
.fin-admin-profileCard strong{display:block;font-size:14px}
.fin-admin-profileCard p{margin:4px 0;color:var(--text-soft);font-size:12px}
.fin-admin-profileCard span{font-size:11px;color:var(--text-muted)}
.fin-admin-linkRow{display:block;padding:12px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:var(--text);text-decoration:none;font-size:13px;font-weight:600}
.fin-admin-linkRow--danger{width:100%;text-align:left;color:#fda4af;background:rgba(244,63,94,.08);cursor:pointer}
.fin-admin-mobileNav,.fin-admin-fabWrap{display:none}
@media (max-width: 1024px){
  .fin-admin-shell{grid-template-columns:1fr}
  .fin-admin-sidebar{position:fixed;inset:0 auto 0 0;width:min(88vw,300px);transform:translateX(-100%);transition:transform .22s ease}
  .fin-admin-sidebar.is-open{transform:translateX(0)}
  .fin-admin-closeBtn,.fin-admin-menuBtn{display:inline-flex}
}
@media (max-width: 767px){
  .fin-admin-topbar{padding:11px 14px}
  .fin-admin-mobileBrand{display:block;line-height:1}
  .fin-admin-mobileBrandTitle{font-size:21px;font-weight:800;letter-spacing:-.04em}
  .fin-admin-mobileBrandSub{margin-top:2px;font-size:11px;color:var(--text-muted)}
  .fin-admin-search{display:none}
  .fin-admin-searchHint,.fin-admin-profileMeta{display:none}
  .fin-admin-page{padding:12px 12px 116px}
  .fin-admin-dropdown{width:min(92vw,320px)}
  .fin-admin-mobileNav{
    position:fixed;left:0;right:0;bottom:0;z-index:34;
    display:grid;grid-template-columns:repeat(4,1fr);
    padding:8px 10px calc(8px + env(safe-area-inset-bottom));
    background:color-mix(in srgb,var(--panel) 94%,transparent);
    border-top:1px solid var(--border);backdrop-filter:blur(20px);
    box-shadow:0 -4px 24px rgba(3,6,18,.18);
  }
  .fin-admin-mobileLink{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:4px;padding:7px 4px;color:var(--text-muted);text-decoration:none;
    border:none;border-radius:14px;background:transparent;
    font:inherit;font-size:10px;font-weight:600;cursor:pointer;
  }
  .fin-admin-mobileLink.is-active{color:#a78bfa}
  .fin-admin-mobileIcon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center}
  .fin-admin-fabWrap{
    position:fixed;right:16px;bottom:80px;z-index:35;
    display:flex;flex-direction:column;align-items:flex-end;gap:10px;
  }
  .fin-admin-fabMenu{
    display:none;width:178px;padding:10px;
    border-radius:18px;background:linear-gradient(180deg,var(--panel),var(--panel-2));
    border:1px solid var(--border-strong);box-shadow:var(--card-shadow);
  }
  .fin-admin-fabWrap.is-open .fin-admin-fabMenu{display:grid;gap:6px}
  .fin-admin-fabAction{
    padding:10px 12px;border-radius:12px;
    background:rgba(255,255,255,.03);color:var(--text);
    text-decoration:none;font-size:13px;font-weight:600;
    display:flex;align-items:center;gap:8px;
  }
  .fin-admin-fab{
    width:56px;height:56px;border:none;border-radius:999px;
    display:grid;place-items:center;
    background:linear-gradient(135deg,#6d28d9,#8b5cf6);
    color:#fff;font-size:30px;
    box-shadow:0 16px 32px rgba(109,40,217,.38);cursor:pointer;
  }
}
`;
