"use client";
import { usePathname } from "next/navigation";
import AnalyticsLoader from "./AnalyticsLoader";

// Only load analytics on public/marketing pages — never on dashboard, admin, onboarding, or auth
// Clarity injects Web Workers that crash when CSP blocks them; prevent it from any app page
export default function AnalyticsGate() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/login-email")
  ) {
    return null;
  }
  return <AnalyticsLoader />;
}
