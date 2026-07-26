import type { Metadata } from "next";

const FORGE_URL = "https://finovaforge.com";
const FORGE_TITLE = "Finova Forge - Industry-Specific Business Software | Trading, Manufacturing, Restaurant, Retail & More";
const FORGE_DESCRIPTION =
  "Finova Forge is a software company building intelligent, industry-specific business tools — trading, wholesale, manufacturing, distribution, restaurant, retail, import/export, construction, hospital, school, pharmacy, and more. Creators of FinovaOS.";
const FORGE_OG_IMAGE = "/FinovaForge.png";

export const metadata: Metadata = {
  metadataBase: new URL(FORGE_URL),
  title: FORGE_TITLE,
  description: FORGE_DESCRIPTION,
  applicationName: "Finova Forge",
  authors: [{ name: "Finova Forge", url: FORGE_URL }],
  creator: "Finova Forge",
  publisher: "Finova Forge",
  keywords: [
    "Finova Forge", "FinovaOS", "software company Pakistan",
    "industry-specific business software", "AI business software",
    "Umer Sajjad", "Finova Forge founder",
    // Industries
    "trading business software", "wholesale accounting software",
    "manufacturing ERP", "distribution management software",
    "restaurant management software", "restaurant POS software",
    "retail accounting software", "retail POS software",
    "import export software", "clearing forwarding software",
    "construction accounting software", "hospital management software",
    "school management software", "pharmacy management software",
    "transport management software", "real estate accounting software",
    "hotel management software", "NGO accounting software",
    "IT company accounting software", "law firm billing software",
    "salon management software", "gym management software",
    "ecommerce accounting software", "agriculture accounting software",
    // Platform
    "cloud ERP Pakistan", "cloud accounting Pakistan",
    "SaaS Pakistan", "business software Lahore",
    "PSEB registered software company", "IT exporter Pakistan",
  ],
  icons: {
    icon: [
      { url: "/FinovaForge.png", sizes: "32x32", type: "image/png" },
      { url: "/FinovaForge.png", sizes: "192x192", type: "image/png" },
      { url: "/FinovaForge.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/FinovaForge.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/FinovaForge.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: FORGE_URL,
    siteName: "Finova Forge",
    title: FORGE_TITLE,
    description: FORGE_DESCRIPTION,
    images: [
      {
        url: FORGE_OG_IMAGE,
        width: 1024,
        height: 1024,
        alt: "Finova Forge",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: FORGE_TITLE,
    description: FORGE_DESCRIPTION,
    images: [FORGE_OG_IMAGE],
  },
  alternates: {
    canonical: FORGE_URL,
  },
};

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
