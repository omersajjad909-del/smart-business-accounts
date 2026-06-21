import { createHmac } from "crypto";

const BROWSER_USER_KEY = "user";
const DEMO_BUSINESS_KEY = "finova_demo_business";

function normalizeBrowserUser(raw: string | null) {
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  const user = parsed.user ?? parsed;

  if (!user?.id || !user?.email) {
    return null;
  }

  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: (user.role || "VIEWER").trim().toUpperCase(),
    avatar: user.avatar || null,
    businessType: user.businessType || null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    rolePermissions: Array.isArray(user.rolePermissions) ? user.rolePermissions : [],
    companyId: user.companyId || user.defaultCompanyId || null,
    companies: Array.isArray(user.companies) ? user.companies : [],
    // Admin panel fields — preserved for team member access control
    isSuperAdmin: user.isSuperAdmin !== undefined ? user.isSuperAdmin : undefined,
    allowedPages: Array.isArray(user.allowedPages) ? user.allowedPages : (user.allowedPages ?? null),
    team: user.team || null,
  };
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  try {
    const sessionRaw = window.sessionStorage.getItem(BROWSER_USER_KEY);
    if (!sessionRaw) return null;

    const currentUser = normalizeBrowserUser(sessionRaw);
    return currentUser ?? null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: unknown) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(user);
  window.sessionStorage.setItem(BROWSER_USER_KEY, serialized);
  // Remove stale localStorage entry if it exists (legacy cleanup)
  try { window.localStorage.removeItem(BROWSER_USER_KEY); } catch {}
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(BROWSER_USER_KEY);
  try { window.localStorage.removeItem(BROWSER_USER_KEY); } catch {}
}

export function updateStoredUser(mutator: (current: any) => any) {
  if (typeof window === "undefined") return null;
  try {
    const sessionRaw = window.sessionStorage.getItem(BROWSER_USER_KEY);
    const parsed = JSON.parse(sessionRaw || "{}");
    const next = mutator(parsed);
    window.sessionStorage.setItem(BROWSER_USER_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function getStoredDemoBusinessPreference() {
  if (typeof window === "undefined") return null;
  try {
    const sessionValue = window.sessionStorage.getItem(DEMO_BUSINESS_KEY);
    try {
      window.localStorage.removeItem(DEMO_BUSINESS_KEY);
    } catch {}
    return sessionValue || null;
  } catch {
    return null;
  }
}

export function setStoredDemoBusinessPreference(businessType: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!businessType) {
      window.sessionStorage.removeItem(DEMO_BUSINESS_KEY);
      try {
        window.localStorage.removeItem(DEMO_BUSINESS_KEY);
      } catch {}
      return;
    }
    window.sessionStorage.setItem(DEMO_BUSINESS_KEY, businessType);
    try {
      window.localStorage.removeItem(DEMO_BUSINESS_KEY);
    } catch {}
  } catch {}
}

// ===== Server-side auth helpers =====
// Minimal HS256 JWT sign/verify without external deps
// Used by API routes and proxy/auth middleware helpers
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET env var is missing or too short (min 32 chars). Set it in your deployment environment.");
    }
    // Dev-only fallback — will cause a startup warning
    console.warn("[SECURITY WARNING] SESSION_SECRET not set. Using insecure dev secret. NEVER do this in production.");
    return "dev-only-insecure-secret-set-SESSION_SECRET-in-env";
  }
  return secret;
}

export function signJwt(payload: Record<string, any>): string {
  const secret = getSessionSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${enc(header)}.${enc(payload)}`;
  const hmac = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${hmac}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  try {
    const secret = getSessionSecret();
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const data = `${h}.${p}`;
    const expected = createHmac("sha256", secret).update(data).digest("base64url");
    if (expected !== s) return null;
    const payloadJson = Buffer.from(p, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const parts = cookieHeader.split(";").map((c) => c.trim());
    for (const part of parts) {
      if (part.startsWith("sb_auth=")) {
        return decodeURIComponent(part.substring("sb_auth=".length));
      }
    }
    return null;
  } catch {
    return null;
  }
}
