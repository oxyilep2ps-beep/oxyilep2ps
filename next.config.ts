import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ethers'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;