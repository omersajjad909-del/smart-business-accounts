import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Smart Business Accounts",
  description: "Learn how Smart Business Accounts handles and protects your data.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
