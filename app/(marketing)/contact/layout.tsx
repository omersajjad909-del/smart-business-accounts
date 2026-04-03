import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Contact Us — Support, Sales & Partnerships",
  description:
    "Get in touch with the Finova team. Live chat, email support (finovaos.app@gmail.com), or submit a support ticket. Our team responds within 2 hours during business hours.",
  keywords: [
    "contact Finova",
    "Finova support",
    "accounting software support",
    "Finova sales",
    "business software help",
    "customer support accounting",
  ],
  openGraph: {
    title: "Contact Finova — We're Here to Help",
    description:
      "Live chat, email (finovaos.app@gmail.com), or submit a ticket. 2-hour response time, 24/7 chat support available.",
    url: `${BASE}/contact`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Contact Finova" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Finova",
    description: "Live chat, email, or ticket — we respond within 2 hours.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/contact` },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Finova",
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
