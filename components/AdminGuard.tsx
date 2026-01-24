"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();

    if (!user || user.role !== "ADMIN") {
      router.replace("/dashboard"); // ✅ NO BLINK
      return;
    }

    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="p-10 text-center text-gray-400">
        Checking permissions...
      </div>
    );
  }

  return <>{children}</>;
}
