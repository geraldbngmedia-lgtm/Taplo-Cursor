"use client";

import { Download } from "lucide-react";
import { DownloadLink } from "./download-link";
import { useDownloadPlatform } from "../_hooks/use-download-platform";

const className =
  "inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-white text-slate-900 text-base font-medium shadow-[inset_0_1px_0_white] hover:bg-slate-100 hover:-translate-y-0.5 transition-all";

export function AutoDownloadOutputCta() {
  const { platform, ready } = useDownloadPlatform();

  let label = "Download Taplo";
  if (ready && platform === "win") {
    label = "Download for Windows";
  } else if (ready && platform === "mac") {
    label = "Download for Mac";
  }

  return (
    <DownloadLink platform="auto" className={className}>
      <Download className="w-5 h-5" strokeWidth={1.5} />
      {label}
    </DownloadLink>
  );
}
