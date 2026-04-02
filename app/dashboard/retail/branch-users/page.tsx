"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BranchUsersPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/users"); }, [router]);
  return <div style={{ minHeight: "100vh", background: "var(--app-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "sans-serif", fontSize: 14 }}>Redirecting to User Management…</div>;
}
