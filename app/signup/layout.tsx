import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Free Trial — Smart Business Accounts",
  description: "Create your company and start managing finances with professional, secure cloud accounting.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
