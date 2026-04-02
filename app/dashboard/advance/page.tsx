"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdvanceRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/advance-payment"); }, [router]);
  return null;
}
