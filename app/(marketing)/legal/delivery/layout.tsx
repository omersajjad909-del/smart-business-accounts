import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Service Delivery Policy",
  description:
    "FinovaOS Service Delivery Policy — how and when your subscription is delivered. Digital service, activated immediately after successful payment. No physical shipment.",
  openGraph: {
    title: "Service Delivery Policy | FinovaOS",
    description: "How and when your FinovaOS subscription is delivered and activated.",
    url: `${BASE}/legal/delivery`,
    siteName: "FinovaOS",
    type: "website",
  },
  alternates: { canonical: `${BASE}/legal/delivery` },
  robots: { index: true, follow: false },
};

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
