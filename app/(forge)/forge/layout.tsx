import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://finovaforge.com"),
  title: "Finova Forge - We Build Intelligent Business Software",
  description:
    "Finova Forge is a software company building intelligent, industry-specific business tools for growing companies worldwide.",
  icons: {
    icon: [
      { url: "/FinovaForge.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/FinovaForge.png?v=4", sizes: "192x192", type: "image/png" },
      { url: "/FinovaForge.png?v=4", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/FinovaForge.png?v=4", sizes: "180x180", type: "image/png" }],
    shortcut: "/FinovaForge.png?v=4",
  },
};

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
