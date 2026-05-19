"use client";

import type { ReactNode } from "react";
import {
  DOWNLOAD_URL,
  DOWNLOAD_URL_MAC,
  DOWNLOAD_URL_WIN,
} from "../constants";
import { useDownloadPlatform } from "../_hooks/use-download-platform";
import type { DetectedDownloadPlatform } from "../lib/detect-platform";

export type DownloadPlatform = "mac" | "win" | "default" | "auto";

type DownloadLinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  platform?: DownloadPlatform;
};

function resolveDownloadUrl(platform: DetectedDownloadPlatform | "mac" | "win" | "default") {
  if (platform === "mac") {
    return DOWNLOAD_URL_MAC;
  }

  if (platform === "win") {
    return DOWNLOAD_URL_WIN;
  }

  return DOWNLOAD_URL;
}

function resolveAutoPlatform(
  detected: DetectedDownloadPlatform,
  ready: boolean,
): DetectedDownloadPlatform | "mac" | "win" | "default" {
  if (!ready || detected === null) {
    return "mac";
  }

  return detected;
}

export function DownloadLink({
  children,
  className,
  onClick,
  platform = "default",
}: DownloadLinkProps) {
  const { platform: detected, ready } = useDownloadPlatform();

  const resolvedPlatform =
    platform === "auto"
      ? resolveAutoPlatform(detected, ready)
      : platform;

  const href = resolveDownloadUrl(resolvedPlatform);
  const isDirectDownload =
    resolvedPlatform === "mac" || resolvedPlatform === "win";

  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      download={isDirectDownload ? true : undefined}
    >
      {children}
    </a>
  );
}
