import type { AdminControlSettings, FbrEInvoiceSettings } from "@/lib/companyAdminControl";
import { getCompanyAdminControlSettings } from "@/lib/companyAdminControl";
import { normalizeProvince } from "@/lib/pkProvinces";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";

// FBR's Digital Invoicing (PRAL) gateway. Same request shape for sandbox and
// production — only the host and the bearer token differ. Confirm the exact
// field list against the seller's own FBR IRIS integration guide before
// relying on this for a live filing: FBR revises scenario/item fields by
// sector, and this covers the common "Sale Invoice" case only.
const FBR_BASE_URL = {
  sandbox: "https://gw.fbr.gov.pk/di_data/v1/di",
  production: "https://gw.fbr.gov.pk/di_data/v1/di",
} as const;

/**
 * The two sale types this integration understands. "Goods at zero-rate" is
 * FBR's scenario SN007 — the one export sales are filed under, since an
 * export invoice charges the foreign buyer no sales tax. There are ~28 SN
 * scenarios in total (steel, petroleum, retail, …); this covers the two a
 * general trading/export business actually needs.
 */
export const FBR_SALE_TYPES = {
  STANDARD: "Goods at standard rate",
  ZERO_RATED: "Goods at zero-rate",
} as const;

export type FbrSaleType = (typeof FBR_SALE_TYPES)[keyof typeof FBR_SALE_TYPES];

/** How long after filing a local edit/cancel is still allowed — see isFbrEditLocked. */
export const FBR_EDIT_LOCK_HOURS = 72;

/** How many PENDING_SYNC retries the cron gives an invoice before it gives up and marks it FAILED. */
export const FBR_MAX_RETRIES = 8;

export type FbrInvoiceLine = {
  productDescription: string;
  hsCode?: string;
  rateLabel: string; // e.g. "18%"
  uoM: string;
  quantity: number;
  totalValue: number; // qty * rate, before tax
  valueExcludingTax: number;
  salesTax: number;
};

export type FbrInvoiceInput = {
  invoiceDate: string; // YYYY-MM-DD
  invoiceRefNo: string; // our own invoiceNo, for traceability
  buyerNtn?: string;
  buyerBusinessName: string;
  buyerProvince?: string;
  buyerAddress?: string;
  scenarioId?: string; // required by the sandbox validate/post endpoints
  /** Defaults to standard-rate. Export sales should pass FBR_SALE_TYPES.ZERO_RATED. */
  saleType?: FbrSaleType | string;
  /** Fifth Schedule / SRO notification number. Only meaningful — and only sent — for zero-rated lines. */
  sroScheduleNo?: string;
  sroItemSerialNo?: string;
  items: FbrInvoiceLine[];
};

/** Who the seller is, as one resolved set rather than two half-filled ones. */
export type FbrSeller = {
  ntn: string;
  businessName: string;
  province: string;
  address: string;
};

/**
 * The seller's own details, from one place.
 *
 * These lived twice over: the printed invoice took the NTN, name, address and
 * province from the company profile, while the filing took its own copies from
 * the E-Invoice settings screen. Nothing kept the two in step, so a company
 * could hand a buyer a bill carrying one NTN and file the same sale under
 * another — and neither screen would look wrong.
 *
 * The E-Invoice fields now act as an override and nothing more: filled in, they
 * win; left blank — which is what they are for almost everybody — the company
 * profile answers. There is one place to keep correct.
 */
export function resolveFbrSeller(settings: AdminControlSettings): FbrSeller {
  const fbr = settings.fbrSettings;
  const identity = settings.companyIdentity;
  const tax = settings.taxProfile;
  const pick = (...values: (string | null | undefined)[]) =>
    values.map((v) => String(v || "").trim()).find(Boolean) || "";

  return {
    ntn: pick(fbr.sellerNtn, tax.taxIdValue),
    businessName: pick(fbr.sellerBusinessName, identity.legalName),
    // Normalised on the way out: the province boxes have been free text for as
    // long as they have existed, so what is stored is whatever somebody typed.
    // An unrecognised value is passed through rather than dropped — the gateway
    // rejecting it with a readable error beats us silently sending nothing.
    province: normalizeProvince(pick(fbr.sellerProvince, identity.state))
      || pick(fbr.sellerProvince, identity.state),
    address: pick(fbr.sellerAddress, identity.legalAddress),
  };
}

