"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AnalyticsLoader from "./AnalyticsLoader";

const APP_ROUTES = ["/dashboard", "/admin", "/onboarding", "/auth", "/login", "/login-email"];

function isAppRoute(path: string) {
  return APP_ROUTES.some(r => path.startsWith(r));
}

// If Clarity already loaded (via SPA nav from marketing page) and user lands on app route,
// force a full reload so Clarity is never present on protected pages.
export default function AnalyticsGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isAppRoute(pathname)) return;
    const clarityLoaded =
      typeof (window as any).clarity === "function" ||
      !!document.querySelector('script[src*="clarity.ms"]');
    if (clarityLoaded) {
      window.location.reload();
    }
  }, [pathname]);

  if (isAppRoute(pathname)) return null;
  return <AnalyticsLoader />;
}
