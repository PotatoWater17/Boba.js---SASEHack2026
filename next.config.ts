import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProd
    ? {}
    : {
        allowedDevOrigins: [
          "10.2.216.3",
          "100.74.166.121",
          "*.trycloudflare.com",
          "*.loca.lt",
        ],
        experimental: {
          serverActions: {
            bodySizeLimit: "10mb",
            allowedOrigins: [
              "10.2.216.3:3000",
              "100.74.166.121:3000",
              "*.trycloudflare.com",
              "*.loca.lt",
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
    ];
  },
};

export default nextConfig;