export function buildFbrPayload(seller: FbrSeller, settings: FbrEInvoiceSettings, invoice: FbrInvoiceInput) {
  const buyerRegistered = Boolean(invoice.buyerNtn && invoice.buyerNtn.trim());
  const saleType = invoice.saleType || FBR_SALE_TYPES.STANDARD;
  const isZeroRated = saleType === FBR_SALE_TYPES.ZERO_RATED;
  return {
    invoiceType: "Sale Invoice",
    invoiceDate: invoice.invoiceDate,
    sellerNTNCNIC: seller.ntn,
    sellerBusinessName: seller.businessName,
    sellerProvince: seller.province,
    sellerAddress: seller.address,
    buyerNTNCNIC: invoice.buyerNtn || "",
    buyerBusinessName: invoice.buyerBusinessName,
    // Falling back to the seller's own province is deliberate: a buyer with no
    // province recorded is almost always local, and an empty province fails the
    // filing outright. Normalised first, since what is stored is free text.
    buyerProvince: normalizeProvince(invoice.buyerProvince) || invoice.buyerProvince || seller.province,
    buyerAddress: invoice.buyerAddress || "",
    buyerRegistrationType: buyerRegistered ? "Registered" : "Unregistered",
    invoiceRefNo: invoice.invoiceRefNo,
    ...(settings.environment === "sandbox" && invoice.scenarioId ? { scenarioId: invoice.scenarioId } : {}),
    items: invoice.items.map((line) => ({
      hsCode: line.hsCode || "",
      productDescription: line.productDescription,
      rate: line.rateLabel,
      uoM: line.uoM,
      quantity: line.quantity,
      totalValues: line.totalValue,
      valueSalesExcludingST: line.valueExcludingTax,
      salesTaxApplicable: line.salesTax,
      salesTaxWithheldAtSource: 0,
      extraTax: "",
      furtherTax: 0,
      sroScheduleNo: isZeroRated ? (invoice.sroScheduleNo || "") : "",
      fedPayable: 0,
      discount: 0,
      saleType,
      sroItemSerialNo: isZeroRated ? (invoice.sroItemSerialNo || "") : "",
    })),
  };
}

export type FbrSubmitResult =
  | { ok: true; fbrInvoiceNo: string; irn: string; raw: unknown }
  // `retryable` distinguishes a gateway that's down right now (worth another
  // try) from a filing FBR actively rejected (retrying it verbatim will just
  // fail the same way forever) — see fileSalesInvoiceWithFbr.
  | { ok: false; error: string; raw: unknown; retryable: boolean };

/**
 * Submits an already-built payload to FBR's gateway. Never fabricates a
 * success: only a genuine 2xx response carrying an invoice number counts, so
 * a business can never end up printing a QR code for a filing that didn't
 * actually happen.
 */
