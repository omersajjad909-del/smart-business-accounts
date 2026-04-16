import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomPlanMonthlyUsd, parseCustomModules } from "@/lib/customPlanPricing";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, modules } = await req.json();

    if (!name || !email || !company || !modules) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const moduleIds = parseCustomModules(modules);
    if (moduleIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one valid module" }, { status: 400 });
    }
    const computedPrice = getCustomPlanMonthlyUsd(moduleIds);

    const request = await prisma.customPlanRequest.create({
      data: {
        name,
        email,
        company,
        modules: moduleIds.join(","),
        price: computedPrice,
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Custom Plan Request Error:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
