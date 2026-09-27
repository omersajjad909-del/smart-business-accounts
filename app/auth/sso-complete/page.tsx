"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setCurrentUser } from "@/lib/auth";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function SsoCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const payload = searchParams.get("payload") || "";
      if (!payload) {
        router.replace("/auth?mode=signin");
        return;
      }

      const decoded = JSON.parse(decodeBase64Url(payload));
      setCurrentUser(decoded);
      router.replace("/dashboard");
    } catch {
      router.replace("/auth?mode=signin");
    }
  }, [router, searchParams]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--dk-020817, #020817)", color:"rgba(var(--ink),var(--ta-50, .5))", fontSize:14 }}>
      Finalizing SSO sign-in…
    </div>
  );
}

export default function SsoCompletePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--dk-020817, #020817)", color:"rgba(var(--ink),var(--ta-40, .4))", fontSize:14 }}>
        Loading…
      </div>
    }>
      <SsoCompleteInner/>
    </Suspense>
  );
}
