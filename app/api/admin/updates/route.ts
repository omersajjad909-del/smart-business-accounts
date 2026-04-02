// FILE: app/api/admin/updates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  // Check headers first
  let role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;

  // Check JWT token from cookie
  try {
    const token = getTokenFromRequest(req as any);
    if (!token) return false;
    const payload = verifyJwt(token);
    return String(payload?.role || "").toUpperCase() === "ADMIN";
  } catch {
    return false;
  }
}

async function getUpdates(publishedOnly = false) {
  try {
    const where = publishedOnly ? { published: true } : {};
    return await (prisma as any).productUpdate.findMany({
      where, orderBy: { createdAt: "desc" }, take: 100,
    });
  } catch {
    // Fallback: ActivityLog
    const logs = await prisma.activityLog.findMany({
      where: { action: "PRODUCT_UPDATE" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return logs.map(l => {
      try {
        const d = JSON.parse(l.details||"{}");
        if (publishedOnly && d.published === false) return null;
        return { id: l.id, createdAt: l.createdAt, ...d };
      }
      catch { return null; }
    }).filter(Boolean);
  }
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  try {
    const updates = await getUpdates();
    return NextResponse.json({ updates });
  } catch (e: any) {
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  try {
    const { action, id, title, body, type, version, published } = await req.json();
    const adminId = req.headers.get("x-user-id") || undefined;

    if (action === "CREATE") {
      const data = { title, body, type:type||"feature", version:version||"", published:published??true };
      let update: any;
      try {
        update = await (prisma as any).productUpdate.create({ data });
      } catch {
        await prisma.activityLog.create({
          data: { action:"PRODUCT_UPDATE", details:JSON.stringify({ ...data, id:`upd_${Date.now()}` }), userId:adminId },
        });
        update = { id:`upd_${Date.now()}`, createdAt:new Date().toISOString(), ...data };
      }
      // Notify users
      if (published) {
        try {
          await (prisma as any).notification.create({
            data: { type:"INFO", title:`New Update: ${title}`, message:body?.slice(0,100), isRead:false },
          });
        } catch {}
      }
      return NextResponse.json({ update });
    }

    if (action === "EDIT") {
      const data = { title, body, type, version, published };
      try {
        await (prisma as any).productUpdate.update({ where:{ id }, data });
      } catch {
        await prisma.activityLog.create({
          data: { action:"PRODUCT_UPDATE_EDIT", details:JSON.stringify({ id, ...data }), userId:adminId },
        });
      }
      return NextResponse.json({ success:true });
    }

    if (action === "TOGGLE_PUBLISH") {
      try {
        await (prisma as any).productUpdate.update({ where:{ id }, data:{ published } });
      } catch {
        await prisma.activityLog.create({
          data: { action:"PRODUCT_UPDATE_TOGGLE", details:JSON.stringify({ id, published }), userId:adminId },
        });
      }
      return NextResponse.json({ success:true });
    }

    if (action === "DELETE") {
      try {
        await (prisma as any).productUpdate.delete({ where:{ id } });
      } catch {
        await prisma.activityLog.create({
          data: { action:"PRODUCT_UPDATE_DELETE", details:JSON.stringify({ id }), userId:adminId },
        });
      }
      return NextResponse.json({ success:true });
    }

    return NextResponse.json({ error:"Invalid action" }, { status:400 });
  } catch (e: any) {
    return NextResponse.json({ error:e.message }, { status:500 });
  }
}