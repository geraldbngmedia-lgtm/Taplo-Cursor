import { PRICING_FAQ } from "../plans";

export function LandingFaq() {
  return (
    <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-20 border-t border-slate-200/60">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-normal tracking-tight text-slate-950 text-center mb-10">
          Common questions
        </h2>
        <div className="space-y-3">
          {PRICING_FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl bg-white/70 border border-white shadow-[0_6px_20px_-16px_rgba(15,23,42,0.2),inset_0_1px_0_white] overflow-hidden"
            >
              <summary className="cursor-pointer list-none px-6 py-4 min-h-[44px] text-base font-medium text-slate-900 flex items-center justify-between gap-4">
                {item.question}
                <span className="text-slate-400 text-xl font-light group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm text-slate-500 font-light leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
