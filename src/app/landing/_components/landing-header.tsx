import { DownloadLink } from "./download-link";
import { LandingMobileNav } from "./landing-mobile-nav";
import { LOGO_SRC } from "../constants";

const navLinkClass =
  "relative transition-colors duration-300 hover:text-orange-600 after:absolute after:left-0 after:-bottom-1.5 after:h-px after:w-0 after:bg-orange-500 after:transition-all after:duration-300 hover:after:w-full";

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top,0px)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-5">
        <div className="relative overflow-hidden rounded-full bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_14px_38px_-22px_rgba(15,23,42,0.42),inset_0_1px_0_rgba(255,255,255,1)] px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="absolute inset-0 rounded-full bg-white/40 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <a href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <img
                src={LOGO_SRC}
                alt="Taplo Logo"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </a>

            <div className="hidden md:flex items-center gap-7 text-sm text-slate-600 font-normal">
              <a href="#features" className={navLinkClass}>
                Features
              </a>
              <a href="#how-it-works" className={navLinkClass}>
                How it works
              </a>
              <a href="#output" className={navLinkClass}>
                Output
              </a>
              <a href="#pricing" className={navLinkClass}>
                Pricing
              </a>
              <a href="#faq" className={navLinkClass}>
                FAQ
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <DownloadLink className="hidden sm:inline-flex items-center justify-center rounded-full px-5 py-2 text-sm text-white bg-gradient-to-b from-[#ff7a5c] to-[#f06b4e] border border-[#d9593f] shadow-[0_5px_14px_rgba(255,122,92,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-[#ff947a] hover:to-[#ff7a5c] hover:-translate-y-0.5 transition-all duration-300">
                Start free trial
              </DownloadLink>
              <DownloadLink className="sm:hidden inline-flex items-center justify-center rounded-full px-3 py-2 text-xs text-white bg-gradient-to-b from-[#ff7a5c] to-[#f06b4e] border border-[#d9593f] shadow-[0_5px_14px_rgba(255,122,92,0.28)]">
                Try free
              </DownloadLink>
              <LandingMobileNav />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

