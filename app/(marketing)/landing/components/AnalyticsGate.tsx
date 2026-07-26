"use client";
import { usePathname } from "next/navigation";
import AnalyticsLoader from "./AnalyticsLoader";

// Only load analytics on public/marketing pages — never on dashboard, admin, or onboarding
// Clarity injects Web Workers that crash when CSP blocks them on auth-required pages
export default function AnalyticsGate() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }
  return <AnalyticsLoader />;
}
