import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "ia600000.us.archive.org" },
      { protocol: "https", hostname: "ia800000.us.archive.org" },
      { protocol: "https", hostname: "ia902203.us.archive.org" },
      { protocol: "https", hostname: "*.us.archive.org" },
      { protocol: "https", hostname: "z-cdn.chatglm.cn" },
    ],
  },
};

export default withPWA(nextConfig);
