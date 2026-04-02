"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PurchaseReturnRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/debit-note"); }, [router]);
  return <div style={{ minHeight: "100vh", background: "var(--app-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "sans-serif", fontSize: 14 }}>Redirecting to Purchase Returns (Debit Notes)…</div>;
}
