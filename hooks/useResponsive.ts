"use client";
import { useEffect, useState } from "react";

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const mqTablet = window.matchMedia("(max-width: 1023px)");

    setIsMobile(mq.matches);
    setIsTablet(mqTablet.matches);

    const handleMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const handleTablet = (e: MediaQueryListEvent) => setIsTablet(e.matches);

    mq.addEventListener("change", handleMobile);
    mqTablet.addEventListener("change", handleTablet);

    return () => {
      mq.removeEventListener("change", handleMobile);
      mqTablet.removeEventListener("change", handleTablet);
    };
  }, []);

  return { isMobile, isTablet };
}
