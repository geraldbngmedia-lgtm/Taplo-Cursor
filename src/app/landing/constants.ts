export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://taplo.app";

const downloadBase = SITE_URL.replace(/\/$/, "");

/** e.g. https://github.com/ORG/REPO/releases/latest/download */
const githubReleaseBase = process.env.NEXT_PUBLIC_GITHUB_RELEASES_BASE?.replace(
  /\/$/,
  "",
);

function releaseAsset(filename: string, sitePath: string) {
  if (githubReleaseBase) {
    return `${githubReleaseBase}/${filename}`;
  }

  return `${downloadBase}/downloads/${sitePath}`;
}

export const DOWNLOAD_URL_MAC =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL_MAC ??
  releaseAsset("Taplo-mac.dmg", "Taplo-mac.dmg");

export const DOWNLOAD_URL_WIN =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL_WIN ??
  releaseAsset("Taplo-win.exe", "Taplo-win.exe");

/** Default download target (Mac-first). */
export const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DOWNLOAD_URL ?? DOWNLOAD_URL_MAC;

export const LOGO_SRC = "./taplo-logo-full-color.png";
