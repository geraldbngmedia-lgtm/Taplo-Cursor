import { LOGO_SRC, SITE_URL } from "../constants";

export function LandingFooter() {
  return (
    <footer className="taplo-landing-footer relative z-10 w-full bg-[#f3f5f8] border-t border-slate-200/60 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <a href="/" className="flex items-center gap-3">
            <img
              src={LOGO_SRC}
              alt="Taplo Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="text-sm font-medium tracking-tight text-slate-950">
              Taplo for Desktop
            </span>
          </a>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 md:justify-end text-sm text-slate-500 font-light">
            <a href="#pricing" className="hover:text-orange-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-orange-600 transition-colors">
              FAQ
            </a>
            <a
              href={`${SITE_URL}/privacy`}
              className="hover:text-orange-600 transition-colors"
            >
              Privacy
            </a>
            <a
              href={`${SITE_URL}/terms`}
              className="hover:text-orange-600 transition-colors"
            >
              Terms
            </a>
            <a
              href={`${SITE_URL}/contact`}
              className="hover:text-orange-600 transition-colors"
            >
              Contact
            </a>
          </div>

          <p className="text-sm text-slate-400 font-light text-center md:text-right">
            © 2026 Taplo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
