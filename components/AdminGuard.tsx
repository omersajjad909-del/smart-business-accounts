"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!user || !isAdmin) {
      router.replace("/dashboard"); // ✅ NO BLINK
    }
  }, [isAdmin, router, user]);

  if (!user || !isAdmin) {
    return (
      <div className="p-10 text-center text-gray-400">
        Checking permissions...
      </div>
    );
  }

  return <>{children}</>;
}

