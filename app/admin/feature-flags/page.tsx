"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Feature Flags are managed inside the main Admin Panel (/admin → Feature Flags section)
export default function AdminFeatureFlagsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin"); }, [router]);
  return (
    <div style={{ minHeight: "100vh", background: "#070b14", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontFamily: "sans-serif", fontSize: 14 }}>
      Redirecting to Admin Panel…
    </div>
  );
}
