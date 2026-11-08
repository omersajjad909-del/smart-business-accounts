// FILE: lib/fbrAccess.ts
//
// Server-side gate for the FBR e-invoice screens and APIs. Hiding the menu
// link is not enough: the URL still opens. See lib/countryPack.ts for the rule.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { isFbrAvailable } from "@/lib/countryPack";

export async function companyHasFbr(companyId: string): Promise<boolean> {
  const [company, settings] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { country: true } }),
    getCompanyAdminControlSettings(companyId).catch(() => null),
  ]);
  const connected = !!(settings?.fbrSettings?.enabled || settings?.fbrSettings?.sellerNtn);
  return isFbrAvailable(company?.country, connected);
}

/** A 404 response when the company has no FBR access, otherwise null. */
export async function fbrAccessDenied(companyId: string): Promise<NextResponse | null> {
  if (await companyHasFbr(companyId)) return null;
  return NextResponse.json({ error: "FBR e-invoicing is not available for this company's country." }, { status: 404 });
}
