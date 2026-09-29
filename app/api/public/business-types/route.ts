import { NextResponse } from "next/server";
import { getPublicBusinessTypes } from "@/lib/publicBusinessTypes";

export async function GET() {
  const types = await getPublicBusinessTypes();
  const liveIds = types.filter(t => t.isLive).map(t => t.id);

  return NextResponse.json({ types, liveIds }, {
    headers: { "Cache-Control": "no-store" },
  });
}
