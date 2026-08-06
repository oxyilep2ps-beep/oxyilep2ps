'use client';

import { useEffect } from 'react';
import { markAdminNotificationsRead } from '@/app/actions/social-studio';
import { useAdminNotificationContext } from '@/components/admin/admin-notification-provider';

type Entity = 'blog_post' | 'social_post' | 'resume_submission';

/** Clears unread badge pills for a module when the Admin opens its view. */
export function AdminMarkNotificationsRead({ entityType }: { entityType: Entity }) {
  const { refresh } = useAdminNotificationContext();

  useEffect(() => {
    void (async () => {
      try {
        await markAdminNotificationsRead(entityType);
        await refresh();
      } catch {
        /* non-blocking */
      }
    })();
  }, [entityType, refresh]);

  return null;
}
