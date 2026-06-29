import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Hero from "./components/Hero";
import SolutionSection from "./components/SolutionSection";
import FeaturesSection from "./components/FeaturesSection";
import ModulesSection from "./components/ModulesSection";
import IndustrySelector from "./components/IndustrySelector";
import PricingSection from "./components/Pricing";
import TestimonialsSection from "./components/Testimonials";
import FAQSection from "./components/FAQSection";
import CTASection from "./components/CTASection";
import NewsletterSection from "./components/NewsletterSection";
import TrustedBy from "./components/TrustedBy";
import VideoDemo from "./components/VideoDemo";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE}/#software`,
      "name": "FinovaOS",
      "description": "Cloud accounting software for Pakistan & UAE SMEs. FBR-ready invoicing, inventory management, HR & payroll, bank reconciliation, and CRM — all in one platform. Trusted by 500+ businesses in Karachi, Lahore, and Dubai.",
      "url": BASE,
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "AccountingApplication",
      "operatingSystem": "Web Browser",
      "inLanguage": ["en", "ur"],
      "offers": [
        {
          "@type": "Offer",
          "name": "Starter Plan",
          "price": "0",
          "priceCurrency": "PKR",
          "availability": "https://schema.org/InStock",
          "description": "Free plan for small businesses",
        },
        {
          "@type": "Offer",
          "name": "Pro Plan",
          "price": "2999",
          "priceCurrency": "PKR",
          "availability": "https://schema.org/InStock",
          "billingIncrement": "P1M",
        },
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "500",
        "bestRating": "5",
        "worstRating": "1",
      },
      "featureList": [
        "FBR-compliant invoicing",
        "Double-entry accounting",
        "Inventory management",
        "HR & Payroll with attendance tracking",
        "Bank reconciliation",
        "CRM and customer management",
        "Multi-branch support",
        "Financial reporting (P&L, Balance Sheet, Trial Balance)",
        "GST / Sales Tax invoicing",
        "Role-based access control",
      ],
      "screenshot": `${BASE}/icon.png`,
      "creator": { "@id": `${BASE}/#org` },
      "publisher": { "@id": `${BASE}/#org` },
      "countriesSupported": "PK AE SA GB",
    },
    {
      "@type": "Organization",
      "@id": `${BASE}/#org`,
      "name": "FinovaOS",
      "url": BASE,
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE}/icon.png`,
        "width": 512,
        "height": 512,
      },
      "sameAs": ["https://twitter.com/finova_io"],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "availableLanguage": ["English", "Urdu"],
        "areaServed": ["PK", "AE", "SA"],
      },
      "areaServed": [
        { "@type": "Country", "name": "Pakistan" },
        { "@type": "Country", "name": "United Arab Emirates" },
        { "@type": "Country", "name": "Saudi Arabia" },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      "url": BASE,
      "name": "FinovaOS",
      "publisher": { "@id": `${BASE}/#org` },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${BASE}/blog?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is FinovaOS FBR compliant?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS generates FBR-compliant invoices with all required fields including NTN, STRN, and tax breakdowns. You can export reports formatted for FBR filing.",
          },
        },
        {
          "@type": "Question",
          "name": "Can I manage payroll and attendance in FinovaOS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS includes a full HR & Payroll module with attendance tracking, leave management, salary slip generation, and deduction handling — all integrated with your accounting ledger.",
          },
        },
        {
          "@type": "Question",
          "name": "Does FinovaOS work for businesses in Pakistan and UAE?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS is built for SMEs across Pakistan (FBR-ready) and the Gulf (UAE VAT-compatible). It supports PKR, AED, SAR, and other currencies with localized tax settings.",
          },
        },
        {
          "@type": "Question",
          "name": "Is FinovaOS a cloud-based accounting software?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS is 100% cloud-based. You can access your accounts, invoices, inventory, and reports from any browser — no installation needed. Your data is backed up automatically.",
          },
        },
        {
          "@type": "Question",
          "name": "Can FinovaOS handle inventory management?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS includes real-time inventory tracking with stock-in/stock-out, low-stock alerts, product variants, multi-warehouse support, and automatic COGS calculation linked to your accounting.",
          },
        },
        {
          "@type": "Question",
          "name": "Does FinovaOS have AI features?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. FinovaOS includes built-in AI Intelligence: a real-time Business Health Score, Ask AI for natural language finance queries, expense auto-categorization, duplicate transaction detection, budget variance analysis, and smart anomaly alerts — all powered by your live financial data.",
          },
        },
        {
          "@type": "Question",
          "name": "What is the pricing for FinovaOS?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "FinovaOS offers three plans: Starter ($49/mo), Professional ($99/mo), and Enterprise ($249/mo). A launch offer gives 75% off for the first 3 months on any plan. All plans include accounting, invoicing, inventory, and AI intelligence — no hidden add-ons.",
          },
        },
      ],
    },
  ],
};

async function getRequestHost() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    ""
  ).toLowerCase();
}

export default async function LandingPage() {
  const host = await getRequestHost();

  if (host === "finovaforge.com" || host === "www.finovaforge.com") {
    redirect("/forge");
  }

  if (host === "usefinova.app" || host.endsWith(".usefinova.app")) {
    redirect("/auth");
  }

  if (host === "admin.finovaos.app" || host.endsWith(".admin.finovaos.app")) {
    redirect("/admin/login");
  }

  if (host === "ai.finovaos.app" || host.endsWith(".ai.finovaos.app")) {
    redirect("/dashboard/ai");
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Hero />
      <VideoDemo />
      <TrustedBy />
      <SolutionSection />
      <FeaturesSection />
      <ModulesSection />
      <IndustrySelector />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <NewsletterSection />
      <CTASection />
    </>
  );
}
