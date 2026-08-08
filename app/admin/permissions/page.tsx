"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Merged into /admin/plans.
 *
 * Plan access used to be split across two screens: this one (business type ×
 * plan module grid) and the "Pages" tab of /admin/plans (plan-wide page list).
 * They controlled overlapping things through different storage and disagreed,
 * so the grid moved into /admin/plans as the "Pages & Modules" tab and this
 * route now just forwards there. Kept so existing links and bookmarks work.
 */
export default function AdminPermissionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/plans?tab=pages");
  }, [router]);

  return (
    <div style={{ padding: "48px 28px", fontFamily: "'Outfit','Inter',sans-serif", color: "rgba(255,255,255,.5)", fontSize: 14 }}>
      Moved to Plans → Pages &amp; Modules…
    </div>
  );
}
