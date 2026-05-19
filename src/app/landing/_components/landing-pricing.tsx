import { FREE_TRIAL, PRICING_INTRO } from "../plans";
import { PricingCards } from "./pricing-cards";

export function LandingPricing() {
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex flex-col sm:flex-row sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 rounded-2xl sm:rounded-full bg-[#ff7a5c]/10 border border-[#ff7a5c]/25 px-4 py-3 sm:px-5 sm:py-2.5 mb-6 mx-auto text-center max-w-xl">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#ff7a5c] shrink-0">
            <span className="w-2 h-2 shrink-0 rounded-full bg-[#ff7a5c] animate-pulse" />
            {FREE_TRIAL.label}
          </span>
          <span className="hidden sm:inline text-[#ff7a5c]/70" aria-hidden>
            —
          </span>
          <span className="text-xs sm:text-sm font-medium text-[#ff7a5c]/90 sm:whitespace-nowrap">
            {FREE_TRIAL.detail}
          </span>
        </div>
        <p className="text-sm font-medium tracking-tight text-orange-600 mb-4">
          PRICING
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-slate-950 leading-[1.05]">
          {PRICING_INTRO.headline}
        </h2>
        <p className="mt-6 text-base md:text-lg text-slate-600 font-light leading-relaxed">
          {PRICING_INTRO.subline}
        </p>
      </div>

      <p className="text-center text-sm text-slate-500 font-light mb-8 max-w-lg mx-auto">
        {PRICING_INTRO.trialBanner}
      </p>

      <PricingCards />

      <p className="text-center text-sm text-slate-500 font-light mt-10 max-w-xl mx-auto">
        {PRICING_INTRO.reassurance}
      </p>
    </section>
  );
}
