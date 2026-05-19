import { PRICING_PLANS } from "../plans";
import { DownloadLink } from "./download-link";

function PlanCta({
  plan,
}: {
  plan: (typeof PRICING_PLANS)[number];
}) {
  const className =
    plan.highlighted
      ? "w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-white bg-[#ff7a5c] border border-[#ff7a5c]/40 shadow-[0_8px_20px_-12px_rgba(255,122,92,0.35)] hover:bg-[#ff947a] transition-all duration-300"
      : "w-full inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-slate-900 bg-white border border-slate-200 shadow-[0_4px_14px_-8px_rgba(15,23,42,0.12)] hover:border-orange-200 hover:text-orange-600 transition-all duration-300";

  if (plan.id === "enterprise") {
    return (
      <a href={plan.href} className={className}>
        {plan.cta}
      </a>
    );
  }

  return (
    <DownloadLink className={className}>{plan.cta}</DownloadLink>
  );
}

export function PricingCards() {
  return (
    <div
      id="download"
      className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto"
    >
      {PRICING_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-[2rem] p-6 sm:p-8 ${
            plan.highlighted
              ? "bg-white border-2 border-[#ff7a5c]/50 shadow-[0_20px_50px_-24px_rgba(255,122,92,0.45),inset_0_1px_0_white] md:scale-[1.02] md:-my-1"
              : "bg-white/70 border border-white shadow-[0_10px_28px_-20px_rgba(15,23,42,0.24),inset_0_1px_0_white]"
          }`}
        >
          {plan.badge ? (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex rounded-full bg-[#ff7a5c] text-white text-xs font-medium px-4 py-1 shadow-[0_4px_12px_rgba(255,122,92,0.35)]">
              {plan.badge}
            </span>
          ) : null}

          <p className="text-sm font-medium text-orange-600 tracking-tight">
            {plan.name}
          </p>

          <div className="mt-4 flex items-baseline gap-1">
            {plan.priceSek !== null ? (
              <>
                <span className="text-4xl font-normal tracking-tight text-slate-950">
                  {plan.priceSek}
                </span>
                <span className="text-lg text-slate-500 font-light">SEK</span>
                <span className="text-sm text-slate-400 font-light">/ month</span>
              </>
            ) : (
              <span className="text-3xl font-normal tracking-tight text-slate-950">
                {plan.priceLabel}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-slate-400 font-light">excl. VAT</p>

          {plan.trialNote ? (
            <p className="mt-3 text-sm font-medium text-[#ff7a5c]">{plan.trialNote}</p>
          ) : null}

          {plan.interviewsPerMonth ? (
            <p className="mt-6 text-lg font-medium text-slate-900 tracking-tight">
              {plan.interviewsPerMonth}
            </p>
          ) : null}

          <p className="mt-3 text-sm text-slate-500 font-light leading-relaxed flex-1">
            {plan.tagline}
          </p>

          <div className="mt-8">
            <PlanCta plan={plan} />
          </div>
        </div>
      ))}
    </div>
  );
}
