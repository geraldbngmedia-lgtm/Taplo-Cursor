"use client";

import { Download } from "lucide-react";
import { DownloadLink } from "./download-link";
import {
  getDownloadCtaLabel,
  getOtherPlatformLinkLabel,
} from "../lib/detect-platform";
import { useDownloadPlatform } from "../_hooks/use-download-platform";

const primaryClassName =
  "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-900 text-white text-base font-normal shadow-[0_10px_24px_rgba(15,23,42,0.26),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition-all duration-300";

const secondaryClassName =
  "w-full sm:w-auto inline-flex items-center justify-center rounded-full px-6 py-4 border border-slate-300 bg-white/90 text-slate-800 text-sm font-medium hover:border-orange-200 hover:text-orange-600 transition-all duration-300";

const otherOsLinkClassName =
  "text-sm font-medium text-slate-500 hover:text-orange-600 transition-colors underline-offset-4 hover:underline";

export function LandingHeroDownloads() {
  const { platform, ready } = useDownloadPlatform();

  if (!ready || platform === null) {
    return (
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
        <DownloadLink platform="mac" className={primaryClassName}>
          <Download className="w-5 h-5" strokeWidth={1.5} />
          Start free trial
        </DownloadLink>
        <DownloadLink platform="win" className={secondaryClassName}>
          Download for Windows
        </DownloadLink>
      </div>
    );
  }

  const otherLabel = getOtherPlatformLinkLabel(platform);
  const otherPlatform = platform === "win" ? "mac" : "win";

  return (
    <div className="mt-10 flex flex-col items-center justify-center lg:items-start gap-3 sm:gap-4">
      <DownloadLink platform={platform} className={primaryClassName}>
        <Download className="w-5 h-5" strokeWidth={1.5} />
        {getDownloadCtaLabel(platform)}
      </DownloadLink>
      {otherLabel ? (
        <DownloadLink platform={otherPlatform} className={otherOsLinkClassName}>
          {otherLabel}
        </DownloadLink>
      ) : null}
    </div>
  );
}