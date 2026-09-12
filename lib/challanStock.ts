/**
 * What a delivery challan takes out of the godown.
 *
 * Shared by the challan route (which writes it when a challan turns DELIVERED)
 * and the sales-invoice route (which writes it for a challan that is being
 * billed before anyone got round to marking it delivered — the goods plainly
 * left, or there would be nothing to bill).
 *
 * The one rule underneath both: whichever document is written first takes the
 * goods out, and the other one links to it and takes nothing out. So the goods
 * are skipped here when the challan was raised off a sales invoice that has
 * already written them out as SALE. The packing material is written either
 * way — an invoice has nothing to say about bags or cartons.
 */

import type { Prisma } from "@prisma/client";

/**
 * Only what this writer actually touches. Described structurally rather than
 * as PrismaClient, so it accepts the extended client lib/prisma exports and a
 * transaction client alike — neither of which satisfies the bare PrismaClient
 * type.
 */
type Db = {
  inventoryTxn: {
    create(args: { data: Prisma.InventoryTxnUncheckedCreateInput }): Promise<unknown>;
  };
  itemNew: {
    findFirst(args: {
      where: Prisma.ItemNewWhereInput;
      select: { purchaseRate: true };
    }): Promise<{ purchaseRate: number } | null>;
  };
};

export type DispatchLine = {
  itemId: string;
  qty: number;
  rate?: number | null;
};

export type DispatchInput = {
  date: Date | string;
  items: DispatchLine[];
  packagingItemId?: string | null;
  packagingQty?: number | null;
  /** Set when the goods already left on a sales invoice. */
  salesInvoiceId?: string | null;
};

export async function writeDispatchStock(
  db: Db,
  companyId: string,
  data: DispatchInput
) {
  const date = new Date(data.date);

  if (!data.salesInvoiceId) {
    for (const item of data.items) {
      await db.inventoryTxn.create({
        data: {
          companyId,
          type: "CHALLAN_OUT",
          date,
          itemId: item.itemId,
          qty: -item.qty,
          rate: item.rate || 0,
          amount: item.qty * (item.rate || 0),
          location: "MAIN",
        },
      });
    }
  }

  // The packing material, when the company holds it as stock. Valued at cost:
  // it is consumed on the way out, not sold, so the sale rate says nothing
  // about it. A challan that names no packing item writes nothing here.
  const packQty = Number(data.packagingQty ?? 0);
  if (data.packagingItemId && packQty > 0) {
    const packItem = await db.itemNew.findFirst({
      where: { id: data.packagingItemId, companyId, deletedAt: null },
      select: { purchaseRate: true },
    });
    if (packItem) {
      const rate = packItem.purchaseRate || 0;
      await db.inventoryTxn.create({
        data: {
          companyId,
          type: "PACKING_OUT",
          date,
          itemId: data.packagingItemId,
          qty: -packQty,
          rate,
          amount: packQty * rate,
          location: "MAIN",
        },
      });
    }
  }
}
