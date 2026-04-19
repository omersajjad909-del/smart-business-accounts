import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Hero from "./components/Hero";
import SolutionSection from "./components/SolutionSection";
import FeaturesSection from "./components/FeaturesSection";
import ModulesSection from "./components/ModulesSection";
import IndustrySelector from "./components/IndustrySelector";
import PricingSection from "./components/Pricing";
import TestimonialsSection from "./components/Testimonials";
import FAQSection from "./components/FAQSection";
import CTASection from "./components/CTASection";
import NewsletterSection from "./components/NewsletterSection";
import CookieBanner from "./components/CookieBanner";

async function getRequestHost() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    ""
  ).toLowerCase();
}

export default async function LandingPage() {
  const host = await getRequestHost();

  if (host === "finovaforge.com" || host === "www.finovaforge.com") {
    redirect("/forge");
  }

  if (host === "usefinova.app" || host.endsWith(".usefinova.app")) {
    redirect("/auth");
  }

  if (host === "admin.finovaos.app" || host.endsWith(".admin.finovaos.app")) {
    redirect("/admin/login");
  }

  if (host === "ai.finovaos.app" || host.endsWith(".ai.finovaos.app")) {
    redirect("/dashboard/ai");
  }

  if (host === "finovaos.app" || host === "www.finovaos.app") {
    redirect("/");
  }

  return (
    <>
      <Hero />
      <SolutionSection />
      <FeaturesSection />
      <ModulesSection />
      <IndustrySelector />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <NewsletterSection />
      <CTASection />
      <CookieBanner />
    </>
  );
}
