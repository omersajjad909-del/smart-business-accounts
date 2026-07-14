import { notFound } from "next/navigation";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

export default async function IndustryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;

  if (!(industry in BUSINESS_PHASE_CONFIG)) notFound();

  return <>{children}</>;
}