export async function submitToFbr(
  settings: FbrEInvoiceSettings,
  payload: ReturnType<typeof buildFbrPayload>
): Promise<FbrSubmitResult> {
  if (!settings.enabled || !settings.bearerToken) {
    return { ok: false, error: "FBR integration is not configured for this company.", raw: null, retryable: false };
  }

  const endpoint = `${FBR_BASE_URL[settings.environment]}/${settings.environment === "sandbox" ? "postinvoicedata_sb" : "postinvoicedata"}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (raw && typeof raw === "object" && ("error" in raw || "message" in raw))
          ? String((raw as any).error || (raw as any).message)
          : `FBR gateway returned HTTP ${res.status}`;
      // 5xx means the gateway itself is having trouble — worth a retry. 4xx
      // means FBR looked at this exact payload and rejected it, which a retry
      // will not change.
      return { ok: false, error: message, raw, retryable: res.status >= 500 };
    }

    const invoiceNo =
      raw && typeof raw === "object"
        ? String((raw as any).invoiceNumber || (raw as any).InvoiceNumber || "")
        : "";

    if (!invoiceNo) {
      return { ok: false, error: "FBR accepted the request but did not return an invoice number.", raw, retryable: false };
    }

    return { ok: true, fbrInvoiceNo: invoiceNo, irn: invoiceNo, raw };
  } catch (e: any) {
    // fetch threw: DNS/timeout/connection reset — the gateway or our own
    // network path, not the payload. Worth a retry.
    return { ok: false, error: e?.message || "Could not reach the FBR gateway.", raw: null, retryable: true };
  }
}

/** The string encoded into the printed QR — buyers/FBR field staff scan this. */
export function buildFbrQrPayload(params: {
  sellerNtn: string;
  invoiceNo: string;
  fbrInvoiceNo: string;
  date: string;
  total: number;
}) {
  return [
    params.sellerNtn,
    params.invoiceNo,
    params.fbrInvoiceNo,
    params.date,
    params.total.toFixed(2),
  ].join("|");
}

/**
 * Once a sale is FILED, FBR only allows amending or cancelling it for a short
 * window — this app enforces the same window locally. Past it, the invoice
 * (and the filing) is final.
 */
export function isFbrEditLocked(invoice: { fbrStatus?: string | null; fbrFiledAt?: Date | string | null }): boolean {
  if (invoice.fbrStatus !== "FILED" || !invoice.fbrFiledAt) return false;
  const filedAt = new Date(invoice.fbrFiledAt).getTime();
  if (Number.isNaN(filedAt)) return false;
  return Date.now() - filedAt > FBR_EDIT_LOCK_HOURS * 60 * 60 * 1000;
}

/**
 * Self-provisioning, same trick as CompanyCommsVault in
 * lib/companyCommsConfig.ts: a plain `ADD COLUMN IF NOT EXISTS` means this
 * ships without a manual DB step blocking deploy. Cached in-process after the
 * first success so a busy retry cron isn't re-issuing DDL every run.
 */
let exportRetryColumnsEnsured = false;
async function ensureFbrExportRetryColumns() {
  if (exportRetryColumnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrSaleType" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrSroScheduleNo" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrRetryCount" INTEGER NOT NULL DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "SalesInvoice" ADD COLUMN IF NOT EXISTS "fbrLastRetryAt" TIMESTAMP(3)`);
    exportRetryColumnsEnsured = true;
  } catch {
    // A genuinely missing column surfaces its own clear Postgres error from
    // whichever query below needed it, rather than failing silently here.
  }
}

export type FbrFilingResult =
  | { ok: true; invoice: any }
  | { ok: false; error: string; invoice?: any; httpStatus: number };

/**
 * Files one sales invoice with FBR — the one place this happens, used by both
 * the manual "File with FBR" button (app/api/e-invoice/[id]) and the
 * PENDING_SYNC retry cron (app/api/cron/fbr-retry). Keeping it in one place
 * means a retry behaves exactly like the original attempt: same payload
 * shape, same zero-rate/HS-code validation, same status transitions.
 */
