"use client";

import { useEffect } from "react";
import {
  COOKIE_CONSENT_EVENT,
  readCookieConsent,
  type CookieConsent,
} from "@/lib/cookieConsent";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

let clarityInjected = false;

function loadClarity(id: string) {
  if (clarityInjected) return;
  clarityInjected = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${id}`;
  document.head.appendChild(s);
  // Clarity stub so calls before load are queued
  window.clarity =
    window.clarity ||
    function (...args: unknown[]) {
      (window as unknown as { clarity: { q?: unknown[] } }).clarity!.q =
        (window as unknown as { clarity: { q?: unknown[] } }).clarity!.q || [];
      (window as unknown as { clarity: { q?: unknown[] } }).clarity!.q!.push(args);
    };
}

function applyConsent(consent: CookieConsent | null) {
  const analyticsGranted = consent?.analytics === true;
  const marketingGranted = consent?.marketing === true;

  // Update GA4 Consent Mode
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    });
  }

  // Load Clarity only when analytics consented
  if (analyticsGranted && CLARITY_ID) {
    loadClarity(CLARITY_ID);
  }
}

export default function AnalyticsLoader() {
  useEffect(() => {
    // Apply saved consent on mount
    applyConsent(readCookieConsent());

    // Re-apply whenever user changes consent in the banner
    const handler = (e: Event) => {
      applyConsent((e as CustomEvent<CookieConsent>).detail);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handler);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handler);
  }, []);

  return null;
}
