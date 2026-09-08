import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "admfutsal.com.br",
        port: "",
        pathname: "/assets/images/foto/atleta/**",
      },
      {
        protocol: "https",
        hostname: "admfutsal.com.br",
        port: "",
        pathname: "/assets/images/foto/atleta/**",
      },
    ],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;