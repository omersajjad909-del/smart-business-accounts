import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isAdmin(req: NextRequest): boolean {
  return req.headers.get("x-user-role") === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const referrals = await prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ referrals });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { referrerId, refereeEmail } = body as {
      referrerId: string;
      refereeEmail: string;
    };

    if (!referrerId || !refereeEmail) {
      return NextResponse.json(
        { error: "referrerId and refereeEmail are required" },
        { status: 400 }
      );
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId,
        refereeEmail,
        status: "pending",
      },
    });

    return NextResponse.json({ referral }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, reward } = body as {
      id: string;
      status?: string;
      reward?: number;
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (reward !== undefined) data.reward = reward;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "At least one of status or reward must be provided" },
        { status: 400 }
      );
    }

    const referral = await prisma.referral.update({
      where: { id },
      data,
    });

    return NextResponse.json({ referral });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
