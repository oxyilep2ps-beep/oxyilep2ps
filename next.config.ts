import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ethers'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: {
      // KYC onboarding uploads ID + address + liveness video in one FormData payload.
      bodySizeLimit: '55mb',
    },
  },
};

export default nextConfig;