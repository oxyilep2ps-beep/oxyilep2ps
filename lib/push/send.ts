import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function vapidConfigured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return Boolean(publicKey && privateKey);
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured');
  }
  const mailto = process.env.VAPID_SUBJECT?.trim() || 'mailto:careers.oxyile@gmail.com';
  webpush.setVapidDetails(mailto, publicKey, privateKey);
}

async function sendToRows(rows: PushRow[], payload: PushPayload) {
  if (!rows.length || !vapidConfigured()) return { sent: 0, failed: 0 };
  configureWebPush();
  const admin = createAdminClient();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag ?? 'oxyile',
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from('push_subscriptions').delete().eq('id', row.id);
        }
      }
    })
  );

  return { sent, failed };
}

export async function dispatchPushNotification(
  payload: PushPayload,
  options?: { userIds?: string[] }
): Promise<{ sent: number; failed: number }> {
  if (!vapidConfigured()) return { sent: 0, failed: 0 };
  const admin = createAdminClient();

  let query = admin.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (options?.userIds?.length) {
    query = query.in('user_id', options.userIds);
  }

  const { data, error } = await query;
  if (error || !data?.length) return { sent: 0, failed: 0 };
  return sendToRows(data as PushRow[], payload);
}

export async function dispatchAdminPush(payload: PushPayload): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin.from('profiles').select('id, role');
    const adminIds = (profiles ?? [])
      .filter((row) => row.role === 'ADMIN' || row.role === 'HR')
      .map((row) => row.id as string);
    if (!adminIds.length) return;
    await dispatchPushNotification(payload, { userIds: adminIds });
  } catch (error) {
    console.error('[dispatchAdminPush]', error);
  }
}
