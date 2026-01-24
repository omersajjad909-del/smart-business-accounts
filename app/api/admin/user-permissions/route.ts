import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requirePermission } from "@/lib/requirePermission";
import { PERMISSIONS } from "@/lib/permissions";

const prisma = (globalThis as any).prisma || new PrismaClient();

if (process.env.NODE_ENV === "development") {
  (globalThis as any).prisma = prisma;
}

/* =========================
   GET → list users + perms
========================= */
export async function GET(req: Request) {
  // پہلے چیک کریں کہ کیا بھیجنے والا ADMIN ہیڈر کے ساتھ آ رہا ہے
  const role = req.headers.get("x-user-role");
  
  // اگر ایڈمن نہیں ہے، تب پرمیشن چیک کرو
  if (role !== "ADMIN") {
    const guard = await requirePermission(req, PERMISSIONS.MANAGE_USERS);
    if (guard) return guard;
  }

  const users = await prisma.user.findMany({
    include: {
      permissions: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

/* =========================
   POST → update permissions
========================= */
export async function POST(req: Request) {
  const role = req.headers.get("x-user-role");

  // ایڈمن کے لیے چھوٹ، باقیوں کے لیے پرمیشن لازمی
  if (role !== "ADMIN") {
    const guard = await requirePermission(req, PERMISSIONS.MANAGE_USERS);
    if (guard) return guard;
  }

  const { userId, permissions } = await req.json();

  if (!userId || !Array.isArray(permissions)) {
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction([
      // 🔥 پچھلی تمام پرمیشنز مٹائیں
      prisma.userPermission.deleteMany({
        where: { userId },
      }),

      // 🔥 نئی پرمیشنز ڈالیں
      prisma.userPermission.createMany({
        data: permissions.map((p: string) => ({
          userId,
          permission: p,
        })),
      }),

      // 🔥 ایکٹیویٹی لاگ بنائیں
      prisma.activityLog.create({
        data: {
          action: "PERMISSIONS_UPDATED",
          details: `Updated permissions for user ${userId}`,
          userId: userId, // یہاں وہ یوزر آئی ڈی دیں جس نے چینج کیا یا جس کی چینج ہوئی
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("TRANSACTION ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}