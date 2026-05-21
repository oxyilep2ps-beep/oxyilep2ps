'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { GlobalLoadingScreen } from '@/components/global-loading-screen';

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      <AnimatePresence>{loading ? <GlobalLoadingScreen key="global-loader" /> : null}</AnimatePresence>
      {children}
    </>
  );
}
