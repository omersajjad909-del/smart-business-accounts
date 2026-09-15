/**
 * GET  /api/company/page-prefs — the pages this company has, and which of them
 *                                it has switched off
 * POST /api/company/page-prefs — save the switched-off list
 *
 * The customer's own tidying, within what their plan already grants. It can
 * only ever subtract: the GET returns exactly what the plan, the company
 * overrides and the global hides between them allowed, and the POST stores a
 * list of ids to leave out of the sidebar. Nothing here can add a page.
 *
 * Admin only. One person's tidy sidebar is everybody's sidebar in this
 * company, so it is not a personal setting to be changed by whoever is logged
 * in at the till.
 */

import { NextRequest, NextResponse } from "next/server";

import { getTokenFromRequest, verifyJwt } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveCompanyDashboardFeatures } from "@/lib/companyPlanFeatures";
import {
  COMPANY_PAGE_PREFS_ACTION,
  isPageHideable,
  parseCompanyPagePrefs,
  serializeCompanyPagePrefs,
} from "@/lib/companyPagePrefs";
import { DASHBOARD_FEATURE_DEFS } from "@/lib/dashboardFeatureRegistry";

type Session = { companyId: string; userId: string; isAdmin: boolean };

function readSession(req: NextRequest): Session | null {
  const token = getTokenFromRequest(req);
  const payload = token ? verifyJwt(token) : null;
  const companyId = payload?.companyId ? String(payload.companyId) : "";
  const userId = String(payload?.userId || payload?.id || "");
  if (!companyId || !userId) return null;
  return { companyId, userId, isAdmin: String(payload?.role || "").toUpperCase() === "ADMIN" };
}

async function readPrefs(companyId: string) {
  const log = await prisma.activityLog.findFirst({
    where: { companyId, action: COMPANY_PAGE_PREFS_ACTION },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  return parseCompanyPagePrefs(log?.details);
}

export async function GET(req: NextRequest) {
  const session = readSession(req);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  /* What the plan, the company's exceptions and the global hides between them
     decided. `null` means nothing was ever configured, which every other
     caller reads as full access — so the screen shows the whole registry
     rather than an empty list that would read as "your plan has nothing". */
  const entitled = await resolveCompanyDashboardFeatures(session.companyId);
  const allowed = new Set(entitled ?? DASHBOARD_FEATURE_DEFS.map((f) => f.id));

  const pages = DASHBOARD_FEATURE_DEFS
    .filter((f) => allowed.has(f.id))
    .map((f) => ({
      id: f.id,
      label: f.label,
      route: f.route,
      section: f.section,
      description: f.description ?? "",
      hideable: isPageHideable(f.id),
    }));

  const prefs = await readPrefs(session.companyId);
  return NextResponse.json({ pages, hidden: prefs.hidden, canEdit: session.isAdmin });
}

export async function POST(req: NextRequest) {
  const session = readSession(req);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Only an admin can change which pages this company uses" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.hidden)) {
    return NextResponse.json({ error: "Expected a `hidden` array of page ids" }, { status: 400 });
  }

  /* Entitlement is re-read rather than trusted from the client: a stale tab
     could otherwise post an id the company no longer has, and it would sit in
     the store for ever being filtered against a page that is not there. */
  const entitled = await resolveCompanyDashboardFeatures(session.companyId);
  const allowed = entitled ? new Set(entitled) : null;
  const hidden = (body.hidden as unknown[])
    .map((id) => String(id ?? "").trim())
    .filter((id) => id && isPageHideable(id) && (!allowed || allowed.has(id)));

  // serializeCompanyPagePrefs drops unknown ids as well, so what lands in the
  // store is always a list of pages that exist and may legitimately be hidden.
  await prisma.activityLog.create({
    data: {
      companyId: session.companyId,
      userId: session.userId,
      action: COMPANY_PAGE_PREFS_ACTION,
      details: serializeCompanyPagePrefs({ hidden }),
    },
  });

  return NextResponse.json({ ok: true, hidden });
}
