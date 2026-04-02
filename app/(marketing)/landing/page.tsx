import Hero from "./components/Hero";
import SolutionSection from "./components/SolutionSection";
import FeaturesSection from "./components/FeaturesSection";
import ModulesSection from "./components/ModulesSection";
import PricingSection from "./components/Pricing";
import TestimonialsSection from "./components/Testimonials";
import FAQSection from "./components/FAQSection";
import CTASection from "./components/CTASection";
import NewsletterSection from "./components/NewsletterSection";
import CookieBanner from "./components/CookieBanner";

export default function LandingPage() {
  return (
    <>
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
    </>
  );
}
