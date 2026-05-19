import type { ReactNode } from "react";
import {
  DOWNLOAD_URL,
  DOWNLOAD_URL_MAC,
  DOWNLOAD_URL_WIN,
} from "../constants";

export type DownloadPlatform = "mac" | "win" | "default";

type DownloadLinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  platform?: DownloadPlatform;
};

function resolveDownloadUrl(platform: DownloadPlatform) {
  if (platform === "mac") {
    return DOWNLOAD_URL_MAC;
  }

  if (platform === "win") {
    return DOWNLOAD_URL_WIN;
  }

  return DOWNLOAD_URL;
}

export function DownloadLink({
  children,
  className,
  onClick,
  platform = "default",
}: DownloadLinkProps) {
  const href = resolveDownloadUrl(platform);

  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      download={platform === "mac" || platform === "win" ? true : undefined}
    >
      {children}
    </a>
  );
}
