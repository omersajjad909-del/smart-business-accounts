import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_THEME = new Set(["light", "dark", "auto"]);
const VALID_DENSITY = new Set(["compact", "comfortable"]);
const VALID_SIDEBAR = new Set(["expanded", "collapsed"]);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  const prefs = await (prisma as any).userPreferences.findUnique({
    where: { userId },
  });

  return NextResponse.json({
    themeMode:      prefs?.themeMode      || "auto",
    density:        prefs?.density        || "comfortable",
    sidebarDefault: prefs?.sidebarDefault || "expanded",
  });
}

export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const themeMode      = String(body?.themeMode || "").trim();
  const density        = String(body?.density || "").trim();
  const sidebarDefault = String(body?.sidebarDefault || "").trim();

  const data: Record<string, string> = {};
  if (themeMode && VALID_THEME.has(themeMode))       data.themeMode = themeMode;
  if (density && VALID_DENSITY.has(density))         data.density = density;
  if (sidebarDefault && VALID_SIDEBAR.has(sidebarDefault)) data.sidebarDefault = sidebarDefault;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const prefs = await (prisma as any).userPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  return NextResponse.json({
    themeMode:      prefs.themeMode,
    density:        prefs.density,
    sidebarDefault: prefs.sidebarDefault,
  });
}
