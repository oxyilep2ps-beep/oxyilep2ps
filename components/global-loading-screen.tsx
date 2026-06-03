'use client';

import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';
import { useTheme } from '@/components/theme-provider';

export function GlobalLoadingScreen() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-md"
      style={{
        background: isDark
          ? 'radial-gradient(circle at 50% 40%, rgba(255,90,31,0.12), rgba(0,0,0,0.92))'
          : 'radial-gradient(circle at 50% 40%, rgba(255,90,31,0.08), rgba(245,240,230,0.96))',
      }}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <motion.div
          animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo size="lg" priority />
        </motion.div>

        <p className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          Loading your experience…
        </p>

        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-brand-500"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
