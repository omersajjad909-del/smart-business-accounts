import type { Metadata } from "next";

const FORGE_URL = "https://finovaforge.com";
const FORGE_TITLE = "Finova Forge - We Build Intelligent Business Software";
const FORGE_DESCRIPTION =
  "Finova Forge is a software company building intelligent, industry-specific business tools for growing companies worldwide.";
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
    "Finova Forge",
    "software company",
    "AI software",
    "business software",
    "custom software Pakistan",
    "SaaS builder",
    "FinovaOS",
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
