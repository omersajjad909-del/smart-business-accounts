"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Email Logs are managed inside the main Admin Panel (/admin → Email Logs in sidebar)
export default function AdminEmailLogsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin"); }, [router]);
  return (
    <div style={{ minHeight: "100vh", background: "#070b14", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontFamily: "sans-serif", fontSize: 14 }}>
      Redirecting to Admin Panel…
    </div>
  );
}
