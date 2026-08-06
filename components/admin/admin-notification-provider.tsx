'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Bell, X } from 'lucide-react';
import { useAdminNotificationCounts } from '@/lib/hooks/useAdminNotificationCounts';
import type { AdminNotificationCounts } from '@/lib/social/types';

type Ctx = {
  counts: AdminNotificationCounts;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AdminNotificationContext = createContext<Ctx | null>(null);

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const { counts, loading, refresh, toast, dismissToast } = useAdminNotificationCounts();

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(), 7000);
    return () => window.clearTimeout(t);
  }, [toast, dismissToast]);

  const value = useMemo(
    () => ({ counts, loading, refresh }),
    [counts, loading, refresh]
  );

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="pointer-events-none fixed right-4 top-20 z-[90] w-[min(100vw-2rem,22rem)]"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto rounded-2xl border border-orange-500/35 bg-[#0A0A0A]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.55)] shadow-orange-500/5 backdrop-blur-xl [animation:oxyile-slide-in_0.35s_ease-out]">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500">
                <Bell size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-500">
                  Verification required
                </p>
                <p className="mt-1 text-sm font-bold text-white">{toast.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={dismissToast}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800/60 hover:text-white"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotificationContext() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) {
    return {
      counts: {
        blogs: 0,
        social: 0,
        resumes: 0,
        unreadNotifications: 0,
        total: 0,
      } satisfies AdminNotificationCounts,
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}

/** After mark-read, nudge the shared badge counts. */
export function useRefreshAdminBadges() {
  const { refresh } = useAdminNotificationContext();
  return useCallback(() => {
    void refresh();
  }, [refresh]);
}

export function AdminNotificationBell() {
  const { counts } = useAdminNotificationContext();
  const [open, setOpen] = useState(false);

  if (counts.total <= 0) {
    return (
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-neutral-400">
        <Bell size={16} />
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-500"
        aria-label={`${counts.total} pending notifications`}
      >
        <Bell size={16} />
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {counts.total > 99 ? '99+' : counts.total}
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-xl border border-neutral-800 bg-[#0A0A0A] p-3 text-xs text-neutral-300 shadow-xl shadow-black/40">
          <p className="font-bold text-white">Pending verification</p>
          <ul className="mt-2 space-y-1">
            <li>Blogs: {counts.blogs}</li>
            <li>Social: {counts.social}</li>
            <li>Resumes: {counts.resumes}</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
