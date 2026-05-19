"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AutoDownloadCta } from "./auto-download-cta";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#output", label: "Output" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
] as const;

export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [close]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="landing-mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm top-20"
          onClick={close}
        />
      ) : null}

      <div
        id="landing-mobile-menu"
        className={`fixed left-4 right-4 z-50 top-[5.25rem] rounded-2xl bg-white/95 backdrop-blur-xl border border-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] transition-all duration-200 origin-top ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <nav className="flex flex-col p-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="min-h-[44px] flex items-center px-4 py-3 text-base text-slate-700 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="p-2 pt-1">
            <AutoDownloadCta
              onClick={close}
              className="w-full min-h-[44px] inline-flex items-center justify-center rounded-full px-5 py-3 text-sm text-white bg-gradient-to-b from-[#ff7a5c] to-[#f06b4e] border border-[#d9593f] shadow-[0_5px_14px_rgba(255,122,92,0.28)]"
            />
          </div>
        </nav>
      </div>
    </div>
  );
}
