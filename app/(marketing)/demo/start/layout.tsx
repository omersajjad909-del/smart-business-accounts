import type { Metadata } from "next";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

// This page only works with a booking's one-time ?token= — nobody reaches it
// by browsing, so it has no internal link pointing at it (Ahrefs correctly
// flags it as an orphan). Rather than fabricate a link to a URL that 404s
// without a token, keep it out of the index instead.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  // The parent demo/layout.tsx hardcodes openGraph.url to /demo (see the
  // comment there); without an override this page inherited that whole block
  // and disagreed with its own (correctly per-pathname) canonical. Next
  // merges `openGraph` as one object, not per-field, so the full block has
  // to be repeated here — just supplying `url` would wipe out the rest.
  openGraph: {
    title: "Try Live Demo - Explore FinovaOS by Business Type",
    description: "Pick your business type and preview FinovaOS's workflows, modules, and live workspace before you start.",
    url: `${BASE}/demo/start`,
    siteName: "FinovaOS",
    images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: "FinovaOS Demo" }],
    type: "website",
  },
};

export default function DemoStartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
