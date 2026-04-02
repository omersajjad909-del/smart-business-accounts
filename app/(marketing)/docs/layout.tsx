import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — Finova",
  description: "Comprehensive guides, API reference, video walkthroughs, and integration docs for Finova — the global business accounting platform.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
