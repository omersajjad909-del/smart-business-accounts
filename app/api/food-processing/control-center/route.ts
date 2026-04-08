import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

function normalizeRole(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

export async function GET(req: NextRequest) {
  const role = normalizeRole(req.headers.get("x-user-role"));
  if (!["ADMIN", "ACCOUNTANT", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const recipes = await prisma.businessRecord.findMany({
    where: { companyId, category: "food_recipe" },
    orderBy: { createdAt: "desc" },
  });

  const mappedRecipes = recipes.map((record) => {
    const data = (record.data || {}) as Record<string, unknown>;
    return {
      id: record.id,
      recipe: record.title,
      sku: String(data.sku || ""),
      batchYield: Number(data.batchYield || 0),
      unitCost: Number(record.amount || 0),
      status: String(record.status || "draft"),
    };
  });

  const totalCost = mappedRecipes.reduce((sum, item) => sum + item.unitCost, 0);
  const totalYield = mappedRecipes.reduce((sum, item) => sum + item.batchYield, 0);

  return NextResponse.json({
    summary: {
      recipes: mappedRecipes.length,
      liveRecipes: mappedRecipes.filter((item) => item.status === "live").length,
      approvedRecipes: mappedRecipes.filter((item) => item.status === "approved").length,
      avgUnitCost: mappedRecipes.length ? Math.round(totalCost / mappedRecipes.length) : 0,
      totalYield,
    },
    recipes: mappedRecipes,
  });
}
