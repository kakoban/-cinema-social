import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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

export default nextConfig;
