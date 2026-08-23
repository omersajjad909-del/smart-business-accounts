"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import AdminShell from "@/app/admin/components/AdminShell";
import AdminUnlockGate from "@/app/admin/components/AdminUnlockGate";
import { ADMIN_NAV_ITEMS } from "@/app/admin/admin-nav";
import {
  AdminSessionProvider,
  canOpenPage,
  type AdminSessionValue,
} from "@/app/admin/admin-session";
import { adminPageForConsolePath } from "@/lib/adminPages";
import { clearCurrentUser, setCurrentUser } from "@/lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [state, setState] = useState<AdminSessionValue | null>(null);
  const [checked, setChecked] = useState(false);
  // Which pages carry the extra page password, and whether this browser has
  // already typed it. Both come from the server on every navigation.
  const [lockedPages, setLockedPages] = useState<string[]>([]);
  // The single page this browser currently has open, if any.
  const [unlockedPage, setUnlockedPage] = useState<string | null>(null);

  // The gate is the httpOnly `sb_admin` cookie, verified server-side on every
  // request. This call is how the UI *learns* the answer — it is not the lock.
  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/me", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          clearCurrentUser();
          setState({ session: null, superAdminOnlyPages: [] });
        } else {
          const data = await res.json();
          setState({
            session: data.user,
            superAdminOnlyPages: data.superAdminOnlyPages || [],
          });
          setLockedPages(Array.isArray(data.lockedPages) ? data.lockedPages : []);
          setUnlockedPage(data.unlockedPage ?? null);
          setCurrentUser({ ...data.user, role: "ADMIN", companyId: "system" });
        }
      } catch {
        if (!cancelled) setState({ session: null, superAdminOnlyPages: [] });
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoginPage, pathname]);

  useEffect(() => {
    document.documentElement.style.background = "";
    document.body.style.background = "";
  }, []);

  // ── Re-lock on leaving the page ──────────────────────────────────────────
  // A phone's app lock closes the moment you leave the app; this is the same
  // idea. Navigating anywhere else drops the unlock immediately, so coming
  // back asks for the password again.
  useEffect(() => {
    if (!unlockedPage || unlockedPage === currentPage) return;
    setUnlockedPage(null);
    fetch("/api/admin/security/unlock", { method: "DELETE", keepalive: true }).catch(() => {});
  }, [currentPage, unlockedPage]);

  // Closing or reloading the tab counts as leaving too. sendBeacon is the only
  // request the browser reliably lets through during unload; if it does not
  // make it, the token's own short expiry is the backstop.
  useEffect(() => {
    if (!unlockedPage) return;
    const relock = () => {
      try {
        navigator.sendBeacon?.("/api/admin/security/unlock?relock=1", new Blob([], { type: "text/plain" }));
      } catch {
        /* the token expires on its own */
      }
    };
    window.addEventListener("pagehide", relock);
    return () => window.removeEventListener("pagehide", relock);
  }, [unlockedPage]);

  useEffect(() => {
    if (isLoginPage || !checked) return;
    if (!state?.session) {
      router.replace("/admin/login");
      return;
    }
    // A page this admin is not ticked for: send them somewhere they can use
    // rather than letting the screen render and every request under it 403.
    const page = adminPageForConsolePath(pathname || "/admin");
    if (page !== "dashboard" && !canOpenPage(state, page)) {
      router.replace("/admin");
    }
  }, [checked, state, isLoginPage, pathname, router]);

  const currentPage = adminPageForConsolePath(pathname || "/admin");
  const needsUnlock =
    !isLoginPage && lockedPages.includes(currentPage) && unlockedPage !== currentPage;

  if (isLoginPage) return <>{children}</>;

  if (!checked || !state?.session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080c1e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,.5)",
          fontFamily: "'Outfit',sans-serif",
          fontSize: 14,
        }}
      >
        Verifying Admin Access...
      </div>
    );
  }

  return (
    <AdminSessionProvider value={{ ...state, lockedPages, unlockedPage }}>
      <Toaster position="top-right" />
      <AdminShell>
        {needsUnlock ? (
          <AdminUnlockGate
            pageLabel={
              ADMIN_NAV_ITEMS.find((i) => i.id === currentPage)?.label || "This page"
            }
            pageId={currentPage}
            onUnlocked={() => setUnlockedPage(currentPage)}
            onCancel={() => router.replace("/admin")}
          />
        ) : (
          children
        )}
      </AdminShell>
    </AdminSessionProvider>
  );
}
