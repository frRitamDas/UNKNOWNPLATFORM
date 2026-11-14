import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The hosted preview runs the app in an iframe on a *.e2b.app origin.
  allowedDevOrigins: ["*.e2b.app"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // X-Frame-Options would break the iframe-based preview, so framing is
          // constrained with CSP frame-ancestors instead.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://*.e2b.app" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
