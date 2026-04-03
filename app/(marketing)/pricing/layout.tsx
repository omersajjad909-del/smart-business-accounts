import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export const metadata: Metadata = {
  title: "Pricing Plans — Starter $49/mo · Pro $99/mo · Enterprise",
  description:
    "Transparent, affordable pricing for every business size. Starter ($49/mo), Professional ($99/mo), Enterprise ($249/mo). All plans include accounting, invoicing, and inventory. 14-day free trial. No hidden fees.",
  keywords: [
    "accounting software pricing",
    "invoicing software cost",
    "cloud accounting plans",
    "SME accounting subscription",
    "affordable accounting software",
    "Finova pricing",
    "business software plans",
    "starter plan accounting",
  ],
  openGraph: {
    title: "Pricing Plans — Start at $49/month | Finova",
    description:
      "Starter ($49/mo), Professional ($99/mo), Enterprise ($249/mo). No hidden fees. 14-day free trial. Cancel anytime.",
    url: `${BASE}/pricing`,
    siteName: "Finova",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "Finova Pricing Plans" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finova Pricing — Plans from $49/month",
    description: "Starter · Professional · Enterprise. Transparent pricing, no hidden fees, 14-day free trial.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/pricing` },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How much does Finova cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Finova offers three plans: Starter at $49/month (up to 5 users), Professional at $99/month (up to 20 users), and Enterprise at $249/month (unlimited users). All plans include accounting, invoicing, and inventory management.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a free trial?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Finova offers a 14-day free trial on all plans. No credit card required to get started.",
        },
      },
      {
        "@type": "Question",
        name: "Can I cancel anytime?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees.",
        },
      },
      {
        "@type": "Question",
        name: "Does Finova support multi-currency?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Finova supports multi-currency accounting on Professional and Enterprise plans, allowing you to invoice and manage finances in any currency.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
