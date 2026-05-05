"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RetailBranchesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/branches");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "var(--text-muted)", fontSize: 14 }}>
      Redirecting to Branches...
    </div>
  );
}
