'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { dispatchAdminPush, dispatchPushNotification, type PushPayload } from '@/lib/push/send';

export type { PushPayload };

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ ok: boolean; error?: string }> {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.p256dh?.trim();
  const auth = input.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: 'Invalid subscription' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendPushNotification(
  payload: PushPayload,
  options?: { userIds?: string[] }
): Promise<{ sent: number; failed: number }> {
  return dispatchPushNotification(payload, options);
}

export async function notifyAdminsPush(payload: PushPayload): Promise<void> {
  try {
    await dispatchAdminPush(payload);
  } catch (error) {
    console.error('[notifyAdminsPush]', error);
  }
}

export async function notifyChatMessagePush(input: {
  receiverId: string;
  preview: string;
}): Promise<void> {
  try {
    await dispatchPushNotification(
      {
        title: 'New Chat Message',
        body: input.preview.trim() || 'You have a new message on Oxyile.',
        url: '/chats',
        tag: 'chat',
      },
      { userIds: [input.receiverId] }
    );
  } catch (error) {
    console.error('[notifyChatMessagePush]', error);
  }
}