export async function fileSalesInvoiceWithFbr(
  companyId: string,
  invoiceId: string,
  opts: { saleType?: string; sroScheduleNo?: string; scenarioId?: string; userId?: string | null } = {}
): Promise<FbrFilingResult> {
  await ensureFbrExportRetryColumns();

  const settings = await getCompanyAdminControlSettings(companyId);
  if (!settings.fbrSettings.enabled || !settings.fbrSettings.bearerToken) {
    return {
      ok: false,
      error: "FBR integration is not configured yet. Add your NTN and gateway token in E-Invoice settings first.",
      httpStatus: 400,
    };
  }

  const inv = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { customer: true, items: { include: { item: true } } },
  });
  if (!inv) return { ok: false, error: "Not found", httpStatus: 404 };
  if (inv.fbrStatus === "FILED") {
    return { ok: false, error: "This invoice is already filed with FBR.", httpStatus: 400 };
  }

  const saleType = opts.saleType || inv.fbrSaleType || FBR_SALE_TYPES.STANDARD;
  const sroScheduleNo = opts.sroScheduleNo ?? inv.fbrSroScheduleNo ?? "";
  const scenarioId = opts.scenarioId ?? inv.fbrScenarioId ?? undefined;
  const isZeroRated = saleType === FBR_SALE_TYPES.ZERO_RATED;

  if (isZeroRated) {
    const missingHsCode = inv.items.some((line) => !(line.hsCode || line.item?.hsCode));
    if (missingHsCode) {
      return {
        ok: false,
        error: "Every line needs an HS code before an export / zero-rated invoice can be filed.",
        httpStatus: 400,
      };
    }
  }

  const lines: FbrInvoiceLine[] = inv.items.map((line) => {
    const gross = line.qty * line.rate;
    // Zero-rated means exactly that — no sales tax charged, regardless of
    // whatever tax rate the line was originally priced with locally.
    const taxAmount = isZeroRated ? 0 : gross * (line.taxPercent / 100);
    return {
      productDescription: line.item?.name || "Item",
      hsCode: line.hsCode || line.item?.hsCode || "",
      rateLabel: isZeroRated ? "0%" : `${line.taxPercent || 0}%`,
      uoM: line.item?.unit || "PCS",
      quantity: line.qty,
      totalValue: gross,
      valueExcludingTax: gross,
      salesTax: taxAmount,
    };
  });

  const seller = resolveFbrSeller(settings);
  const payload = buildFbrPayload(seller, settings.fbrSettings, {
    invoiceDate: new Date(inv.date).toISOString().slice(0, 10),
    invoiceRefNo: inv.invoiceNo,
    buyerNtn: inv.customer?.ntn || undefined,
    buyerBusinessName: inv.customer?.name || "Walk-in Customer",
    buyerProvince: inv.customer?.province || undefined,
    buyerAddress: inv.customer?.address || undefined,
    scenarioId,
    saleType,
    sroScheduleNo,
    items: lines,
  });

  const result = await submitToFbr(settings.fbrSettings, payload);

  if (!result.ok) {
    const nextRetryCount = (inv.fbrRetryCount || 0) + 1;
    const status = result.retryable && nextRetryCount <= FBR_MAX_RETRIES ? "PENDING_SYNC" : "FAILED";
    const updated = await prisma.salesInvoice.update({
      where: { id: inv.id },
      data: {
        fbrStatus: status,
        fbrResponse: result.raw as any,
        fbrScenarioId: scenarioId || null,
        fbrSaleType: saleType,
        fbrSroScheduleNo: sroScheduleNo || null,
        fbrRetryCount: nextRetryCount,
        fbrLastRetryAt: new Date(),
      },
    });
    await logAudit({
      companyId,
      userId: opts.userId ?? null,
      entity: "SalesInvoice",
      entityId: inv.id,
      action: "UPDATE",
      description: status === "PENDING_SYNC"
        ? `FBR e-invoice filing failed, queued for retry (attempt ${nextRetryCount}/${FBR_MAX_RETRIES}): ${result.error}`
        : `FBR e-invoice filing failed: ${result.error}`,
    });
    return { ok: false, error: result.error, invoice: updated, httpStatus: 502 };
  }

  const qrPayload = buildFbrQrPayload({
    sellerNtn: seller.ntn,
    invoiceNo: inv.invoiceNo,
    fbrInvoiceNo: result.fbrInvoiceNo,
    date: new Date(inv.date).toISOString().slice(0, 10),
    total: inv.total,
  });

  const updated = await prisma.salesInvoice.update({
    where: { id: inv.id },
    data: {
      fbrStatus: "FILED",
      fbrInvoiceNo: result.fbrInvoiceNo,
      fbrIrn: result.irn,
      fbrQrPayload: qrPayload,
      fbrFiledAt: new Date(),
      fbrResponse: result.raw as any,
      fbrScenarioId: scenarioId || null,
      fbrSaleType: saleType,
      fbrSroScheduleNo: sroScheduleNo || null,
      fbrRetryCount: 0,
    },
  });

  await logAudit({
    companyId,
    userId: opts.userId ?? null,
    entity: "SalesInvoice",
    entityId: inv.id,
    action: "UPDATE",
    description: `Filed with FBR — invoice no. ${result.fbrInvoiceNo}`,
  });

  return { ok: true, invoice: updated };
}
