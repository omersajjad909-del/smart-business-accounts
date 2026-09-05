import { prisma } from "@/lib/prisma";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_RATE_FORMULA,
  normalizeRateFormula,
  type RateFormulaSettings,
} from "@/lib/rateFormula";

export type BranchAssignmentMap = Record<string, string[]>;

export type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  /** See components/print/printTemplates.ts. "compact" is the older name for "minimal". */
  invoiceTemplate: "classic" | "minimal" | "bold" | "modern" | "compact";
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
  latitude: number | null;
  longitude: number | null;
  geoSource: "exact" | "manual" | "country" | "unset";
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

export type BranchGeoProfile = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  geoSource: "exact" | "manual" | "country" | "unset";
};

export type FbrEInvoiceSettings = {
  enabled: boolean;
  environment: "sandbox" | "production";
  bearerToken: string; // Token issued from the seller's FBR IRIS / PRAL account
  sellerNtn: string; // NTN or CNIC registered with FBR
  sellerBusinessName: string;
  sellerProvince: string;
  sellerAddress: string;
};

export const DEFAULT_FBR_SETTINGS: FbrEInvoiceSettings = {
  enabled: false,
  environment: "sandbox",
  bearerToken: "",
  sellerNtn: "",
  sellerBusinessName: "",
  sellerProvince: "",
  sellerAddress: "",
};

export type BusinessFeatureFlags = {
  advancedPurchasing:   boolean;  // PO → GRN → Purchase Invoice full flow
  multiWarehouse:       boolean;  // Warehouses, Stock Transfers
  approvalWorkflow:     boolean;  // Manager approval on PO / GRN
  customerCreditLimits: boolean;  // Per-customer credit limit enforcement
  discountEngine:       boolean;  // Promotions & discount rules
  productVariants:      boolean;  // SKU variants (size/color/etc.)
  batchSerialTracking:  boolean;  // Batch & serial number tracking
  taxConfiguration:     boolean;  // Advanced tax rules / multiple tax rates
  smsNotifications:     boolean;  // SMS alerts for invoices / payments
};

export const DEFAULT_FEATURE_FLAGS: BusinessFeatureFlags = {
  advancedPurchasing:   false,
  multiWarehouse:       false,
  approvalWorkflow:     false,
  customerCreditLimits: false,
  discountEngine:       false,
  productVariants:      false,
  batchSerialTracking:  false,
  taxConfiguration:     false,
  smsNotifications:     false,
};

export type ShiftSetting = {
  days: string[];          // ["Mon","Tue","Wed","Thu","Fri"]
  startTime: string;       // "09:00"
  endTime: string;         // "17:00"
  timezone: string;        // IANA timezone e.g. "Asia/Karachi"
  graceMinutes: number;    // grace window at start (default 10)
  overtimeMinutes: number; // admin-added realtime overtime (default 0)
  warnMinutes: number;     // warn user this many mins before shift ends (default 10)
  enabled: boolean;
};
export type ShiftSettingsMap = Record<string, ShiftSetting>;

export type LoyaltySettings = {
  enabled: boolean;
  pointsPerHundred: number;  // points earned per Rs. 100 spent (default: 1)
  redeemValue: number;        // Rs. discount per 1 point redeemed (default: 1)
  minRedeemPoints: number;    // minimum points required to redeem (default: 50)
  cardPrefix: string;         // prefix for auto-generated card numbers (default: "LC")
  expiryDays: number;         // 0 = never expire
};

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true,
  pointsPerHundred: 1,
  redeemValue: 1,
  minRedeemPoints: 50,
  cardPrefix: "LC",
  expiryDays: 0,
};

