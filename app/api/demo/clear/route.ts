/**
 * POST /api/demo/clear — empty the caller's demo workspace, keep the workspace.
 *
 * A visitor trying the product enters a few of their own invoices, then wants
 * a clean sheet without losing the session and starting the tour again. That
 * is what this is: the same wipe Dev Test Mode uses, against the sandbox the
 * caller is already signed into.
 *
 * Distinct from /api/demo/end, which destroys the sandbox and signs them out.
 *
 * The company is taken from the caller's own token, never from the request
 * body, and it must be flagged isDemo. Both conditions matter: a company id
 * posted in would let anyone name someone else's, and isDemo is what keeps a
 * forged or stale token from reaching a real tenant's books.
 */

import { NextRequest, NextResponse } from "next/server";

import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearCompanyData } from "@/lib/clearCompanyData";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  const companyId = payload?.companyId ? String(payload.companyId) : "";

  if (!companyId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, isDemo: true },
  });

  // Read from the row, not the token: a demo flag that lived in the JWT would
  // still say "demo" on a session minted before the workspace became real.
  if (!company?.isDemo) {
    return NextResponse.json(
      { error: "This only works inside a demo workspace" },
      { status: 403 },
    );
  }

  try {
    await clearCompanyData(companyId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Clear failed";
    console.error("[demo/clear]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
