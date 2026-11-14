import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/800.css";
import "./globals.css";
import { APP_NAME, APP_TAGLINE, env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Drop in raw footage and get a ready-to-post vertical video: word-level captions, ten styled presets, and one-click MP4 export. Built for people who post every day.",
  keywords: ["AI video editor", "auto captions", "vertical video", "shorts editor", "reels", "tiktok captions"],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Raw footage in, ready-to-post out. Word-level captions, ten styled presets and one-click vertical MP4 export.",
    url: env.appUrl,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: "Raw footage in, ready-to-post out — AI captions and styled edits.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0f",
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
