import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  // Bare title — the root layout's "%s | FinovaOS" template appends the
  // brand for the <title> tag. This one used to carry its own "| FinovaOS"
  // suffix on top of that template, which is how it ended up rendering as
  // "...| FinovaOS | FinovaOS" and flagged as an overlong title by a live
  // OpenRush audit (2026-09-25).
  title: "Industry Solutions for Every Business Type",
  description:
    "FinovaOS is built for your industry — trading, manufacturing, retail, restaurant, distribution, import/export and more — with accounting and inventory workflows tailored to each one.",
  keywords: [
    // Trading & Wholesale
    "trading business accounting software", "wholesale accounting software",
    "trading company ERP", "wholesale management system", "trading ERP Pakistan",
    // Manufacturing
    "manufacturing accounting software", "manufacturing ERP",
    "bill of materials software", "production order management", "job costing software",
    // Distribution
    "distribution management software", "route-based sales", "van sales software",
    // Restaurant
    "restaurant management software", "restaurant billing software",
    "restaurant POS software", "food business ERP",
    // Retail
    "retail accounting software", "retail POS software", "retail management system",
    // Import / Export
    "import export accounting software", "clearing forwarding software",
    "trade management software", "commercial invoice software",
    // Construction
    "construction accounting software", "construction ERP",
    // Hospital
    "hospital management software", "clinic billing software", "healthcare ERP",
    // School
    "school management software", "school fee management software",
    // Pharmacy
    "pharmacy management software", "pharmacy billing",
    // Transport
    "transport management software", "fleet management software",
    // Hotel
    "hotel management software", "hotel billing software",
    // Real Estate
    "real estate accounting software", "property management software",
    // Other
    "NGO accounting software", "IT company accounting",
    "law firm billing software", "salon management software",
    "gym management software", "ecommerce accounting",
    "agriculture accounting software", "service business invoicing",
    // Platform
    "industry-specific ERP Pakistan", "cloud ERP industry solutions",
  ],
  openGraph: {
    title: "Industry Solutions — Trading, Manufacturing, Restaurant, Retail & More | FinovaOS",
    description:
      "Purpose-built for every industry — trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, transport, real estate, and more.",
    url: `${BASE}/solutions`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Industry Solutions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industry Solutions | FinovaOS",
    description: "Trading, manufacturing, retail, and services — FinovaOS adapts to your industry.",
    images: [`${BASE}/icon.png`],
  },
  alternates: { canonical: `${BASE}/solutions` },
};

export default function SolutionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
