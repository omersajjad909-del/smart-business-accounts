import { NextResponse } from "next/server";

// Expiry tracking requires batch/lot numbers with expiry dates on inventory entries.
// Current schema does not store expiry dates on InventoryTxn.
// This endpoint returns empty rows until expiry batch tracking is implemented.
export async function GET() {
  return NextResponse.json({ rows: [] });
}
