'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthToastTone = 'success' | 'error';

type AuthToastProps = {
  open: boolean;
  tone: AuthToastTone;
  message: string;
  onClose: () => void;
  autoCloseMs?: number;
};

/**
 * Viewport-fixed auth notification — always visible regardless of scroll position.
 */
export function AuthToast({ open, tone, message, onClose, autoCloseMs = 12000 }: AuthToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [open, tone, onClose, autoCloseMs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-4 pointer-events-none sm:inset-x-auto sm:bottom-4 sm:right-4 sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-4 shadow-2xl sm:w-[26rem]',
          tone === 'success'
            ? 'border-emerald-300 bg-emerald-600 text-white'
            : 'border-red-300 bg-red-600 text-white'
        )}
      >
        {tone === 'success' ? (
          <CheckCircle2 className="mt-0.5 shrink-0" size={22} />
        ) : (
          <XCircle className="mt-0.5 shrink-0" size={22} />
        )}
        <p className="flex-1 text-sm font-semibold leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 transition hover:bg-white/20"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export const SIGNUP_SUCCESS_MESSAGE =
  "Account created successfully! Please check your email to confirm your account. (Note: Please check your Spam or Junk folder if you don't see it within a few minutes). If you don't receive it, please try again later.";
