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

export type TaxProfile = {
  taxIdLabel: string;
  taxIdValue: string;
  vatNumber: string;
  gstNumber: string;
  registrationNote: string;
};

export type CompanyIdentityProfile = {
  legalName: string;
  legalAddress: string;
  city: string;
  state: string;
  postalCode: string;
  website: string;
};

export type InvoiceContactProfile = {
  contactName: string;
  email: string;
  phone: string;
  supportEmail: string;
  supportPhone: string;
};

export type BankDetailsProfile = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  branchName: string;
  branchCode: string;
};

export type AdminControlSettings = {
  branchAssignments: BranchAssignmentMap;
  printPreferences: PrintPreferences;
  taxProfile: TaxProfile;
  companyIdentity: CompanyIdentityProfile;
  invoiceContact: InvoiceContactProfile;
  bankDetails: BankDetailsProfile;
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
  taxProfile: {
    taxIdLabel: "NTN / Tax ID",
    taxIdValue: "",
    vatNumber: "",
    gstNumber: "",
    registrationNote: "",
  },
  companyIdentity: {
    legalName: "",
    legalAddress: "",
    city: "",
    state: "",
    postalCode: "",
    website: "",
  },
  invoiceContact: {
    contactName: "",
    email: "",
    phone: "",
    supportEmail: "",
    supportPhone: "",
  },
  bankDetails: {
    bankName: "",
    accountTitle: "",
    accountNumber: "",
    iban: "",
    swiftCode: "",
    branchName: "",
    branchCode: "",
  },
};

function normalizeSettings(value: unknown): AdminControlSettings {
  const parsed = (value && typeof value === "object") ? value as Partial<AdminControlSettings> : {};
  const print = (parsed.printPreferences && typeof parsed.printPreferences === "object")
    ? parsed.printPreferences as Partial<PrintPreferences>
    : {};
  const taxProfile = (parsed.taxProfile && typeof parsed.taxProfile === "object")
    ? parsed.taxProfile as Partial<TaxProfile>
    : {};
  const companyIdentity = (parsed.companyIdentity && typeof parsed.companyIdentity === "object")
    ? parsed.companyIdentity as Partial<CompanyIdentityProfile>
    : {};
  const invoiceContact = (parsed.invoiceContact && typeof parsed.invoiceContact === "object")
    ? parsed.invoiceContact as Partial<InvoiceContactProfile>
    : {};
  const bankDetails = (parsed.bankDetails && typeof parsed.bankDetails === "object")
    ? parsed.bankDetails as Partial<BankDetailsProfile>
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
    taxProfile: {
      ...DEFAULT_ADMIN_CONTROL_SETTINGS.taxProfile,
      ...taxProfile,
    },
    companyIdentity: {
      ...DEFAULT_ADMIN_CONTROL_SETTINGS.companyIdentity,
      ...companyIdentity,
    },
    invoiceContact: {
      ...DEFAULT_ADMIN_CONTROL_SETTINGS.invoiceContact,
      ...invoiceContact,
    },
    bankDetails: {
      ...DEFAULT_ADMIN_CONTROL_SETTINGS.bankDetails,
      ...bankDetails,
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
    taxProfile: {
      ...current.taxProfile,
      ...(patch.taxProfile || {}),
    },
    companyIdentity: {
      ...current.companyIdentity,
      ...(patch.companyIdentity || {}),
    },
    invoiceContact: {
      ...current.invoiceContact,
      ...(patch.invoiceContact || {}),
    },
    bankDetails: {
      ...current.bankDetails,
      ...(patch.bankDetails || {}),
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
