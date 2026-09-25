import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Pricing Plans — Starter $49/mo · Pro $99/mo · Enterprise",
  description:
    "Transparent, affordable pricing for every business size. Starter ($49/mo), Professional ($99/mo), Enterprise ($249/mo). All plans include accounting, invoicing, and inventory. No hidden fees.",
  keywords: [
    "accounting software pricing",
    "invoicing software cost",
    "cloud accounting plans",
    "SME accounting subscription",
    "affordable accounting software",
    "FinovaOS pricing",
    "business software plans",
    "starter plan accounting",
  ],
  // No `images` field in openGraph/twitter below — this route has its own
  // opengraph-image.tsx, which Next.js auto-detects and serves at a hashed
  // URL (e.g. /pricing/opengraph-image-15m7k7?...). A hardcoded, unhashed
  // "/pricing/opengraph-image" here used to override that for the Twitter
  // card specifically (Next merges the auto-detected image into openGraph
  // automatically, but not into a manually-set twitter.images), so the
  // Twitter preview 404'd — and Google's crawler logged that 404 too, since
  // it fetches referenced share images. Let Next fill both in.
  openGraph: {
    title: "Pricing Plans — Start at $49/month | FinovaOS",
    description:
      "Starter ($49/mo), Professional ($99/mo), Enterprise ($249/mo). No hidden fees. Cancel anytime.",
    url: `${BASE}/pricing`,
    siteName: "FinovaOS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinovaOS Pricing — Plans from $49/month",
    description: "Starter · Professional · Enterprise. Transparent pricing, no hidden fees.",
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
        name: "How much does FinovaOS cost?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "FinovaOS offers three plans: Starter at $49/month (up to 3 users), Professional at $99/month (up to 10 users), and Enterprise at $249/month (up to 25 users). All plans include accounting, invoicing, and inventory management.",
        },
      },
      {
        "@type": "Question",
        name: "Can I see a demo before purchasing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, you can book a personalized demo where we walk you through FinovaOS for your specific business type. Get in touch via the contact form or live chat.",
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
        name: "Does FinovaOS support multi-currency?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, FinovaOS supports multi-currency accounting on Professional and Enterprise plans, allowing you to invoice and manage finances in any currency.",
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
