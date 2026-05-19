"use client";

import type { ReactNode } from "react";
import { DownloadLink } from "./download-link";
import { getDownloadCtaLabel } from "../lib/detect-platform";
import { useDownloadPlatform } from "../_hooks/use-download-platform";

type AutoDownloadCtaProps = {
  className?: string;
  onClick?: () => void;
  variant?: "primary" | "short";
  fallbackLabel?: string;
  labelMode?: "platform" | "fixed";
  showIcon?: boolean;
  icon?: ReactNode;
};

export function AutoDownloadCta({
  className,
  onClick,
  variant = "primary",
  fallbackLabel = "Start free trial",
  labelMode = "platform",
  showIcon = false,
  icon,
}: AutoDownloadCtaProps) {
  const { platform, ready } = useDownloadPlatform();
  const label =
    labelMode === "fixed"
      ? fallbackLabel
      : ready
        ? getDownloadCtaLabel(platform, variant)
        : fallbackLabel;

  return (
    <DownloadLink platform="auto" className={className} onClick={onClick}>
      {showIcon ? icon : null}
      {label}
    </DownloadLink>
  );
}