export type AdminControlSettings = {
  branchAssignments: BranchAssignmentMap;
  printPreferences: PrintPreferences;
  taxProfile: TaxProfile;
  companyIdentity: CompanyIdentityProfile;
  invoiceContact: InvoiceContactProfile;
  bankDetails: BankDetailsProfile;
  branchLocations: Record<string, BranchGeoProfile>;
  shiftSettings: ShiftSettingsMap;
  features: BusinessFeatureFlags;
  loyaltySettings: LoyaltySettings;
  /**
   * Formula-driven line rates. Absent for every company that has not set one
   * up, which normalises to `enabled: false` and leaves every document alone.
   */
  rateFormula: RateFormulaSettings;
  /** FBR digital e-invoicing gateway credentials. Absent means disabled. */
  fbrSettings: FbrEInvoiceSettings;
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
    latitude: null,
    longitude: null,
    geoSource: "unset",
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
  branchLocations: {},
  shiftSettings: {},
  features: { ...DEFAULT_FEATURE_FLAGS },
  loyaltySettings: { ...DEFAULT_LOYALTY_SETTINGS },
  rateFormula: { ...DEFAULT_RATE_FORMULA, documents: { ...DEFAULT_RATE_FORMULA.documents } },
  fbrSettings: { ...DEFAULT_FBR_SETTINGS },
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
  const branchLocations = (parsed.branchLocations && typeof parsed.branchLocations === "object")
    ? parsed.branchLocations as Record<string, Partial<BranchGeoProfile>>
    : {};
  const shiftSettingsRaw = (parsed.shiftSettings && typeof parsed.shiftSettings === "object")
    ? parsed.shiftSettings as Record<string, Partial<ShiftSetting>>
    : {};
  const featuresRaw = (parsed.features && typeof parsed.features === "object")
    ? parsed.features as Partial<BusinessFeatureFlags>
    : {};
  const fbrSettingsRaw = (parsed.fbrSettings && typeof parsed.fbrSettings === "object")
    ? parsed.fbrSettings as Partial<FbrEInvoiceSettings>
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
    branchLocations: Object.fromEntries(
      Object.entries(branchLocations).map(([branchId, value]) => [
        branchId,
        {
          address: String(value?.address || ""),
          latitude: typeof value?.latitude === "number" && Number.isFinite(value.latitude) ? value.latitude : null,
          longitude: typeof value?.longitude === "number" && Number.isFinite(value.longitude) ? value.longitude : null,
          geoSource: value?.geoSource === "exact" || value?.geoSource === "manual" || value?.geoSource === "country"
            ? value.geoSource
            : "unset",
        } satisfies BranchGeoProfile,
      ])
    ),
    features: {
      ...DEFAULT_FEATURE_FLAGS,
      ...featuresRaw,
    },
    loyaltySettings: {
      ...DEFAULT_LOYALTY_SETTINGS,
      ...((parsed.loyaltySettings && typeof parsed.loyaltySettings === "object") ? parsed.loyaltySettings as Partial<LoyaltySettings> : {}),
    },
    shiftSettings: Object.fromEntries(
      Object.entries(shiftSettingsRaw).map(([userId, s]) => [
        userId,
        {
          days: Array.isArray(s?.days) ? s.days.filter((d): d is string => typeof d === "string") : [],
          startTime: typeof s?.startTime === "string" ? s.startTime : "09:00",
          endTime: typeof s?.endTime === "string" ? s.endTime : "17:00",
          timezone: typeof s?.timezone === "string" && s.timezone ? s.timezone : "Asia/Karachi",
          graceMinutes: typeof s?.graceMinutes === "number" ? s.graceMinutes : 10,
          overtimeMinutes: typeof s?.overtimeMinutes === "number" ? s.overtimeMinutes : 0,
          warnMinutes: typeof s?.warnMinutes === "number" ? s.warnMinutes : 10,
          enabled: Boolean(s?.enabled),
        } satisfies ShiftSetting,
      ])
    ),
    rateFormula: normalizeRateFormula(parsed.rateFormula),
    fbrSettings: {
      ...DEFAULT_FBR_SETTINGS,
      ...fbrSettingsRaw,
      environment: fbrSettingsRaw.environment === "production" ? "production" : "sandbox",
    },
  };
}

/** Cache tag for one company's settings, so a save can drop exactly its own. */
const settingsTag = (companyId: string) => `company-admin-control:${companyId}`;

/**
 * Built per company rather than once, because unstable_cache reads its `tags`
 * when the wrapper is created — a tag naming the company cannot be written
 * inside a single shared wrapper.
 *
 * Without a tag the only way out of the cache was to wait for the sixty second
 * revalidate. That is long enough for somebody to upload a logo, press Save,
 * open an invoice, see the old settings, and conclude the upload had failed —
 * then do it again, and see it fail again.
 */
function cachedSettingsFor(companyId: string) {
  return unstable_cache(
    async (): Promise<AdminControlSettings> => {
      const latest = await prisma.activityLog.findFirst({
        where: { companyId, action: "COMPANY_ADMIN_CONTROL" },
        orderBy: { createdAt: "desc" },
        select: { details: true },
      });
      if (!latest?.details) return DEFAULT_ADMIN_CONTROL_SETTINGS;
      try {
        return normalizeSettings(JSON.parse(latest.details));
      } catch {
        return DEFAULT_ADMIN_CONTROL_SETTINGS;
      }
    },
    ["company-admin-control-settings", companyId],
    { revalidate: 60, tags: [settingsTag(companyId)] }
  );
}

export async function getCompanyAdminControlSettings(companyId: string): Promise<AdminControlSettings> {
  return cachedSettingsFor(companyId)();
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
    branchLocations: {
      ...current.branchLocations,
      ...(patch.branchLocations || {}),
    },
    shiftSettings: {
      ...current.shiftSettings,
      ...(patch.shiftSettings || {}),
    },
    features: {
      ...current.features,
      ...(patch.features || {}),
    },
    loyaltySettings: {
      ...current.loyaltySettings,
      ...(patch.loyaltySettings || {}),
    },
    rateFormula: {
      ...current.rateFormula,
      ...(patch.rateFormula || {}),
      // `fields` and `documents` are replaced wholesale, not merged: deleting a
      // column or switching a document off has to actually delete it, and a
      // shallow merge of an array would leave the old tail behind.
      fields: patch.rateFormula?.fields ?? current.rateFormula.fields,
      documents: patch.rateFormula?.documents ?? current.rateFormula.documents,
    },
    fbrSettings: {
      ...current.fbrSettings,
      ...(patch.fbrSettings || {}),
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

  // Guarded because revalidateTag needs a request to be in progress. Every
  // caller today is a route handler, but a seed or a script has no request and
  // would throw here rather than saving.
  try {
    // Next 16 wants to be told how stale the entry may stay. Zero, because
    // the point is that the next read sees what was just saved.
    revalidateTag(settingsTag(companyId), { expire: 0 });
  } catch {
    // Nothing to drop outside a request — the sixty second revalidate covers it.
  }

  return next;
}
