import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

export const metadata: Metadata = {
  title: "Release Notes — FinovaOS",
  description: "Stay up to date with the latest FinovaOS updates, new features, improvements, and bug fixes. We ship every week.",
  alternates: { canonical: `${BASE}/updates` },
  openGraph: {
    title: "Release Notes — FinovaOS",
    description: "Latest FinovaOS updates, new features, and improvements. We ship every week.",
    url: `${BASE}/updates`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Release Notes" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Release Notes — FinovaOS",
    description: "Latest updates and new features. We ship every week.",
    images: [`${BASE}/icon.png`],
  },
};

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
