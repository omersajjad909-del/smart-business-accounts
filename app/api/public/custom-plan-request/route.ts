import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, modules, price } = await req.json();

    if (!name || !email || !company || !modules || !price) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const request = await prisma.customPlanRequest.create({
      data: {
        name,
        email,
        company,
        modules,
        price,
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Custom Plan Request Error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
