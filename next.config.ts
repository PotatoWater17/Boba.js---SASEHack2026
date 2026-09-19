import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // so teammates can hit this from wifi / a temp tunnel
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
};

export default nextConfig;
