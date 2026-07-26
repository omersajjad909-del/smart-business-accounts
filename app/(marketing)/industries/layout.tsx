import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Industry Solutions — Trading, Manufacturing, Restaurant, Retail, Import/Export & More | FinovaOS",
  description: "FinovaOS is purpose-built for every industry — trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, transport, real estate, clearing & forwarding, hotel, NGO, IT, law firm, salon, gym, e-commerce, and agriculture.",
  keywords: [
    // Trading & Wholesale
    "trading business software", "trading company ERP", "wholesale accounting software",
    "wholesale management system", "trading ERP Pakistan",
    // Manufacturing
    "manufacturing ERP", "manufacturing accounting software",
    "bill of materials software", "production order management", "job costing software",
    // Distribution
    "distribution management software", "route-based sales software", "van sales software",
    "multi-warehouse management",
    // Restaurant
    "restaurant management software", "restaurant billing software",
    "restaurant POS software", "food & beverage ERP", "restaurant accounting",
    // Retail
    "retail accounting software", "retail POS software", "retail management system",
    "retail inventory management",
    // Import / Export
    "import export software", "trade management software",
    "clearing forwarding software", "shipment tracking software",
    "commercial invoice software", "LC TT management",
    // Construction
    "construction accounting software", "construction ERP",
    "job costing construction", "project billing software",
    // Hospital & Clinic
    "hospital management software", "clinic billing software",
    "healthcare accounting software", "hospital ERP",
    // School & Education
    "school management software", "school fee management",
    "education ERP", "student billing software",
    // Pharmacy
    "pharmacy management software", "pharmacy billing software", "pharmacy ERP",
    // Transport
    "transport management software", "fleet management software",
    // Hotel
    "hotel management software", "hotel billing software", "hospitality ERP",
    // Real Estate
    "real estate accounting software", "property management software",
    // Other
    "NGO accounting software", "IT company accounting software",
    "law firm billing software", "salon management software",
    "gym management software", "ecommerce accounting software",
    "agriculture accounting software", "service business accounting",
    // Geo
    "industry software Pakistan", "industry ERP Pakistan",
    "accounting software UAE industries",
  ],
  alternates: { canonical: `${BASE}/industries` },
  openGraph: {
    title: "Industry Solutions — FinovaOS",
    description: "Purpose-built solutions for retail, manufacturing, restaurants, healthcare, schools, and more.",
    url: `${BASE}/industries`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Industry Solutions" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industry Solutions — FinovaOS",
    description: "Purpose-built for your industry. Retail, manufacturing, restaurants, healthcare, schools and more.",
    images: [`${BASE}/icon.png`],
  },
};

export default function IndustriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
