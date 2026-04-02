const DEFAULT_MARKETING_URL = "https://finovaos.app";
const DEFAULT_APP_URL = "https://usefinova.app";

function normalizeUrl(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  return raw ? raw.replace(/\/+$/, "") : fallback;
}

export function getMarketingUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_BASE_URL, DEFAULT_MARKETING_URL);
}

export function getAppUrl() {
  return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL, DEFAULT_APP_URL);
}

export function getAdminUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_ADMIN_URL,
    `${getMarketingUrl().replace("://", "://admin.")}`,
  );
}

export function getApiUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_API_URL,
    `${getMarketingUrl().replace("://", "://api.")}`,
  );
}

export function getAiUrl() {
  return normalizeUrl(
    process.env.NEXT_PUBLIC_AI_URL,
    `${getMarketingUrl().replace("://", "://ai.")}`,
  );
}

export function isLocalLikeUrl(url: string | undefined) {
  const value = (url || "").toLowerCase();
  return (
    value.includes("localhost") ||
    value.includes("127.0.0.1") ||
    value.includes(".local")
  );
}

export function getRuntimeMarketingUrl(origin?: string) {
  const configured = getMarketingUrl();
  if (!isLocalLikeUrl(configured) || !origin) return configured;
  return origin.replace(/\/+$/, "");
}

export function getRuntimeAppUrl(origin?: string) {
  const configured = getAppUrl();
  if (!isLocalLikeUrl(configured) || !origin) return configured;
  return origin.replace(/\/+$/, "");
}

