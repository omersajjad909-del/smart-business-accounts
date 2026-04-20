import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://finovaforge.com"),
  title: "FinovaForge — We Build Intelligent Business Software",
  description: "FinovaForge is a software company building intelligent, industry-specific business tools for growing companies across South Asia and beyond.",
};

// Override the (marketing) layout — no FinovaOS navbar/footer on the company site
export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
