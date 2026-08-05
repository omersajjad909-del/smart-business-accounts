"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page used to duplicate /dashboard/billing — an older, less complete
// billing UI (no Plans/Payment Methods tabs, and it derived "current plan"
// from invoices[0] instead of the actual subscription, which is also what
// produced the "PKR 249" currency mislabeling bug). All internal links now
// point straight at /dashboard/billing; this redirect only exists so old
// bookmarks/sidebar-cache entries pointing here don't 404.
export default function BillingSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/billing");
  }, [router]);
  return null;
}
