import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Customer Reviews & Testimonials — FinovaOS",
  description: "See what businesses say about FinovaOS. Real reviews from accountants, business owners, and CFOs who switched to FinovaOS for accounting, invoicing, and inventory.",
  keywords: ["FinovaOS reviews", "FinovaOS testimonials", "accounting software reviews", "cloud accounting testimonials"],
  alternates: { canonical: `${BASE}/testimonials` },
  openGraph: {
    title: "Customer Reviews — FinovaOS",
    description: "Real reviews from businesses using FinovaOS for accounting, invoicing, and inventory.",
    url: `${BASE}/testimonials`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Customer Reviews" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Customer Reviews — FinovaOS",
    description: "Real reviews from businesses using FinovaOS.",
    images: [`${BASE}/icon.png`],
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
