import { prisma } from "@/lib/prisma";

export type BranchAssignmentMap = Record<string, string[]>;

export type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  invoiceTemplate: "classic" | "compact" | "modern";
  receiptTemplate: "standard" | "mart" | "restaurant";
  defaultOutput: "pdf" | "browser-print";
  showLogo: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showTaxNumber: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
  thermalFontSize: "sm" | "md" | "lg";
};

export type AdminControlSettings = {
  branchAssignments: BranchAssignmentMap;
  printPreferences: PrintPreferences;
};

export const DEFAULT_ADMIN_CONTROL_SETTINGS: AdminControlSettings = {
  branchAssignments: {},
  printPreferences: {
    paperSize: "A4",
    invoiceTemplate: "classic",
    receiptTemplate: "standard",
    defaultOutput: "pdf",
    showLogo: true,
    showPhone: true,
    showAddress: true,
    showTaxNumber: true,
    logoUrl: "",
    headerNote: "",
    footerNote: "Thank you for your business.",
    thermalFontSize: "md",
  },
};

function normalizeSettings(value: unknown): AdminControlSettings {
  const parsed = (value && typeof value === "object") ? value as Partial<AdminControlSettings> : {};
  const print = (parsed.printPreferences && typeof parsed.printPreferences === "object")
    ? parsed.printPreferences as Partial<PrintPreferences>
    : {};

  return {
    branchAssignments: parsed.branchAssignments && typeof parsed.branchAssignments === "object"
      ? Object.fromEntries(
          Object.entries(parsed.branchAssignments as BranchAssignmentMap).map(([userId, branchIds]) => [
            userId,
            Array.isArray(branchIds) ? branchIds.filter(Boolean) : [],
          ])
        )
      : {},
    printPreferences: {
      ...DEFAULT_ADMIN_CONTROL_SETTINGS.printPreferences,
      ...print,
    },
  };
}

export async function getCompanyAdminControlSettings(companyId: string): Promise<AdminControlSettings> {
  const latest = await prisma.activityLog.findFirst({
    where: { companyId, action: "COMPANY_ADMIN_CONTROL" },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });

  if (!latest?.details) {
    return DEFAULT_ADMIN_CONTROL_SETTINGS;
  }

  try {
    return normalizeSettings(JSON.parse(latest.details));
  } catch {
    return DEFAULT_ADMIN_CONTROL_SETTINGS;
  }
}

export async function saveCompanyAdminControlSettings(
  companyId: string,
  userId: string | null,
  patch: Partial<AdminControlSettings>
): Promise<AdminControlSettings> {
  const current = await getCompanyAdminControlSettings(companyId);
  const next = normalizeSettings({
    ...current,
    ...patch,
    branchAssignments: patch.branchAssignments ?? current.branchAssignments,
    printPreferences: {
      ...current.printPreferences,
      ...(patch.printPreferences || {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      companyId,
      userId,
      action: "COMPANY_ADMIN_CONTROL",
      details: JSON.stringify(next),
    },
  });

  return next;
}
