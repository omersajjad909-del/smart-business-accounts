import { getPublicBusinessTypes } from "@/lib/publicBusinessTypes";
import IndustriesPageClient from "./IndustriesPageClient";

// Server component so the "N Industries Live Now" count is correct on first
// paint — the old client-only version started from an empty array and
// fetched after mount, so the pre-hydration HTML always said "0 Industries
// Live Now" while the homepage's hardcoded stat said "6".
export const dynamic = "force-dynamic";

export default async function IndustriesPage() {
  const types = await getPublicBusinessTypes();
  return <IndustriesPageClient initialTypes={types} />;
}
