import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

/**
 * The page itself is a client component, so it cannot export metadata. Without
 * this the whole /for/* family shipped the same title, the same description and
 * no canonical at all — Search Console read them as one page duplicated ~100
 * times ("Duplicate without user-selected canonical"). Metadata lives here, on
 * the server layout, where each industry gets its own title, description and
 * self-referencing canonical.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string }>;
}): Promise<Metadata> {
  const { industry } = await params;
  const config = BUSINESS_PHASE_CONFIG[industry];

  if (!config) return { title: "Industry not found", robots: { index: false, follow: false } };

  const url = `${BASE}/for/${industry}`;
  // Bare title — the root layout's "%s | FinovaOS" template appends the brand
  // for the <title> tag. OG/Twitter titles aren't templated, so they get the
  // brand suffix spelled out explicitly.
  //
  // "Pakistan" is in the title on purpose: every real competitor ranking for
  // "<industry> ERP Pakistan" — the actual search term buyers use — carries
  // the country in its own title. Leaving it out here meant this page never
  // looked like a match for that query in the first place. Kept short (with
  // the root template's " | FinovaOS" added on top) to stay under ~60 chars.
  const title = `${config.label} ERP & Accounting Software — Pakistan`;
  const socialTitle = `${title} — FinovaOS`;
  const description =
    `${config.description} FinovaOS gives ${config.label.toLowerCase()} businesses in Pakistan and the Gulf FBR-ready accounting, ` +
    `invoicing, inventory and reporting in one cloud platform built for the way the industry actually works.`;

  return {
    title,
    description,
    keywords: [
      `${config.label} accounting software`,
      `${config.label} ERP`,
      `${config.label} software`,
      `${config.category} business software`,
      "FinovaOS",
      "cloud accounting",
    ],
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: "FinovaOS",
      images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: `FinovaOS for ${config.label}` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [`${BASE}/icon.png`],
    },
    alternates: { canonical: url },
  };
}

export default async function IndustryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ industry: string }>;
}) {
  const { industry } = await params;

  if (!(industry in BUSINESS_PHASE_CONFIG)) notFound();

  return <>{children}</>;
}
