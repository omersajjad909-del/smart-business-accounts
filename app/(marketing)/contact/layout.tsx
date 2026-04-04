import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Contact Us — Support, Sales & Partnerships",
  description:
    "Get in touch with the FinovaOS team. Live chat, email support (finovaos.app@gmail.com), or submit a support ticket. Our team responds within 2 hours during business hours.",
  keywords: [
    "contact FinovaOS",
    "FinovaOS support",
    "accounting software support",
    "FinovaOS sales",
    "business software help",
    "customer support accounting",
  ],
  openGraph: {
    title: "Contact FinovaOS — We're Here to Help",
    description:
      "Live chat, email (finovaos.app@gmail.com), or submit a ticket. 2-hour response time, 24/7 chat support available.",
    url: `${BASE}/contact`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Contact FinovaOS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact FinovaOS",
    description: "Live chat, email, or ticket — we respond within 2 hours.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/contact` },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact FinovaOS",
    url: `${BASE}/contact`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Contact", item: `${BASE}/contact` },
      ],
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
