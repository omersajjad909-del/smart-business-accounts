"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import AdminShell from "@/app/admin/components/AdminShell";
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
    <AdminSessionProvider value={state}>
      <Toaster position="top-right" />
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
