import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resolveCompanyId } from "@/lib/tenant";
import { getEffectiveUserLimitForCompany } from "@/lib/companySeatLimit";
import { deleteMedia, isCloudinaryUrl, isMediaConfigured, uploadMedia } from "@/lib/media";

/**
 * A profile photo arrives as a base64 data URL, the same shape /api/me/avatar
 * stores. Returns the value to save, or throws with a message worth showing.
 * null clears the photo; undefined means "leave it alone".
 */
function readAvatar(avatar: unknown): string | null | undefined {
  if (avatar === undefined) return undefined;
  if (avatar === null || avatar === "") return null;
  // The photo already on file, sent back unchanged with the rest of the form.
  if (typeof avatar === "string" && isCloudinaryUrl(avatar)) return undefined;
  if (typeof avatar !== "string" || !/^data:image\/[a-z+.-]+;base64,/i.test(avatar)) {
    throw new Error("Profile photo must be an image");
  }
  // Base64 costs about a third more than the bytes it carries, so this is the
  // 2MB file limit the self-serve avatar upload already enforces.
  if (avatar.length > 2 * 1024 * 1024 * 1.4) {
    throw new Error("Profile photo must be under 2MB");
  }
  return avatar;
}

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      // Allow login screen to fetch a basic user list before company is selected
      const publicUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        where: { active: true },
        orderBy: { name: "asc" },
      });
      console.log(`[API/Users] Public fetch: ${publicUsers.length} users found.`);
      return NextResponse.json(publicUsers);
    }

    if (role === "ADMIN") {
      try {
        const users = await prisma.user.findMany({
          where: { companies: { some: { companyId } } },
          include: { permissions: true },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(users);
      } catch {
        // Fallback if UserPermission table not yet migrated
        const users = await prisma.user.findMany({
          where: { companies: { some: { companyId } } },
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, avatar: true },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(users);
      }
    }

    const publicUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      where: { active: true, companies: { some: { companyId } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(publicUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    });

    const maxUsers = await getEffectiveUserLimitForCompany(companyId, company?.plan);

    if (maxUsers !== null && maxUsers !== undefined) {
      const count = await prisma.userCompany.count({ where: { companyId } });
      if (count >= maxUsers) {
        return NextResponse.json({ error: `User limit reached for your plan (max ${maxUsers} users).` }, { status: 400 });
      }
    }

    const { name, email, password, role, avatar } = await req.json();
    let avatarValue: string | null | undefined;
    try { avatarValue = readAvatar(avatar); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "ACCOUNTANT",
        active: true,
        // Inline only when Cloudinary is off; otherwise uploaded below, once
        // the user has an id to file it under.
        avatar: isMediaConfigured() ? null : avatarValue ?? null,
        defaultCompanyId: companyId,
        companies: {
          create: [{ companyId, isDefault: true }],
        },
      },
    });
    // The admin typed this email and set the password, so the account is
    // vouched for already. Login asks for an OTP until it finds this log, which
    // made every admin-created member verify an address the admin had supplied.
    await prisma.activityLog.create({
      data: { action: "ACCOUNT_VERIFIED", details: "Created by company admin", userId: user.id, companyId },
    }).catch(() => {});
    if (avatarValue && isMediaConfigured()) {
      const url = await uploadMedia(avatarValue, { kind: "avatars", scope: user.id });
      return NextResponse.json(await prisma.user.update({ where: { id: user.id }, data: { avatar: url } }));
    }
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { id, name, email, password, role, active, avatar } = await req.json();
    const updateData: any = { name, email, role, active };
    let avatarValue: string | null | undefined;
    try { avatarValue = readAvatar(avatar); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const target = await prisma.userCompany.findFirst({
      where: { userId: id, companyId },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not in company" }, { status: 404 });
    }

    const previous = avatarValue !== undefined
      ? await prisma.user.findUnique({ where: { id }, select: { avatar: true } })
      : null;
    if (avatarValue !== undefined) {
      updateData.avatar = avatarValue && isMediaConfigured()
        ? await uploadMedia(avatarValue, { kind: "avatars", scope: id })
        : avatarValue;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, avatar: true },
    });
    if (previous && previous.avatar !== updatedUser.avatar) {
      await deleteMedia(previous.avatar, { kind: "avatars", scope: id });
    }
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userRole = req.headers.get("x-user-role");

    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const companyId = await resolveCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
    const target = await prisma.userCompany.findFirst({
      where: { userId: id, companyId },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not in company" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
