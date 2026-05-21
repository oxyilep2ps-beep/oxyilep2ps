'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/70 text-neutral-800 transition hover:border-brand-200 hover:text-brand-600 dark:border-white/10 dark:bg-black dark:text-neutral-100 dark:hover:border-brand-500/40 dark:hover:text-brand-300 ${className}`}
    >
      {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
    </button>
  );
}
