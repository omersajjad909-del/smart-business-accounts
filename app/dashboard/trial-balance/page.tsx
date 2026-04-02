"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrialBalanceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/reports/trial-balance"); }, [router]);
  return null;
}
