import {
  Header,
  HeroSection,
  FeaturesGrid,
  PricingSection,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <HeroSection />
      <FeaturesGrid />
      <PricingSection />
      <Footer />
    </div>
  );
}
