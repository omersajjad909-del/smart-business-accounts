import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Support ?key= lookup via activityLog
    const key = req.nextUrl.searchParams.get("key");
    if (key) {
      const log = await prisma.activityLog.findFirst({
        where: { action: "ADMIN_SETTING", details: { startsWith: `{"key":"${key}"` } },
        orderBy: { createdAt: "desc" },
      }).catch(() => null);
      if (log) {
        try {
          const parsed = JSON.parse(log.details || "{}");
          return NextResponse.json({ key, value: parsed.value });
        } catch {}
      }
      return NextResponse.json({ key, value: null });
    }

    // Defaults, then whatever has actually been saved on top. Returning the
    // bare defaults meant every toggle on this screen read back as its default
    // however many times it had been saved — the Maintenance Mode switch, for
    // one, flipped itself off on every reload.
    const defaults: Record<string, unknown> = {
      appName: "FinovaOS",
      supportEmail: "hello@finovaos.app",
      maintenanceMode: false,
      allowSignups: true,
      maxUsersPerCompany: 50,
      sessionTimeout: 30,
    };

    const savedRows = await prisma.activityLog.findMany({
      where: { action: "ADMIN_SETTING" },
      orderBy: { createdAt: "desc" },
      select: { details: true },
      take: 200,
    }).catch(() => []);

    const settings = { ...defaults };
    const seen = new Set<string>();
    for (const row of savedRows) {
      try {
        const { key: k, value } = JSON.parse(row.details || "{}");
        // Newest first, so the first sighting of a key is the current value.
        if (typeof k === "string" && k && !seen.has(k)) {
          seen.add(k);
          settings[k] = value;
        }
      } catch {}
    }

    return NextResponse.json({ settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    // Support key/value storage in activityLog
    if (body.key && body.value !== undefined) {
      await prisma.activityLog.create({
        data: {
          action: "ADMIN_SETTING",
          details: JSON.stringify({ key: body.key, value: body.value }),
          userId: req.headers.get("x-user-id") || null,
        },
      });
      return NextResponse.json({ success: true });
    }

    console.log("Saving admin settings:", body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
