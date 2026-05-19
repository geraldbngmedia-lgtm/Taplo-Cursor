import { LandingBackground } from "./_components/landing-background";
import { LandingCta } from "./_components/landing-cta";
import { LandingFaq } from "./_components/landing-faq";
import { LandingFeatures } from "./_components/landing-features";
import { LandingFooter } from "./_components/landing-footer";
import { LandingHeader } from "./_components/landing-header";
import { LandingHero } from "./_components/landing-hero";
import { LandingHowItWorks } from "./_components/landing-how-it-works";
import { LandingOutput } from "./_components/landing-output";
import { LandingPricing } from "./_components/landing-pricing";

export default function LandingPage() {
  return (
    <div className="taplo-landing bg-[#f3f5f8] text-slate-900 min-h-screen relative overflow-x-hidden antialiased selection:bg-orange-100 selection:text-orange-900">
      <LandingBackground />
      <LandingHeader />
      <main className="relative z-10">
        <LandingHero />
        <LandingFeatures />
        <LandingOutput />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
        <LandingFooter />
      </main>
    </div>
  );
}
