"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import AdminShell from "@/app/admin/components/AdminShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const user = isLoginPage ? null : getCurrentUser();
  const isAuthorized = isLoginPage ? true : !!user && user.role === "ADMIN";

  useEffect(() => {
    document.documentElement.style.background = "";
    document.body.style.background = "";
  }, []);

  useEffect(() => {
    if (!isLoginPage && !isAuthorized) {
      router.replace("/admin/login");
    }
  }, [isAuthorized, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthorized) {
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
    <>
      <Toaster position="top-right" />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
