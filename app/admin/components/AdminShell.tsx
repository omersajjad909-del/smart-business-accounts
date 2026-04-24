"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  grid:         <Svg><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Svg>,
  building:     <Svg><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h.01M9 13h.01M9 17h.01M13 13h.01M13 17h.01" /></Svg>,
  users:        <Svg><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>,
  "credit-card":<Svg><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></Svg>,
  layers:       <Svg><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Svg>,
  box:          <Svg><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></Svg>,
  chart:        <Svg><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></Svg>,
  globe:        <Svg><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>,
  pulse:        <Svg><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>,
  list:         <Svg><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></Svg>,
  monitor:      <Svg><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></Svg>,
  briefcase:    <Svg><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></Svg>,
  target:       <Svg><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>,
  megaphone:    <Svg><path d="M3 11v2" /><path d="M6 10v4" /><path d="M20 6v12" /><path d="M6 12h4l10 5V7l-10 5H6z" /><path d="M6 16l1.5 4" /></Svg>,
  mail:         <Svg><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></Svg>,
  share:        <Svg><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Svg>,
  message:      <Svg><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>,
  star:         <Svg><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>,
  lock:         <Svg><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>,
  shield:       <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>,
  activity:     <Svg><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>,
  flag:         <Svg><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></Svg>,
  alert:        <Svg><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>,
  code:         <Svg><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></Svg>,
  spark:        <Svg><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Svg>,
  archive:      <Svg><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" rx="1" /><line x1="10" y1="12" x2="14" y2="12" /></Svg>,
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const QUICK_ACTIONS = [
  { label: "Add Company",     href: "/admin/companies" },
  { label: "Add User",        href: "/admin/users" },
  { label: "Create Plan",     href: "/admin/plans" },
  { label: "Add Module",      href: "/admin/business-modules" },
  { label: "System Settings", href: "/admin/settings" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = getCurrentUser();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickOpen,  setQuickOpen]  = useState(false);

  // ── Fix: always start "dark" (SSR-safe), sync from localStorage in effect ──
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("admin-theme-v2");
    if (stored === "light") setTheme("light");
  }, []);

  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResults  = useMemo(() => {
    if (!searchQuery.trim()) return ADMIN_NAV_ITEMS.slice(0, 6);
    const q = searchQuery.toLowerCase();
    return ADMIN_NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 40);
  }
  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }
  function navigateSearch(href: string) {
    closeSearch();
    router.push(href);
  }

  const notifRef   = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
    window.localStorage.setItem("admin-theme-v2", theme);
  }, [theme]);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (notifRef.current   && !notifRef.current.contains(t))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Keyboard: Ctrl+K opens search, Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape") {
        closeSearch();
        setNotifOpen(false);
        setProfileOpen(false);
        setQuickOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Load notifications + profile
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (user?.role) headers["x-user-role"] = user.role;
    if (user?.id)   headers["x-user-id"]   = user.id;
    (async () => {
      try {
        const [notifRes, profileRes] = await Promise.all([
          fetch("/api/admin/notifications", { cache: "no-store", headers, credentials: "include" }),
          fetch("/api/admin/profile",        { cache: "no-store", headers, credentials: "include" }),
        ]);
        if (notifRes.ok)   setNotifications((await notifRes.json()).notifications   || []);
        if (profileRes.ok) setProfile(await profileRes.json());
      } catch {}
    })();
  }, [user?.id, user?.role]);

  const groupedItems = useMemo(
    () => ADMIN_NAV_GROUP_ORDER.map((group) => ({
      group,
      items: ADMIN_NAV_ITEMS.filter((item) => item.group === group),
    })),
    []
  );

  const activeLabel = ADMIN_NAV_ITEMS.find((item) => isActivePath(pathname, item.href))?.label || "Dashboard";
  const mobilePrimary = ADMIN_NAV_ITEMS.filter((item) =>
    ["dashboard", "companies", "users"].includes(item.id)
  );
  const initials = String(profile?.name || user?.name || "AD")
    .split(" ").map((p) => p[0] || "").join("").slice(0, 2).toUpperCase();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markAllRead() {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.role) headers["x-user-role"] = user.role;
      await fetch("/api/admin/notifications", {
        method: "POST", headers, credentials: "include",
        body: JSON.stringify({ action: "MARK_READ", id: "ALL" }),
      });
      setNotifications((cur) => cur.map((n) => ({ ...n, isRead: true })));
    } catch {}
  }

  return (
    <div className="fin-admin-root">
      <style>{shellStyles}</style>

      {/* Overlay for mobile sidebar / quick menu */}
      {(mobileOpen || quickOpen || searchOpen) ? (
        <button
          type="button"
          aria-label="Close panels"
          className="fin-admin-overlay"
          onClick={() => { setMobileOpen(false); setQuickOpen(false); closeSearch(); }}
        />
      ) : null}

      {/* ── Search Command Palette ─────────────────────────────────── */}
      {searchOpen ? (
        <div className="fin-search-palette" onClick={closeSearch}>
          <div className="fin-search-box" onClick={(e) => e.stopPropagation()}>
            <div className="fin-search-input-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--text-muted)" }}>
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                className="fin-search-input"
                placeholder="Search pages, settings, actions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults[0]) {
                    navigateSearch(searchResults[0].href);
                  }
                }}
              />
              <button className="fin-search-esc" onClick={closeSearch}>Esc</button>
            </div>
            <div className="fin-search-results">
              {searchResults.length === 0 ? (
                <div className="fin-search-empty">No results for "{searchQuery}"</div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    className="fin-search-result"
                    onClick={() => navigateSearch(item.href)}
                  >
                    <span className="fin-search-result-icon">
                      {item.icon ? ICONS[item.icon] : item.short}
                    </span>
                    <span className="fin-search-result-label">{item.label}</span>
                    <span className="fin-search-result-group">{item.group}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fin-admin-shell">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`fin-admin-sidebar${mobileOpen ? " is-open" : ""}`}>
          <div className="fin-admin-brandRow">
            <div className="fin-admin-brand">
              <div className="fin-admin-brandBadge">F</div>
              <div>
                <div className="fin-admin-brandTitle">FinovaOS</div>
                <div className="fin-admin-brandSub">Admin</div>
              </div>
            </div>
            <button type="button" className="fin-admin-closeBtn" onClick={() => setMobileOpen(false)}>✕</button>
          </div>

          <div className="fin-admin-sidebarScroll">
            {groupedItems.map(({ group, items }) => (
              <section key={group} className="fin-admin-navGroup">
                <div className="fin-admin-navGroupLabel">{group}</div>
                <div className="fin-admin-navItems">
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`fin-admin-navLink${active ? " is-active" : ""}`}
                        onClick={() => { setMobileOpen(false); setQuickOpen(false); }}
                      >
                        <span className="fin-admin-navIcon">
                          {item.icon ? ICONS[item.icon] : item.short}
                        </span>
                        <span className="fin-admin-navText">{item.label}</span>
                        {item.badge ? <span className="fin-admin-navBadge">{item.badge}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            className="fin-admin-userCard"
            onClick={() => setProfileOpen((v) => !v)}
          >
            <div className="fin-admin-avatar">{initials}</div>
            <div className="fin-admin-userMeta">
              <div className="fin-admin-userName">{profile?.name || user?.name || "Admin"}</div>
              <div className="fin-admin-userRole">Super Admin</div>
            </div>
            <div className="fin-admin-userArrow">›</div>
          </button>
        </aside>

        {/* ── Main content ─────────────────────────────────────────── */}
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

              {/* Clickable search bar (desktop) */}
              <button type="button" className="fin-admin-search" onClick={openSearch}>
                <span className="fin-admin-searchIcon">
                  <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
                </span>
                <span className="fin-admin-searchText">Search anything...</span>
                <span className="fin-admin-searchHint">Ctrl K</span>
              </button>
            </div>

            <div className="fin-admin-topbarRight">
              {/* Mobile search icon */}
              <button type="button" className="fin-admin-iconButton fin-admin-mobileSearchBtn" aria-label="Search" onClick={openSearch}>
                <Svg><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
              </button>

              {/* Theme toggle */}
              <button type="button" className="fin-admin-iconButton" aria-label="Toggle theme"
                onClick={() => setTheme((c) => (c === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? (
                  <Svg><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></Svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 0 1 11.21 3c0-.34.02-.67.06-1A1 1 0 0 0 10 1 11 11 0 1 0 23 14a1 1 0 0 0-2-.21z" />
                  </svg>
                )}
              </button>

              {/* Notifications */}
              <div className="fin-admin-menuWrap" ref={notifRef}>
                <button type="button" className="fin-admin-iconButton" aria-label="Notifications"
                  onClick={() => setNotifOpen((v) => !v)}>
                  <Svg><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
                  {unreadCount > 0 ? (
                    <span className="fin-admin-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  ) : null}
                </button>
                {notifOpen ? (
                  <div className="fin-admin-dropdown">
                    <div className="fin-admin-dropdownHead">
                      <strong>Notifications</strong>
                      <button type="button" onClick={markAllRead}>Mark all read</button>
                    </div>
                    <div className="fin-admin-dropdownList">
                      {notifications.length ? notifications.map((n) => (
                        <div key={n.id} className={`fin-admin-dropdownItem${n.isRead ? "" : " is-unread"}`}>
                          <strong>{n.title || n.type || "Admin update"}</strong>
                          <p>{n.message || "New activity available."}</p>
                          <span>{n.createdAt
                            ? new Date(n.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "Just now"}</span>
                        </div>
                      )) : (
                        <div className="fin-admin-emptyState">No notifications yet.</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Profile */}
              <div className="fin-admin-menuWrap" ref={profileRef}>
                <button type="button" className="fin-admin-profile" onClick={() => setProfileOpen((v) => !v)}>
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
                      <Link href="/admin"             className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Dashboard</Link>
                      <Link href="/admin/settings"    className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Settings</Link>
                      <Link href="/admin/permissions" className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>Roles & Permissions</Link>
                      <Link href="/admin/system"      className="fin-admin-linkRow" onClick={() => setProfileOpen(false)}>System Health</Link>
                      <button
                        type="button"
                        className="fin-admin-linkRow fin-admin-linkRow--danger"
                        onClick={() => { clearCurrentUser(); window.location.href = "/admin/login"; }}
                      >Sign Out</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="fin-admin-page">{children}</div>
        </main>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────────────── */}
      <nav className="fin-admin-mobileNav">
        {/* Slot 0, 1: Dashboard + Companies */}
        {mobilePrimary.slice(0, 2).map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`fin-admin-mobileLink${active ? " is-active" : ""}`}
              onClick={() => { setMobileOpen(false); setQuickOpen(false); }}
            >
              <span className="fin-admin-mobileIcon">{item.icon ? ICONS[item.icon] : item.short}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Slot 2 (center): FAB + quick actions */}
        <div className="fin-admin-fabSlot">
          {quickOpen ? (
            <div className="fin-admin-fabMenu">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="fin-admin-fabAction"
                  onClick={() => setQuickOpen(false)}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className={`fin-admin-fab${quickOpen ? " is-open" : ""}`}
            aria-label="Quick actions"
            onClick={() => setQuickOpen((v) => !v)}
          >
            {quickOpen ? "✕" : "+"}
          </button>
        </div>

        {/* Slot 3: Users */}
        {mobilePrimary.slice(2).map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`fin-admin-mobileLink${active ? " is-active" : ""}`}
              onClick={() => { setMobileOpen(false); setQuickOpen(false); }}
            >
              <span className="fin-admin-mobileIcon">{item.icon ? ICONS[item.icon] : item.short}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Slot 4: More */}
        <button type="button" className="fin-admin-mobileLink" onClick={() => { setQuickOpen(false); setMobileOpen(true); }}>
          <span className="fin-admin-mobileIcon">
            <Svg><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Svg>
          </span>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const shellStyles = `
/* ── CSS Variables ────────────────────────────────────────────────────── */
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

/* ── Root ────────────────────────────────────────────────────────────── */
.fin-admin-root{
  min-height:100vh;
  color:var(--text);
  font-family:'Outfit','DM Sans',sans-serif;
  background:
    radial-gradient(circle at top left,  rgba(124,58,237,.16), transparent 28%),
    radial-gradient(circle at top right, rgba(59,130,246,.11), transparent 24%),
    linear-gradient(180deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 92%, #030712 8%) 100%);
}
.fin-admin-overlay{
  position:fixed;inset:0;z-index:39;border:none;
  background:rgba(6,10,20,.52);backdrop-filter:blur(4px);
}

/* ── Layout ──────────────────────────────────────────────────────────── */
.fin-admin-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:260px minmax(0,1fr);
}
.fin-admin-sidebar{
  position:sticky;top:0;height:100vh;
  padding:14px 10px 12px;
  display:grid;grid-template-rows:auto 1fr auto;
  background:linear-gradient(180deg,var(--panel),var(--panel-2));
  border-right:1px solid var(--border);
  box-shadow:var(--card-shadow);
  z-index:40;overflow:hidden;
}
.fin-admin-brandRow{
  display:flex;align-items:center;justify-content:space-between;
  gap:10px;padding:8px 8px 14px;
}
.fin-admin-brand{display:flex;align-items:center;gap:11px;}
.fin-admin-brandBadge{
  width:36px;height:36px;border-radius:12px;
  display:grid;place-items:center;
  background:linear-gradient(135deg,var(--accent),var(--accent-2));
  box-shadow:0 16px 30px rgba(124,58,237,.3);
  color:#fff;font-size:14px;font-weight:800;flex-shrink:0;
}
.fin-admin-brandTitle{font-size:28px;line-height:1;font-weight:800;letter-spacing:-.05em;color:var(--text);}
.fin-admin-brandSub{margin-top:4px;font-size:12px;color:var(--text-soft);}
.fin-admin-closeBtn,.fin-admin-menuBtn{
  display:none;align-items:center;justify-content:center;
  min-width:40px;height:40px;padding:0 12px;
  border-radius:12px;border:1px solid var(--border);
  background:rgba(255,255,255,.03);color:var(--text);cursor:pointer;font:inherit;
}
.fin-admin-sidebarScroll{overflow-y:auto;overflow-x:hidden;padding:2px 4px 8px;}
.fin-admin-navGroup{margin-bottom:18px;}
.fin-admin-navGroupLabel{
  padding:0 10px 8px;font-size:10px;font-weight:800;
  letter-spacing:.15em;text-transform:uppercase;color:var(--text-muted);
}
.fin-admin-navItems{display:grid;gap:3px;}
.fin-admin-navLink{
  display:flex;align-items:center;gap:10px;
  padding:9px 12px;border-radius:12px;
  border:1px solid transparent;color:var(--text-soft);
  text-decoration:none;transition:all .15s ease;
}
.fin-admin-navLink:hover{background:rgba(255,255,255,.04);border-color:var(--border);color:var(--text);}
.fin-admin-navLink.is-active{
  background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(90,61,248,.18));
  color:#fff;border-color:rgba(143,110,255,.34);
}
.fin-admin-navIcon{
  width:28px;height:28px;border-radius:9px;
  display:inline-flex;align-items:center;justify-content:center;
  color:#d8ccff;background:rgba(255,255,255,.04);flex-shrink:0;
}
.fin-admin-navLink.is-active .fin-admin-navIcon{background:rgba(255,255,255,.12);color:#fff;}
.fin-admin-navText{flex:1;font-size:13px;font-weight:600;}
.fin-admin-navBadge{
  padding:2px 6px;border-radius:999px;
  background:rgba(34,197,94,.14);color:#86efac;
  font-size:9px;font-weight:800;letter-spacing:.06em;
}
.fin-admin-userCard{
  display:flex;align-items:center;gap:12px;
  margin:8px 4px 0;padding:12px;border-radius:16px;
  border:1px solid var(--border);background:rgba(255,255,255,.03);
  cursor:pointer;color:inherit;width:100%;text-align:left;
}
.fin-admin-avatar{
  width:40px;height:40px;border-radius:13px;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#6d28d9,#8b5cf6);
  color:#fff;font-size:13px;font-weight:800;letter-spacing:.06em;flex-shrink:0;
}
.fin-admin-avatar--small{width:38px;height:38px;}
.fin-admin-userMeta{min-width:0;flex:1;}
.fin-admin-userName{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text);}
.fin-admin-userRole{margin-top:2px;font-size:11px;color:var(--text-muted);}
.fin-admin-userArrow{color:var(--text-muted);font-size:16px;}

/* ── Topbar ──────────────────────────────────────────────────────────── */
.fin-admin-main{
  min-width:0;overflow-x:hidden;
  display:grid;grid-template-rows:auto 1fr;
}
.fin-admin-topbar{
  position:sticky;top:0;z-index:30;
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;padding:14px 20px;
  background:color-mix(in srgb, var(--panel) 84%, transparent);
  backdrop-filter:blur(20px);
  border-bottom:1px solid var(--border);
}
.fin-admin-topbarLeft,.fin-admin-topbarRight{display:flex;align-items:center;gap:10px;min-width:0;}
.fin-admin-mobileBrand{display:none;line-height:1;}
.fin-admin-mobileBrandTitle{font-size:20px;font-weight:800;letter-spacing:-.04em;color:var(--text);}
.fin-admin-mobileBrandSub{margin-top:1px;font-size:11px;color:var(--text-muted);}

/* Search bar (button-styled) */
.fin-admin-search{
  min-width:260px;padding:10px 14px;
  display:flex;align-items:center;gap:10px;
  border-radius:14px;
  background:rgba(255,255,255,.03);border:1px solid var(--border);
  color:var(--text-soft);cursor:pointer;
  transition:border-color .15s ease;
}
.fin-admin-search:hover{border-color:rgba(139,92,246,.4);}
.fin-admin-searchIcon{display:inline-flex;color:var(--text-muted);}
.fin-admin-searchText{flex:1;font-size:13px;text-align:left;}
.fin-admin-searchHint{
  padding:3px 6px;border-radius:8px;
  border:1px solid var(--border);color:var(--text-muted);font-size:10px;white-space:nowrap;
}
.fin-admin-mobileSearchBtn{display:none;}
.fin-admin-iconButton{
  position:relative;width:40px;height:40px;border-radius:13px;
  border:1px solid var(--border);background:rgba(255,255,255,.03);
  color:var(--text);display:grid;place-items:center;cursor:pointer;
  flex-shrink:0;
}
.fin-admin-iconButton:hover{background:rgba(255,255,255,.06);}
.fin-admin-dot{
  position:absolute;top:5px;right:5px;
  min-width:16px;height:16px;padding:0 3px;
  border-radius:999px;background:#a855f7;color:#fff;
  font-size:10px;display:grid;place-items:center;
}
.fin-admin-profile{
  display:flex;align-items:center;gap:10px;
  padding:5px 10px 5px 5px;border-radius:14px;
  border:1px solid var(--border);background:rgba(255,255,255,.03);
  cursor:pointer;color:inherit;
}
.fin-admin-profileMeta{min-width:0;}

/* Page content */
.fin-admin-page{
  min-width:0;overflow-x:hidden;
  padding:20px 20px 32px;
}

/* ── Dropdowns ──────────────────────────────────────────────────────── */
.fin-admin-menuWrap{position:relative;}
.fin-admin-dropdown{
  position:absolute;right:0;top:calc(100% + 10px);
  width:320px;max-height:440px;overflow-y:auto;
  border-radius:18px;border:1px solid var(--border-strong);
  background:linear-gradient(180deg,var(--panel),var(--panel-2));
  box-shadow:var(--card-shadow);padding:10px;z-index:50;
}
.fin-admin-dropdown--profile{width:280px;}
.fin-admin-dropdownHead{
  display:flex;align-items:center;justify-content:space-between;
  gap:10px;padding:8px 8px 12px;
}
.fin-admin-dropdownHead strong{font-size:14px;color:var(--text);}
.fin-admin-dropdownHead button{
  border:none;background:transparent;color:#bca9ff;
  cursor:pointer;font:inherit;font-size:12px;font-weight:700;
}
.fin-admin-dropdownList{display:grid;gap:6px;}
.fin-admin-dropdownItem{
  padding:11px 12px;border-radius:12px;
  background:rgba(255,255,255,.03);border:1px solid var(--border);
}
.fin-admin-dropdownItem.is-unread{
  border-color:rgba(124,58,237,.25);background:rgba(124,58,237,.08);
}
.fin-admin-dropdownItem strong{display:block;font-size:13px;color:var(--text);}
.fin-admin-dropdownItem p{margin:5px 0;color:var(--text-soft);font-size:12px;line-height:1.45;}
.fin-admin-dropdownItem span{font-size:11px;color:var(--text-muted);}
.fin-admin-emptyState{padding:20px 14px;color:var(--text-muted);font-size:13px;text-align:center;}
.fin-admin-profileCard{
  display:flex;align-items:center;gap:12px;
  padding:10px 10px 14px;border-bottom:1px solid var(--border);margin-bottom:8px;
}
.fin-admin-profileCard strong{display:block;font-size:14px;color:var(--text);}
.fin-admin-profileCard p{margin:4px 0;color:var(--text-soft);font-size:12px;}
.fin-admin-profileCard span{font-size:11px;color:var(--text-muted);}
.fin-admin-linkRow{
  display:block;padding:11px 12px;border-radius:12px;
  border:1px solid var(--border);background:rgba(255,255,255,.03);
  color:var(--text);text-decoration:none;font-size:13px;font-weight:600;
  cursor:pointer;width:100%;text-align:left;font-family:inherit;
}
.fin-admin-linkRow:hover{background:rgba(255,255,255,.06);}
.fin-admin-linkRow--danger{color:#fda4af;background:rgba(244,63,94,.07);}

/* ── Search Command Palette ─────────────────────────────────────────── */
.fin-search-palette{
  position:fixed;inset:0;z-index:9999;
  display:flex;align-items:flex-start;justify-content:center;
  padding:80px 16px 16px;
  background:rgba(6,10,20,.7);backdrop-filter:blur(8px);
}
.fin-search-box{
  width:100%;max-width:560px;
  border-radius:20px;border:1px solid var(--border-strong);
  background:linear-gradient(180deg,var(--panel),var(--panel-2));
  box-shadow:0 32px 80px rgba(0,0,0,.5);
  overflow:hidden;
}
.fin-search-input-row{
  display:flex;align-items:center;gap:12px;
  padding:16px 18px;border-bottom:1px solid var(--border);
}
.fin-search-input{
  flex:1;background:transparent;border:none;outline:none;
  color:var(--text);font-size:16px;font-family:inherit;
}
.fin-search-input::placeholder{color:var(--text-muted);}
.fin-search-esc{
  padding:4px 8px;border-radius:8px;border:1px solid var(--border);
  background:transparent;color:var(--text-muted);font-size:11px;
  cursor:pointer;font-family:inherit;white-space:nowrap;
}
.fin-search-results{padding:8px;}
.fin-search-empty{padding:24px;text-align:center;color:var(--text-muted);font-size:14px;}
.fin-search-result{
  display:flex;align-items:center;gap:12px;width:100%;
  padding:11px 12px;border-radius:12px;border:none;
  background:transparent;color:var(--text);cursor:pointer;
  font:inherit;font-size:13px;text-align:left;
  transition:background .12s ease;
}
.fin-search-result:hover{background:rgba(139,92,246,.12);}
.fin-search-result-icon{
  width:30px;height:30px;border-radius:9px;
  display:grid;place-items:center;flex-shrink:0;
  background:rgba(255,255,255,.05);color:#d8ccff;
}
.fin-search-result-label{flex:1;font-weight:600;}
.fin-search-result-group{font-size:11px;color:var(--text-muted);}

/* ── Mobile: hide FAB separately (it's now in the nav) ──────────────── */
.fin-admin-mobileNav{display:none;}

/* ── Tablet (768–1024px) ─────────────────────────────────────────────── */
@media (max-width: 1024px){
  .fin-admin-shell{grid-template-columns:1fr;}
  .fin-admin-sidebar{
    position:fixed;inset:0 auto 0 0;
    width:min(86vw,300px);
    transform:translateX(-100%);transition:transform .22s ease;
  }
  .fin-admin-sidebar.is-open{transform:translateX(0);}
  .fin-admin-closeBtn,.fin-admin-menuBtn{display:inline-flex;}
  .fin-admin-page{padding:16px 16px 100px;}
}

/* ── Mobile (≤767px) ─────────────────────────────────────────────────── */
@media (max-width: 767px){
  .fin-admin-topbar{padding:10px 14px;}
  .fin-admin-mobileBrand{display:block;}
  .fin-admin-search{display:none;}
  .fin-admin-mobileSearchBtn{display:grid;}
  .fin-admin-searchHint,.fin-admin-profileMeta{display:none;}
  .fin-admin-dropdown{width:min(92vw,320px);}
  .fin-admin-page{padding:12px 12px 90px;}

  /* Bottom nav */
  .fin-admin-mobileNav{
    position:fixed;left:0;right:0;bottom:0;z-index:40;
    display:grid;
    grid-template-columns:repeat(5,1fr);
    align-items:flex-end;
    padding:0 6px calc(env(safe-area-inset-bottom));
    padding-bottom:max(10px, env(safe-area-inset-bottom));
    background:color-mix(in srgb,var(--panel) 96%,transparent);
    border-top:1px solid var(--border);
    backdrop-filter:blur(20px);
    box-shadow:0 -4px 24px rgba(3,6,18,.22);
  }
  .fin-admin-mobileLink{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:3px;padding:10px 4px 8px;
    color:var(--text-muted);text-decoration:none;
    border:none;border-radius:0;background:transparent;
    font:inherit;font-size:10px;font-weight:600;cursor:pointer;
    transition:color .14s ease;white-space:nowrap;
  }
  .fin-admin-mobileLink.is-active{color:#a78bfa;}
  .fin-admin-mobileIcon{
    width:20px;height:20px;
    display:inline-flex;align-items:center;justify-content:center;
  }

  /* FAB center slot */
  .fin-admin-fabSlot{
    display:flex;flex-direction:column;align-items:center;
    position:relative;justify-content:flex-end;padding-bottom:8px;
  }
  .fin-admin-fabMenu{
    position:absolute;bottom:calc(100% + 8px);left:50%;
    transform:translateX(-50%);
    width:190px;padding:8px;
    border-radius:18px;
    background:linear-gradient(180deg,var(--panel),var(--panel-2));
    border:1px solid var(--border-strong);
    box-shadow:var(--card-shadow);
    z-index:45;
  }
  .fin-admin-fabAction{
    display:block;padding:10px 12px;border-radius:12px;
    background:rgba(255,255,255,.04);color:var(--text);
    text-decoration:none;font-size:13px;font-weight:600;
    transition:background .12s ease;
  }
  .fin-admin-fabAction:hover{background:rgba(139,92,246,.14);}
  .fin-admin-fab{
    width:54px;height:54px;border:none;border-radius:50%;
    display:grid;place-items:center;
    background:linear-gradient(135deg,#6d28d9,#8b5cf6);
    color:#fff;font-size:28px;line-height:1;
    box-shadow:0 6px 24px rgba(109,40,217,.45);
    cursor:pointer;
    border:3px solid var(--bg);
    transform:translateY(-10px);
    transition:transform .15s ease, box-shadow .15s ease;
  }
  .fin-admin-fab.is-open{
    transform:translateY(-10px) rotate(45deg);
    box-shadow:0 4px 16px rgba(109,40,217,.3);
  }
}
`;
