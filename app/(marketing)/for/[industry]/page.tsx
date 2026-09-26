import Link from "next/link";
import { GET as getBusinessTypes } from "@/app/api/public/business-types/route";
import { GET as getPricing } from "@/app/api/public/pricing/route";
import IndustryPageClient from "./IndustryPageClient";

interface BizType {
  id: string; label: string; icon: string;
  phase: 1|2|3|4; category: string; description: string; isLive: boolean;
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;

  const [typesRes, pricingRes] = await Promise.all([getBusinessTypes(), getPricing()]);
  const [typesData, pricingData] = await Promise.all([typesRes.json(), pricingRes.json()]);

  const type: BizType | undefined = (typesData.types ?? []).find((t: BizType) => t.id === industry);

  if (!type) {
    return (
      <div style={{
        minHeight:"100vh", background:"var(--dk-080c1e, #080c1e)", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:16, color:"var(--ink-solid, white)",
        fontFamily:"'Outfit','DM Sans',sans-serif", textAlign:"center", padding:24,
      }}>
        <div style={{ fontSize:48 }}>🔍</div>
        <h1 style={{ fontSize:24, fontWeight:700 }}>Industry not found</h1>
        <p style={{ color:"rgba(var(--ink),var(--ta-50, .5))", maxWidth:400 }}>
          We couldn&apos;t find that business type. Browse all supported industries instead.
        </p>
        <Link href="/solutions" style={{
          padding:"12px 28px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)",
          color:"white", fontWeight:700, textDecoration:"none", fontSize:14,
        }}>View All Industries →</Link>
      </div>
    );
  }

  const prices = {
    starter: pricingData?.pricing?.starter?.monthly ?? 49,
    pro: pricingData?.pricing?.pro?.monthly ?? 99,
    enterprise: pricingData?.pricing?.enterprise?.monthly ?? 249,
  };

  return <IndustryPageClient type={type} industry={industry} initialPrices={prices} />;
}
