export type CookieConsent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentVersion: string;
  savedAt: string;
};

export const COOKIE_CONSENT_KEY = "finova_cookie_consent";
export const COOKIE_CONSENT_EVENT = "finova_cookie_consent_updated";
export const COOKIE_CONSENT_VERSION = "2026-04";

export const defaultCookieConsent = (): CookieConsent => ({
  necessary: true,
  functional: true,
  analytics: false,
  marketing: false,
  consentVersion: COOKIE_CONSENT_VERSION,
  savedAt: "",
});

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      functional: Boolean(parsed?.functional),
      analytics: Boolean(parsed?.analytics),
      marketing: Boolean(parsed?.marketing),
      consentVersion: String(parsed?.consentVersion || COOKIE_CONSENT_VERSION),
      savedAt: String(parsed?.savedAt || ""),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: Omit<CookieConsent, "savedAt" | "consentVersion"> & Partial<Pick<CookieConsent, "savedAt" | "consentVersion">>) {
  if (typeof window === "undefined") return;
  const payload: CookieConsent = {
    necessary: true,
    functional: Boolean(consent.functional),
    analytics: Boolean(consent.analytics),
    marketing: Boolean(consent.marketing),
    consentVersion: consent.consentVersion || COOKIE_CONSENT_VERSION,
    savedAt: consent.savedAt || new Date().toISOString(),
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: payload }));
}
