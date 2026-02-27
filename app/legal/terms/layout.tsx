import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Smart Business Accounts",
  description: "Read the terms that govern the use of Smart Business Accounts.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
