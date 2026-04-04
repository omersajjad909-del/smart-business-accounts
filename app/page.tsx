import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Offer from "./(marketing)/landing/components/Offer";
import Navbar from "./(marketing)/landing/components/navbar";
import Hero from "./(marketing)/landing/components/Hero";
import SolutionSection from "./(marketing)/landing/components/SolutionSection";
import FeaturesSection from "./(marketing)/landing/components/FeaturesSection";
import ModulesSection from "./(marketing)/landing/components/ModulesSection";
import PricingSection from "./(marketing)/landing/components/Pricing";
import TestimonialsSection from "./(marketing)/landing/components/Testimonials";
import FAQSection from "./(marketing)/landing/components/FAQSection";
import CTASection from "./(marketing)/landing/components/CTASection";
import NewsletterSection from "./(marketing)/landing/components/NewsletterSection";
import CookieBanner from "./(marketing)/landing/components/CookieBanner";
import Footer from "./(marketing)/landing/components/Footer";
import ChatWidget from "./(marketing)/landing/components/ChatWidget";

async function getRequestHost() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    ""
  ).toLowerCase();
}

export default async function RootPage() {
  const host = await getRequestHost();

  if (host === "usefinova.app" || host.endsWith(".usefinova.app")) {
    redirect("/auth");
  }

  if (host === "admin.finovaos.app" || host.endsWith(".admin.finovaos.app")) {
    redirect("/admin/login");
  }

  if (host === "ai.finovaos.app" || host.endsWith(".ai.finovaos.app")) {
    redirect("/dashboard/ai");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#060919]">
      <Offer />
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className="grow overflow-x-hidden">
        <Hero />
        <SolutionSection />
        <FeaturesSection />
        <ModulesSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <NewsletterSection />
        <CTASection />
        <CookieBanner />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
