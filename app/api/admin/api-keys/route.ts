// FILE: app/api/admin/api-keys/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try { const p = verifyJwt(getTokenFromRequest(req as any)!); return String(p?.role||"").toUpperCase()==="ADMIN"; } catch { return false; }
}

function maskKey(key: string) {
  if (!key || key.length < 10) return key;
  return key.slice(0, 8) + "****" + key.slice(-4);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    let keys: any[] = [];

    // Try ApiKey model
    try {
      const raw = await (prisma as any).apiKey.findMany({
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      });
      keys = raw.map((k: any) => ({
        id:          k.id,
        companyName: k.company?.name || k.companyId || "—",
        keyPreview:  maskKey(k.key || k.apiKey || ""),
        key:         k.key || k.apiKey || "",
        status:      k.status?.toLowerCase() || (k.revokedAt ? "revoked" : "active"),
        lastUsed:    k.lastUsedAt || k.lastUsed || null,
        createdAt:   k.createdAt,
        revokedAt:   k.revokedAt || null,
      }));
    } catch {
      // Try Company.apiKey field
      try {
        const companies = await prisma.company.findMany({
          where: { NOT: { apiKey: null } } as any,
          select: { id: true, name: true, apiKey: true, createdAt: true } as any,
        });
        keys = (companies as any[]).map(c => ({
          id:          c.id,
          companyName: c.name,
          keyPreview:  maskKey(c.apiKey || ""),
          key:         c.apiKey || "",
          status:      "active",
          lastUsed:    null,
          createdAt:   c.createdAt,
        }));
      } catch {
        keys = [];
      }
    }

    return NextResponse.json({ keys });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { action, id } = await req.json();

    if (action === "REVOKE") {
      const revokedAt = new Date();
      try {
        await (prisma as any).apiKey.update({
          where: { id },
          data: { status: "REVOKED", revokedAt },
        });
      } catch {
        // Try company apiKey revoke
        try {
          await prisma.company.update({
            where: { id },
            data: { apiKey: null } as any,
          });
        } catch {}
        // Log it
        await prisma.activityLog.create({
          data: {
            action: "API_KEY_REVOKED",
            details: JSON.stringify({ keyId: id, revokedAt }),
            userId: req.headers.get("x-user-id") || null,
            companyId: id,
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
