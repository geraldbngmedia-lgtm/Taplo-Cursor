import { Download } from "lucide-react";
import { FREE_TRIAL } from "../plans";
import { AutoDownloadCta } from "./auto-download-cta";

export function LandingCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      <div className="relative isolate overflow-hidden rounded-[2.75rem] bg-[#ff7a5c] text-white border border-[#ff7a5c]/30 shadow-[0_24px_60px_-40px_rgba(255,122,92,0.5)] px-4 py-12 sm:px-6 sm:py-14 md:px-12 md:py-20 text-center">
        <div
          className="absolute inset-0 z-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "2rem 2rem",
          }}
        />

        <div className="relative z-10">
          <p className="text-sm font-medium text-orange-100 mb-4">
            {FREE_TRIAL.label} · {FREE_TRIAL.detail}
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] max-w-4xl mx-auto">
            Ready to send write-ups faster?
          </h2>
          <p className="mt-4 text-white/85 text-lg md:text-xl font-light max-w-2xl mx-auto">
            Plans from 399 SEK/month after your trial ends
          </p>

          <div className="mt-8 flex justify-center">
            <AutoDownloadCta
              showIcon
              icon={<Download className="w-5 h-5" strokeWidth={1.5} />}
              className="inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 bg-white text-slate-900 text-base font-medium shadow-[0_10px_24px_rgba(15,23,42,0.16),inset_0_1px_0_white] hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

