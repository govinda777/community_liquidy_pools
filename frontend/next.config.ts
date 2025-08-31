import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/community_liquidy_pools',
  assetPrefix: '/community_liquidy_pools/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
