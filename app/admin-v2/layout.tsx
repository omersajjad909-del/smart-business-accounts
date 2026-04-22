"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AdminV2Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    const user = getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      router.replace("/admin/login");
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }, [isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(27,38,84,.9), rgba(6,10,20,1) 55%)",
          color: "rgba(255,255,255,.68)",
          fontFamily: "'Outfit','Inter',sans-serif",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: "2px solid rgba(125,211,252,.24)",
            borderTopColor: "#7dd3fc",
            animation: "adminv2spin .8s linear infinite",
          }}
        />
        Loading premium admin workspace...
        <style>{`@keyframes adminv2spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
