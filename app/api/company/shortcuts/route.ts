import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

export type ShortcutItem = {
  id: string;
  keys: string[];       // e.g. ["Ctrl","K"]
  label: string;        // "Search"
  action: string;       // "focus_search" | "toggle_sidebar" | "navigate"
  route?: string;       // for action="navigate", e.g. "/dashboard/sales-invoice"
  enabled: boolean;
};

const ACTION_LOG = "COMPANY_SHORTCUTS_V1";

export const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { id: "search",    keys: ["Alt","S"],           label: "Global Search",      action: "focus_search",    enabled: true },
  { id: "sidebar",   keys: ["Alt","B"],           label: "Toggle Sidebar",     action: "toggle_sidebar",  enabled: true },
  { id: "invoice",   keys: ["Alt","I"],           label: "New Sales Invoice",  action: "navigate", route: "/dashboard/sales-invoice",  enabled: true },
  { id: "purchase",  keys: ["Alt","P"],           label: "Purchase Invoice",   action: "navigate", route: "/dashboard/purchase-invoice", enabled: true },
  { id: "dashboard", keys: ["Alt","H"],           label: "Dashboard",          action: "navigate", route: "/dashboard",                 enabled: true },
  { id: "inventory", keys: ["Alt","V"],           label: "Inventory",          action: "navigate", route: "/dashboard/inventory",       enabled: true },
];

async function getShortcuts(companyId: string): Promise<ShortcutItem[]> {
  const row = await prisma.activityLog.findFirst({
    where: { companyId, action: ACTION_LOG },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  if (!row?.details) return DEFAULT_SHORTCUTS;
  try {
    const parsed = JSON.parse(row.details);
    return Array.isArray(parsed) ? parsed : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

async function saveShortcuts(companyId: string, userId: string | null, shortcuts: ShortcutItem[]) {
  const existing = await prisma.activityLog.findFirst({
    where: { companyId, action: ACTION_LOG },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) {
    await prisma.activityLog.update({
      where: { id: existing.id },
      data: { details: JSON.stringify(shortcuts) },
    });
  } else {
    await prisma.activityLog.create({
      data: { companyId, userId: userId || undefined, action: ACTION_LOG, details: JSON.stringify(shortcuts) },
    });
  }
}

export async function GET(req: NextRequest) {
  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });
  const shortcuts = await getShortcuts(companyId);
  return NextResponse.json({ shortcuts });
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { shortcuts } = await req.json();
  if (!Array.isArray(shortcuts)) return NextResponse.json({ error: "shortcuts must be an array" }, { status: 400 });

  const userId = req.headers.get("x-user-id");
  await saveShortcuts(companyId, userId, shortcuts);
  return NextResponse.json({ shortcuts });
}
