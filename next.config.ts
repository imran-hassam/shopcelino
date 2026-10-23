import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Only the homepage hero photo goes through Vercel's image optimisation
  // (resized + cached at the edge, because the WordPress server is slow).
  images: {
    remotePatterns: [new URL("https://shopcelino.com/wp-content/uploads/**")],
    qualities: [80],
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
