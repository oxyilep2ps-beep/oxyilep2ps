'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { acceptConnectionRequest, removeConnection } from '@/app/actions/connections';

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link_id: string | null;
  created_at: string;
  actor_name: string | null;
  actor_username: string | null;
  actor_avatar: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

export async function listMyNotifications(limit = 40): Promise<AppNotification[]> {
  try {
    const user = await requireUser();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('notifications')
      .select('id, user_id, actor_id, type, title, message, is_read, link_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 80)));

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];

    const actorMap: Record<string, { name: string; username: string | null; avatar: string | null }> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_legal_name, username, avatar_url')
        .in('id', actorIds);
      for (const p of profiles ?? []) {
        actorMap[String(p.id)] = {
          name: String(p.full_legal_name ?? 'Someone'),
          username: (p.username as string | null) ?? null,
          avatar: (p.avatar_url as string | null) ?? null,
        };
      }
    }

    return rows.map((r) => {
      const actor = r.actor_id ? actorMap[String(r.actor_id)] : null;
      return {
        id: String(r.id),
        user_id: String(r.user_id),
        actor_id: r.actor_id ? String(r.actor_id) : null,
        type: String(r.type),
        title: String(r.title),
        message: String(r.message),
        is_read: Boolean(r.is_read),
        link_id: r.link_id ? String(r.link_id) : null,
        created_at: String(r.created_at),
        actor_name: actor?.name ?? null,
        actor_username: actor?.username ?? null,
        actor_avatar: actor?.avatar ?? null,
      };
    });
  } catch (error) {
    console.error('[listMyNotifications]', error);
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const user = await requireUser();
    const admin = createAdminClient();
    const { count, error } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    const user = await requireUser();
    const admin = createAdminClient();
    const { error } = await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function markAllNotificationsRead() {
  try {
    const user = await requireUser();
    const admin = createAdminClient();
    const { error } = await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function respondToFriendRequestNotification(input: {
  notificationId: string;
  action: 'accept' | 'reject';
  connectionId?: string | null;
  actorId?: string | null;
}) {
  try {
    const user = await requireUser();
    const admin = createAdminClient();

    let connectionId = input.connectionId ?? null;
    if (!connectionId && input.actorId) {
      const { data: conn } = await admin
        .from('user_connections')
        .select('id')
        .eq('requester_id', input.actorId)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      connectionId = conn?.id ? String(conn.id) : null;
    }

    if (!connectionId) {
      await markNotificationRead(input.notificationId);
      return { ok: false as const, error: 'Friend request no longer available.' };
    }

    const result =
      input.action === 'accept'
        ? await acceptConnectionRequest(connectionId)
        : await removeConnection(connectionId);

    await markNotificationRead(input.notificationId);
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed' };
  }
}
