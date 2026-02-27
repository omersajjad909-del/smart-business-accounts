import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Smart Business Accounts",
  description: "Get help with onboarding, billing, and product questions.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
