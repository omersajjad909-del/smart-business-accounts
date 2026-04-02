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

export default function RootPage() {
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
