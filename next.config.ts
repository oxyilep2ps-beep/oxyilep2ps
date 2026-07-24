import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['ethers'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: {
      // KYC onboarding: ID + address + liveness video in one FormData payload.
      // Keep well above Vercel/Next defaults so video uploads don't crash the action.
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;