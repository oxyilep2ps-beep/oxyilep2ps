import type { NextConfig } from 'next';

/**
 * IMPORTANT: After changing this file, completely stop and restart the Next.js
 * dev server (`Ctrl+C`, then `npm run dev`). Hot reload does NOT apply
 * next.config changes.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ['ethers'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    // Next.js 15 still nests serverActions under experimental in this project.
    serverActions: {
      // Allow large KYC multipart payloads (ID + address + liveness).
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
