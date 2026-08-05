import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "ADMIN";
}

// GET — list all admin accounts: AdminUser team members PLUS User-table
// platform admins (role=ADMIN), merged into one directory. Platform admins
// are tagged `source:"platform"` and always `isSuperAdmin:true` so the UI
// treats them the same as a super admin — no disable/remove controls — since
// this page is only equipped to manage AdminUser rows (see PATCH/DELETE).
export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [teamMembers, platformAdmins] = await Promise.all([
      (prisma as any).adminUser.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, team: true, allowedPages: true, active: true, createdAt: true, lastLoginAt: true, isSuperAdmin: true },
      }),
      // role="ADMIN" alone also matches every company owner (signup assigns
      // it automatically) — only true platform admins have zero companies.
      prisma.user.findMany({
        where: { role: "ADMIN", companies: { none: {} } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, active: true, createdAt: true },
      }),
    ]);

    const members = [
      ...teamMembers.map((m: any) => ({ ...m, source: "team" })),
      ...platformAdmins.map((u: any) => ({
        id: u.id, name: u.name, email: u.email, team: "Platform Admin",
        allowedPages: null, active: u.active, createdAt: u.createdAt,
        lastLoginAt: null, isSuperAdmin: true, source: "platform",
      })),
    ];

    return NextResponse.json({ members });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create team member
export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { name, email, password, team, allowedPages } = await req.json();
    if (!name || !email || !password)
      return NextResponse.json({ error: "name, email, password required" }, { status: 400 });

    const existing = await (prisma as any).adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const member = await (prisma as any).adminUser.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        team: team || null,
        allowedPages: JSON.stringify(Array.isArray(allowedPages) ? allowedPages : []),
        active: true,
        isSuperAdmin: false,
      },
    });
    return NextResponse.json({ member: { id: member.id, name: member.name, email: member.email, team: member.team } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH — update (allowedPages, active, team, name, password)
export async function PATCH(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id, name, team, allowedPages, active, password } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Platform admins (User table, role=ADMIN) aren't AdminUser rows — this
    // endpoint can't touch them. Manage those accounts directly, deliberately.
    const isPlatformAdmin = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true } });
    if (isPlatformAdmin) {
      return NextResponse.json({ error: "Platform admins can't be managed from here." }, { status: 403 });
    }

    const data: any = {};
    if (name         !== undefined) data.name         = name;
    if (team         !== undefined) data.team         = team;
    if (allowedPages !== undefined) data.allowedPages = JSON.stringify(allowedPages);
    if (active       !== undefined) data.active       = Boolean(active);
    if (password)                   data.passwordHash = await bcrypt.hash(password, 12);

    const updated = await (prisma as any).adminUser.update({ where: { id }, data });
    return NextResponse.json({ success: true, member: { id: updated.id, name: updated.name, active: updated.active } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remove team member
export async function DELETE(req: NextRequest) {
  try {
    if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const isPlatformAdmin = await prisma.user.findFirst({ where: { id, role: "ADMIN" }, select: { id: true } });
    if (isPlatformAdmin) {
      return NextResponse.json({ error: "Platform admins can't be deleted from here." }, { status: 403 });
    }

    await (prisma as any).adminUser.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
