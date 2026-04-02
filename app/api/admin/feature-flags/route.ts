// FILE: app/api/admin/feature-flags/route.ts
// Feature flags stored in ActivityLog with action="FEATURE_FLAG_CONFIG"
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, verifyJwt } from "@/lib/auth";

function isAdmin(req: NextRequest) {
  const role = String(req.headers.get("x-user-role") || "").toUpperCase();
  if (role === "ADMIN") return true;
  try { const p = verifyJwt(getTokenFromRequest(req as any)!); return String(p?.role||"").toUpperCase()==="ADMIN"; } catch { return false; }
}

async function getFlags() {
  try {
    // Try FeatureFlag model
    const flags = await (prisma as any).featureFlag.findMany({ orderBy: { createdAt: "desc" } });
    return flags;
  } catch {
    // Fallback: use ActivityLog storage
    const log = await prisma.activityLog.findFirst({
      where: { action: "FEATURE_FLAG_CONFIG" },
      orderBy: { createdAt: "desc" },
    });
    if (!log?.details) return getDefaultFlags();
    try { return JSON.parse(log.details); } catch { return getDefaultFlags(); }
  }
}

function getDefaultFlags() {
  return [
    { id:"flag_ai_insights",       name:"ai_insights",        description:"AI-powered business insights",  enabled:true,  rollout:100, createdAt: new Date().toISOString() },
    { id:"flag_multi_currency",    name:"multi_currency",      description:"Multi-currency support",         enabled:true,  rollout:100, createdAt: new Date().toISOString() },
    { id:"flag_bulk_export",       name:"bulk_export",         description:"Bulk data export (CSV/PDF)",    enabled:false, rollout:0,   createdAt: new Date().toISOString() },
    { id:"flag_beta_dashboard",    name:"beta_dashboard",      description:"New beta dashboard UI",         enabled:false, rollout:20,  createdAt: new Date().toISOString() },
    { id:"flag_sms_notifications", name:"sms_notifications",   description:"SMS alerts for invoices",       enabled:true,  rollout:50,  createdAt: new Date().toISOString() },
  ];
}

async function saveFlags(flags: any[]) {
  try {
    // no-op if using model (individual updates handle it)
  } catch {}
  await prisma.activityLog.create({
    data: { action: "FEATURE_FLAG_CONFIG", details: JSON.stringify(flags) },
  });
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  try {
    const flags = await getFlags();
    return NextResponse.json({ flags });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error:"Forbidden" }, { status:403 });
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "TOGGLE") {
      try {
        await (prisma as any).featureFlag.update({ where:{ id:body.id }, data:{ enabled:body.enabled, updatedAt:new Date() } });
      } catch {
        const flags = await getFlags();
        const updated = flags.map((f:any) => f.id===body.id ? { ...f, enabled:body.enabled, updatedAt:new Date().toISOString() } : f);
        await saveFlags(updated);
      }
      return NextResponse.json({ success:true });
    }

    if (action === "CREATE") {
      const newFlag = { id:`flag_${Date.now()}`, name:body.name, description:body.description||"", enabled:body.enabled??true, rollout:body.rollout??100, createdAt:new Date().toISOString() };
      try {
        await (prisma as any).featureFlag.create({ data: newFlag });
      } catch {
        const flags = await getFlags();
        await saveFlags([...flags, newFlag]);
      }
      return NextResponse.json({ flag: newFlag });
    }

    if (action === "DELETE") {
      try {
        await (prisma as any).featureFlag.delete({ where:{ id:body.id } });
      } catch {
        const flags = await getFlags();
        await saveFlags(flags.filter((f:any) => f.id!==body.id));
      }
      return NextResponse.json({ success:true });
    }

    return NextResponse.json({ error:"Invalid action" }, { status:400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}