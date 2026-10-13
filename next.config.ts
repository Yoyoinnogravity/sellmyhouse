import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/properties/:id(\\d+)",
        destination: "/property/:id",
        permanent: false,
      },
      {
        source: "/properties/:id(\\d+)/hire",
        destination: "/property/:id/hire",
        permanent: false,
      },
      {
        source: "/properties/:id(\\d+)/consult",
        destination: "/property/:id/consult",
        permanent: false,
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
