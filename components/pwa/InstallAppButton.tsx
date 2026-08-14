'use client';

import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';

type InstallAppButtonProps = {
  className?: string;
  layout?: 'navbar' | 'menu';
};

export function InstallAppButton({ className, layout = 'navbar' }: InstallAppButtonProps) {
  const { installed, ios, canInstallNative, install } = usePWAInstall();
  const [hint, setHint] = useState<'ios' | 'manual' | null>(null);

  if (installed) return null;

  const compact = layout === 'navbar';

  const onClick = async () => {
    const result = await install();
    if (result === 'ios') setHint('ios');
    if (result === 'unavailable') setHint('manual');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        aria-label="Get the Oxyile app"
        className={cn(
          'group inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/50 bg-black font-semibold text-[#F97316] transition',
          'hover:border-orange-400 hover:bg-orange-500/15 hover:shadow-[0_0_18px_rgba(249,115,22,0.45)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60',
          compact ? 'h-11 w-11 shrink-0 lg:w-auto lg:px-3' : 'h-12 w-full px-5 text-sm',
          className
        )}
      >
        <Download size={compact ? 16 : 16} className="shrink-0" />
        {compact ? <span className="hidden lg:inline">Get app</span> : 'Get the Oxyile app'}
      </button>

      {hint ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-orange-500/30 bg-[#0A0A0A] p-5 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-500">Install Oxyile</p>
                <h3 className="mt-1 text-lg font-bold text-white">Add to your home screen</h3>
              </div>
              <button
                type="button"
                onClick={() => setHint(null)}
                className="rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            {hint === 'ios' || ios ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-300">
                <li className="flex gap-2">
                  <Share size={16} className="mt-0.5 shrink-0 text-orange-400" />
                  Tap the Share button in Safari
                </li>
                <li>Scroll and tap <span className="font-semibold text-white">Add to Home Screen</span></li>
                <li>Tap <span className="font-semibold text-white">Add</span> to install Oxyile</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-neutral-300">
                <li>
                  Open the browser menu
                  {canInstallNative ? ' and tap Install' : ' (⋮ or ⋯)'}
                </li>
                <li>
                  Choose <span className="font-semibold text-white">Install app</span> /{' '}
                  <span className="font-semibold text-white">Add to Home screen</span>
                </li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setHint(null)}
              className="mt-5 w-full rounded-full bg-orange-500 py-2.5 text-sm font-bold text-black"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
