import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  ...(isProd
    ? {}
    : {
        allowedDevOrigins: [
          "*.trycloudflare.com",
          "*.loca.lt",
          "*.potatowater.com",
          "studybuddyboard.potatowater.com",
          "*.auburnvsa.com",
          "studybuddyboard.auburnvsa.com",
        ],
        experimental: {
          serverActions: {
            bodySizeLimit: "10mb",
            allowedOrigins: [
              "*.trycloudflare.com",
              "*.loca.lt",
              "*.potatowater.com",
              "studybuddyboard.potatowater.com",
              "*.auburnvsa.com",
              "studybuddyboard.auburnvsa.com",
            ],
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
        source: "/friends",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/friends/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/dashboard",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }],
      },
      {
        source: "/api/inbox",
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
