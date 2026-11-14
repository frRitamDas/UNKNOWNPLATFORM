import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/playfair-display/500.css";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Paste raw clips and get a finished vertical video: word-level captions, auto reframe, silence cuts and one-click MP4 export. Built for creators who ship daily.",
  keywords: ["AI video editor", "auto captions", "vertical video", "shorts editor", "reels", "tiktok captions"],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Paste raw clips and get a finished vertical video with word-level captions, auto reframe and one-click export.",
    url: env.appUrl,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: "AI video editing: raw clip in, finished vertical video out.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
