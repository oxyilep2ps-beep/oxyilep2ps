'use client';

import { motion } from 'framer-motion';
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
          className="relative grid h-24 w-24 place-items-center rounded-3xl shadow-glow"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #f5f0e6 100%)',
            border: isDark ? '1px solid rgba(255,90,31,0.35)' : '1px solid rgba(255,90,31,0.25)',
          }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="text-3xl font-black tracking-tight text-brand-500"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            O
          </motion.span>
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-brand-500/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ borderTopColor: '#FF5A1F' }}
          />
        </motion.div>

        <div>
          <p
            className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-neutral-950'}`}
          >
            Oxyile
          </p>
          <p className={`mt-1 text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Loading your experience…
          </p>
        </div>

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
