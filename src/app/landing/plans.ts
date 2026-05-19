export type PricingPlanId = "starter" | "pro" | "enterprise";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  priceSek: number | null;
  priceLabel?: string;
  interviewsPerMonth: string | null;
  tagline: string;
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
  trialNote?: string;
};

export const FREE_TRIAL = {
  label: "14-day free trial",
  detail: "Full Pro access · No credit card required",
};

export const PRICING_INTRO = {
  headline: "Simple pricing for recruiters",
  subline:
    "Start with a 14-day free trial, then pick the plan that fits your interview volume.",
  reassurance:
    "Same features on Starter and Pro · Cancel anytime",
  trialBanner: "Every plan starts with a 14-day free trial on Pro",
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceSek: 399,
    interviewsPerMonth: "~10 interviews / month",
    tagline: "Great for trying Taplo or lighter interview volume",
    cta: "Start free trial",
    href: "#download",
    trialNote: "14-day free trial included",
  },
  {
    id: "pro",
    name: "Pro",
    priceSek: 649,
    interviewsPerMonth: "~40 interviews / month",
    tagline: "For active recruiters who run screens every week",
    cta: "Start free trial",
    href: "#download",
    highlighted: true,
    badge: "Most popular",
    trialNote: "14-day free trial included",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceSek: null,
    priceLabel: "Let's talk",
    interviewsPerMonth: "Custom volume",
    tagline: "Agencies and teams with multiple recruiters",
    cta: "Contact us",
    href: "mailto:hello@taplo.app",
  },
];

export const PRICING_FAQ = [
  {
    question: "What counts as one interview?",
    answer:
      "A recorded interview that Taplo transcribes and turns into your summary and client write-up. Calls up to 60 minutes count as one interview.",
  },
  {
    question: "What's included in both plans?",
    answer:
      "Calendar sync, pre-meeting reminders, recording, transcripts, job-description-aware analysis, candidate summaries, client drafts, and follow-up emails. The only difference is how many interviews per month.",
  },
  {
    question: "What happens if I go over my limit?",
    answer:
      "We'll notify you in the app before you run out. If you need more, extra interviews are available at a small add-on rate — no surprise bills without a heads-up.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. Every account starts with a 14-day free trial with full Pro access so you can run real interviews before you pay.",
  },
  {
    question: "Are prices including VAT?",
    answer:
      "Prices are shown in SEK excluding 25% Swedish VAT. VAT is added where applicable on invoices.",
  },
];
