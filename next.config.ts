import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProd
    ? {}
    : {
        allowedDevOrigins: ["*.trycloudflare.com", "*.loca.lt"],
        experimental: {
          serverActions: {
            bodySizeLimit: "10mb",
            allowedOrigins: ["*.trycloudflare.com", "*.loca.lt"],
          },
        },
      }),
  ...(isProd
    ? {
        experimental: {
          serverActions: {
            bodySizeLimit: "10mb",
          },
        },
      }
    : {}),
  outputFileTracingIncludes: {
    "/*": ["./prisma/demo.db", "./prisma/seed-avatars/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/friends/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/meetings/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/api/chat/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
