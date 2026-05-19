export type DetectedDownloadPlatform = "mac" | "win" | null;

export function detectDownloadPlatform(): DetectedDownloadPlatform {
  if (typeof navigator === "undefined") {
    return null;
  }

  const ua = navigator.userAgent;
  const platform = navigator.platform?.toLowerCase() ?? "";

  const uaData = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const uaPlatform = uaData.userAgentData?.platform?.toLowerCase() ?? "";

  if (
    /Win/i.test(ua) ||
    platform.includes("win") ||
    uaPlatform.includes("win")
  ) {
    return "win";
  }

  if (/iPhone|iPad|iPod|Android/i.test(ua)) {
    return null;
  }

  if (
    /Mac/i.test(ua) ||
    platform.includes("mac") ||
    uaPlatform.includes("mac")
  ) {
    return "mac";
  }

  return null;
}

export function getDownloadCtaLabel(
  platform: DetectedDownloadPlatform,
  variant: "primary" | "short" = "primary",
): string {
  if (platform === "win") {
    return variant === "short" ? "Download" : "Download for Windows";
  }

  if (platform === "mac") {
    return variant === "short" ? "Try free" : "Start free trial";
  }

  return "Start free trial";
}

export function getOtherPlatformLinkLabel(
  platform: DetectedDownloadPlatform,
): string | null {
  if (platform === "win") {
    return "Download for Mac";
  }

  if (platform === "mac") {
    return "Download for Windows";
  }

  return null;
}
