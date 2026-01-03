import {
  Header,
  HeroSection,
  FeaturesGrid,
  PricingSection,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesGrid />
      <PricingSection />
      <Footer />
    </div>
  );
}
