/**
 * One shape for a warehouse transfer, wherever it was written from.
 *
 * Transfers were being stored in two different places under two different
 * category names. /dashboard/warehouse-transfers wrote the full document —
 * a transfer number, a date, many line items, a DRAFT → IN_TRANSIT → COMPLETED
 * status — under `warehouse_transfer`. The quick "Transfer Stock" modal on
 * /dashboard/warehouses wrote a single flat line under `stock_transfer`, which
 * is also the category /dashboard/retail/stock-transfer uses. So a transfer made
 * on the Warehouses page never appeared on the Warehouse Transfers page, and a
 * retail store transfer showed up in the warehouse list it had nothing to do
 * with.
 *
 * `warehouse_transfer` is now the single category, and this normalizer reads
 * both shapes so the records written under the old flat shape keep rendering.
 */

export const WAREHOUSE_TRANSFER_CATEGORY = "warehouse_transfer";

export type WarehouseTransferLine = {
  itemName: string;
  qty: number;
  unit: string;
  notes: string;
};

export type NormalizedWarehouseTransfer = {
  id: string;
  transferNo: string;
  from: string;
  to: string;
  fromId: string;
  toId: string;
  items: WarehouseTransferLine[];
  /** "Cotton Fabric" for one line, "Cotton Fabric +2 more" beyond that. */
  itemSummary: string;
  totalQty: number;
  reason: string;
  notes: string;
  status: string;
  date: string;
};

type RawRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  date?: string | Date | null;
  createdAt?: string | Date | null;
  data?: unknown;
};

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function toIso(value: string | Date | null | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

export function normalizeWarehouseTransfer(record: RawRecord): NormalizedWarehouseTransfer {
  const d = ((record.data ?? {}) as Record<string, unknown>) || {};

  // Document shape keeps its lines in `items`; the old flat shape carried a
  // single `item`/`qty` pair on the record itself.
  const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const items: WarehouseTransferLine[] = rawItems.length
    ? rawItems.map((line) => ({
        itemName: str(line.itemName ?? line.item),
        qty: num(line.qty),
        unit: str(line.unit) || "PCS",
        notes: str(line.notes),
      }))
    : str(d.item)
      ? [{ itemName: str(d.item), qty: num(d.qty), unit: str(d.unit) || "PCS", notes: str(d.notes) }]
      : [];

  const named = items.filter((line) => line.itemName);
  const itemSummary = named.length === 0
    ? ""
    : named.length === 1
      ? named[0].itemName
      : `${named[0].itemName} +${named.length - 1} more`;

  return {
    id: record.id,
    transferNo: str(d.transferNo) || str(record.title),
    from: str(d.fromWarehouse ?? d.from),
    to: str(d.toWarehouse ?? d.to),
    fromId: str(d.fromId),
    toId: str(d.toId),
    items,
    itemSummary,
    totalQty: items.reduce((sum, line) => sum + line.qty, 0),
    reason: str(d.reason),
    notes: str(d.notes),
    status: str(record.status) || "COMPLETED",
    date: toIso(d.date as string) || toIso(record.date) || toIso(record.createdAt),
  };
}
