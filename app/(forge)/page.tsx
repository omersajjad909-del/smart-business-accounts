"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ForgeRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/forge/home");
  }, [router]);
  return null;
}
