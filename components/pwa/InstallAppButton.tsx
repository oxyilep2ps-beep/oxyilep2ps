'use client';

import { Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

type InstallAppButtonProps = {
  className?: string;
  layout?: 'navbar' | 'menu';
};

export function InstallAppButton({ className, layout = 'navbar' }: InstallAppButtonProps) {
  const { canInstall, install } = usePWAInstall();

  if (!canInstall) return null;

  const compact = layout === 'navbar';

  return (
    <button
      type="button"
      onClick={() => void install()}
      aria-label="Install Oxyile app"
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/40 bg-black/70 font-semibold text-orange-400 transition',
        'hover:border-orange-400 hover:bg-orange-500/10 hover:text-[#F97316]',
        'hover:shadow-[0_0_18px_rgba(249,115,22,0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
        compact ? 'hidden h-11 px-3 text-xs sm:inline-flex lg:px-4' : 'h-12 w-full px-5 text-sm',
        className
      )}
    >
      <Download size={compact ? 15 : 16} className="shrink-0 transition group-hover:drop-shadow-[0_0_6px_rgba(249,115,22,0.9)]" />
      {compact ? <span className="hidden lg:inline">Install app</span> : 'Install Oxyile app'}
    </button>
  );
}
