'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAdminNotificationCounts,
  listUnreadAdminNotifications,
} from '@/app/actions/social-studio';
import { createClient } from '@/lib/supabase/client';
import type { AdminNotificationCounts, AdminNotificationRow } from '@/lib/social/types';

const EMPTY: AdminNotificationCounts = {
  blogs: 0,
  social: 0,
  resumes: 0,
  unreadNotifications: 0,
  total: 0,
};

export type AdminToastPayload = {
  id: string;
  title: string;
  message: string;
};

/**
 * Real-time admin badge counts + toast feed for blogs / social / ATS.
 */
export function useAdminNotificationCounts() {
  const [counts, setCounts] = useState<AdminNotificationCounts>(EMPTY);
  const [toast, setToast] = useState<AdminToastPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await getAdminNotificationCounts();
      setCounts(next);
    } catch {
      setCounts(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-notification-engine')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          void refresh();
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Partial<AdminNotificationRow>;
            if (row?.id && row.title) {
              setToast({
                id: String(row.id),
                title: String(row.title),
                message:
                  String(row.message || '').trim() ||
                  `New Submission: ${row.title} requires your verification.`,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'social_posts' },
        () => {
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'blogs' },
        () => {
          void refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_applicants' },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const poll = window.setInterval(() => void refresh(), 45000);

    return () => {
      void supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [refresh]);

  const dismissToast = useCallback(() => setToast(null), []);

  const peekUnread = useCallback(async () => {
    try {
      return await listUnreadAdminNotifications(5);
    } catch {
      return [] as AdminNotificationRow[];
    }
  }, []);

  return { counts, loading, refresh, toast, dismissToast, peekUnread };
}
