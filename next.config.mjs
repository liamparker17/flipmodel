/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client"],

  // Compress responses
  compress: true,

  // Strict React mode for catching bugs
  reactStrictMode: true,

  // Optimise images
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Reduce bundle size — tree-shake barrel imports
  modularizeImports: {
    "lodash": { transform: "lodash/{{member}}" },
  },

  // Security & performance headers (supplement vercel.json)
  poweredByHeader: false,
};

export default nextConfig;
