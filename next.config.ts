import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    // One brand: sellmycondo.asia, sellmyland.asia and sellmybungalow.asia now
    // send visitors to sellmyhouse.asia, which shows every property type
    // together. Any page keeps its path. Permanent, so search rankings move too.
    const brandRedirects = [
      { host: "sellmycondo" },
      { host: "sellmyland" },
      { host: "sellmybungalow" },
    ].flatMap(({ host }) => [
      {
        source: "/",
        has: [{ type: "host" as const, value: `(?:www\\.)?${host}\\.asia` }],
        destination: "https://sellmyhouse.asia/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: `(?:www\\.)?${host}\\.asia` }],
        destination: "https://sellmyhouse.asia/:path*",
        permanent: true,
      },
    ]);
    return [
      ...brandRedirects,
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
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
    "/**/*": ["./prisma/dev.db"],
  },
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
