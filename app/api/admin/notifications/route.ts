// FILE: app/api/admin/notifications/route.ts
// Notifications — Prisma Notification model use karta hai
// Agar model nahi hai toh empty array return karta hai (no crash)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let notifications: any[] = [];
    try {
      notifications = await (prisma as any).notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    } catch {
      // Notification model nahi hai schema mein — empty return karo
      notifications = [];
    }

    return NextResponse.json({ notifications });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = String(req.headers.get("x-user-role") || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, id } = await req.json();

    if (action === "MARK_READ") {
      try {
        if (id === "ALL") {
          await (prisma as any).notification.updateMany({
            where: { isRead: false },
            data: { isRead: true },
          });
        } else {
          await (prisma as any).notification.update({
            where: { id },
            data: { isRead: true },
          });
        }
      } catch {
        // Model nahi hai — silently ignore
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}