"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The full AI experience is now at /dashboard/ai
// Redirect legacy path so bookmarks still work
export default function AIAssistantRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/ai"); }, [router]);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Outfit',sans-serif", color: "rgba(255,255,255,.4)", gap: 12 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Redirecting to AI Command Center…
    </div>
  );
}
