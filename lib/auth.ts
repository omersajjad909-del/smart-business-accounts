export function getCurrentUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("user");
    if (!raw) {
      console.log("🔍 No user in localStorage");
      return null;
    }

    const parsed = JSON.parse(raw);
    // Handle both { user: {...} } and direct user object
    const user = parsed.user ?? parsed;

    if (!user?.id || !user?.email) {
      console.log("🔍 Invalid user object:", user);
      return null;
    }

    const currentUser = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: (user.role || "VIEWER").trim().toUpperCase(),

      // 🔥 User-specific aur role-based permissions
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      rolePermissions: Array.isArray(user.rolePermissions) ? user.rolePermissions : [],
      companyId: user.companyId || user.defaultCompanyId || null,
      companies: Array.isArray(user.companies) ? user.companies : [],
    };

    console.log("✅ getCurrentUser:", { email: currentUser.email, role: currentUser.role });
    return currentUser;
  } catch (e: any) {
    console.error("❌ getCurrentUser error:", e);
    return null;
  }
}

// ===== Server-side auth helpers =====
// Minimal HS256 JWT sign/verify without external deps
// Used by API routes and proxy/auth middleware helpers
import { createHmac } from "crypto";

export function signJwt(payload: Record<string, any>): string {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${enc(header)}.${enc(payload)}`;
  const hmac = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${hmac}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
  try {
    const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
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


