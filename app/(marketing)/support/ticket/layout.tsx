import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// The parent support/layout.tsx hardcodes openGraph.url to /support (see the
// comment there, which deliberately omits `alternates.canonical` for the same
// reason). Without this override this page inherited that whole openGraph
// block and disagreed with its own (correctly per-pathname) canonical.
export const metadata: Metadata = {
  title: "Submit a Support Ticket — FinovaOS",
  description: "Submit a support ticket and our team will get back to you within 24 hours.",
  openGraph: {
    title: "Submit a Support Ticket — FinovaOS",
    description: "Submit a support ticket and our team will get back to you within 24 hours.",
    url: `${BASE}/support/ticket`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Support" }],
    type: "website",
  },
};

export default function SupportTicketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
