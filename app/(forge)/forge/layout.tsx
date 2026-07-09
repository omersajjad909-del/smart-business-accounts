import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://finovaforge.com"),
  title: "Finova Forge — We Build Intelligent Business Software",
  description:
    "Finova Forge is a software company building intelligent, industry-specific business tools for growing companies worldwide.",
  icons: {
    icon: "/FinovaForge.png",
  },
};

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}