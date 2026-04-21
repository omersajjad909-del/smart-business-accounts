import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${BASE}/status?confirmed=error`);
  }

  try {
    const subscriber = await prisma.statusSubscriber.findUnique({ where: { token } });

    if (!subscriber) {
      return NextResponse.redirect(`${BASE}/status?confirmed=error`);
    }

    if (!subscriber.confirmed) {
      await prisma.statusSubscriber.update({
        where: { token },
        data: { confirmed: true },
      });
    }

    return NextResponse.redirect(`${BASE}/status?confirmed=true`);
  } catch (err) {
    console.error("Status confirm error:", err);
    return NextResponse.redirect(`${BASE}/status?confirmed=error`);
  }
}
