import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Profile photos are stored inline as data URLs on the user row, the same way
 * /api/me/avatar stores the customer-side ones. That route authenticates off
 * the JWT cookie; this panel authenticates off the x-user-id/x-user-role
 * headers, so the admin photo rides along on this route rather than borrowing
 * an auth scheme the admin pages do not use.
 */
const MAX_AVATAR_CHARS = 2_800_000;   // ~2MB once base64 is decoded

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    const adminUser = user
      ? null
      : await (prisma as any).adminUser?.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            createdAt: true,
            team: true,
            isSuperAdmin: true,
          },
        });

    const account = user ?? adminUser;
    if (!account) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: account.name,
      email: account.email,
      role: user ? user.role : "ADMIN",
      avatar: user ? user.avatar : null,
      joined: (user ? user.createdAt : adminUser.createdAt).toISOString(),
    });
  } catch (error: any) {
    console.error("ADMIN_PROFILE_GET_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const body = await req.json();

    // A photo-only save must not have to resend name and email, and clearing
    // the photo has to be distinguishable from not touching it: `null` means
    // remove, absent means leave alone.
    const photoOnly = body?.avatar !== undefined && body?.name === undefined && body?.email === undefined;

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!photoOnly && (!name || !email)) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    let avatar: string | null | undefined;
    if (body?.avatar === null) {
      avatar = null;
    } else if (typeof body?.avatar === "string") {
      if (!body.avatar.startsWith("data:image/")) {
        return NextResponse.json({ error: "Photo must be an image" }, { status: 400 });
      }
      if (body.avatar.length > MAX_AVATAR_CHARS) {
        return NextResponse.json({ error: "Photo must be under 2MB" }, { status: 400 });
      }
      avatar = body.avatar;
    }

    if (!photoOnly) {
      const emailOwner = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (emailOwner) {
        return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    });

    const adminUser = user
      ? null
      : await (prisma as any).adminUser?.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, active: true, createdAt: true },
        });

    if (!user && !adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(photoOnly ? {} : { name, email }),
          ...(avatar !== undefined ? { avatar } : {}),
        },
        select: {
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        avatar: updated.avatar,
        joined: updated.createdAt.toISOString(),
      });
    }

    const updated = await (prisma as any).adminUser.update({
      where: { id: userId },
      data: {
        ...(photoOnly ? {} : { name, email }),
      },
      select: {
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      name: updated.name,
      email: updated.email,
      role: "ADMIN",
      avatar: null,
      joined: updated.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error("ADMIN_PROFILE_PATCH_ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
