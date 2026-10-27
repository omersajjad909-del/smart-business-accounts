/**
 * Companies that can photograph a supplier's invoice and have the purchase
 * invoice filled from it.
 *
 * Switched on for one company while it is tried out. Both the button on the
 * purchase invoice page and /api/purchase-invoice/scan read this, so a company
 * that is not listed neither sees the button nor can call the route.
 */
export const PURCHASE_INVOICE_SCAN_COMPANY_IDS: ReadonlySet<string> = new Set([
  "719ec501-bf4e-4ebf-8f6e-2bb330071f0d", // Bin Mumtaz Plastic (companyNo 100030)
]);

export function canScanPurchaseInvoice(companyId?: string | null): boolean {
  return !!companyId && PURCHASE_INVOICE_SCAN_COMPANY_IDS.has(companyId);
}
