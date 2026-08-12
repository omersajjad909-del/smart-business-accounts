import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyId } from "@/lib/tenant";
import { requireRole } from "@/lib/requireRole";

/**
 * Who is allowed to read which chat conversations.
 *
 * The support inbox routes used to guard on `requireRole(req, ["ADMIN"])` and
 * nothing else — no company filter anywhere. Every customer's own ADMIN user
 * satisfies that check, so any tenant admin could list every conversation on
 * the platform, including the finovaos.app widget chats from anonymous
 * visitors, with the visitor's name, email and full transcript. Reading one
 * conversation by id needed no authentication at all.
 *
 * Scope rules:
 *   - Platform admins carry the synthetic "system" company (proxy.ts sets it).
 *     They own the public widget inbox — the rows the widget writes with no
 *     companyId.
 *   - Everyone else sees only conversations stamped with their own companyId.
 */

export const PLATFORM_COMPANY_ID = "system";

export type ChatScope =
  | { error: NextResponse; where?: undefined; companyId?: undefined }
  | { error?: undefined; where: { companyId: string | null }; companyId: string };

export async function resolveChatScope(req: NextRequest): Promise<ChatScope> {
  const guard = requireRole(req, ["ADMIN"]);
  if (guard) return { error: guard };

  const companyId = await resolveCompanyId(req);
  if (!companyId) {
    return { error: NextResponse.json({ error: "Company required" }, { status: 400 }) };
  }

  return {
    companyId,
    where: { companyId: companyId === PLATFORM_COMPANY_ID ? null : companyId },
  };
}
