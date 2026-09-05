import type { FbrEInvoiceSettings } from "@/lib/companyAdminControl";

// FBR's Digital Invoicing (PRAL) gateway. Same request shape for sandbox and
// production — only the host and the bearer token differ. Confirm the exact
// field list against the seller's own FBR IRIS integration guide before
// relying on this for a live filing: FBR revises scenario/item fields by
// sector, and this covers the common "Sale Invoice" case only.
const FBR_BASE_URL = {
  sandbox: "https://gw.fbr.gov.pk/di_data/v1/di",
  production: "https://gw.fbr.gov.pk/di_data/v1/di",
} as const;

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
  items: FbrInvoiceLine[];
};

export function buildFbrPayload(settings: FbrEInvoiceSettings, invoice: FbrInvoiceInput) {
  const buyerRegistered = Boolean(invoice.buyerNtn && invoice.buyerNtn.trim());
  return {
    invoiceType: "Sale Invoice",
    invoiceDate: invoice.invoiceDate,
    sellerNTNCNIC: settings.sellerNtn,
    sellerBusinessName: settings.sellerBusinessName,
    sellerProvince: settings.sellerProvince,
    sellerAddress: settings.sellerAddress,
    buyerNTNCNIC: invoice.buyerNtn || "",
    buyerBusinessName: invoice.buyerBusinessName,
    buyerProvince: invoice.buyerProvince || settings.sellerProvince,
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
      sroScheduleNo: "",
      fedPayable: 0,
      discount: 0,
      saleType: "Goods at standard rate",
      sroItemSerialNo: "",
    })),
  };
}

export type FbrSubmitResult =
  | { ok: true; fbrInvoiceNo: string; irn: string; raw: unknown }
  | { ok: false; error: string; raw: unknown };

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
    return { ok: false, error: "FBR integration is not configured for this company.", raw: null };
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
      return { ok: false, error: message, raw };
    }

    const invoiceNo =
      raw && typeof raw === "object"
        ? String((raw as any).invoiceNumber || (raw as any).InvoiceNumber || "")
        : "";

    if (!invoiceNo) {
      return { ok: false, error: "FBR accepted the request but did not return an invoice number.", raw };
    }

    return { ok: true, fbrInvoiceNo: invoiceNo, irn: invoiceNo, raw };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not reach the FBR gateway.", raw: null };
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
