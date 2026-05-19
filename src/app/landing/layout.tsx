import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./landing.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://taplo.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Taplo — Desktop App for Recruiters",
  description:
    "Taplo syncs your interviews, reminds you before each meeting, records the conversation, and turns it into a client-ready write-up.",
  openGraph: {
    title: "Taplo — Desktop App for Recruiters",
    description:
      "Stop rewriting interview notes after every call. Download Taplo for Mac & Windows.",
    url: "/",
    siteName: "Taplo",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className={inter.className}>{children}</div>;
}
